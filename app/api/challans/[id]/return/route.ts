import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateChallans } from "@/lib/permissions";
import { z } from "zod";
import { ChallanItemReturnStatus } from "@prisma/client";

/**
 * Challan Return API
 * 
 * Handles returns of challan items with different statuses:
 * - RETURNED: Item returned to stock
 * - REPAIR: Item sent for repair
 * - SCRAP: Item marked as scrap
 * - TRANSFERRED: Item transferred to another site/project
 */

const returnItemSchema = z.object({
    challanItemId: z.string().cuid(),
    returnedQuantity: z.number().int().min(0),
    returnStatus: z.nativeEnum(ChallanItemReturnStatus),
    returnNotes: z.string().optional().nullable(),
});

const processChallanReturnSchema = z.object({
    items: z.array(returnItemSchema).min(1, "At least one item required"),
});

// POST /api/challans/[id]/return
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !canCreateChallans(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await request.json();

        // Validate input
        const result = processChallanReturnSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400 }
            );
        }

        const { items } = result.data;

        // Fetch challan with items
        const challan = await prisma.challan.findUnique({
            where: { id: params.id },
            include: {
                items: {
                    include: {
                        item: true,
                    },
                },
            },
        });

        if (!challan) {
            return NextResponse.json({ error: "Challan not found" }, { status: 404 });
        }

        if (challan.status === "RETURNED") {
            return NextResponse.json(
                { error: "Challan is already fully returned" },
                { status: 400 }
            );
        }

        // Process returns in a transaction
        const updatedChallan = await prisma.$transaction(async (tx) => {
            let allReturned = true;
            let anyReturned = false;

            for (const returnItem of items) {
                const challanItem = challan.items.find(
                    (ci) => ci.id === returnItem.challanItemId
                );

                if (!challanItem) {
                    throw new Error(`Challan item not found: ${returnItem.challanItemId}`);
                }

                if (returnItem.returnedQuantity > challanItem.quantity) {
                    throw new Error(
                        `Return quantity exceeds original quantity for ${challanItem.item.name}`
                    );
                }

                // Update challan item
                await tx.challanItem.update({
                    where: { id: returnItem.challanItemId },
                    data: {
                        returnedQuantity: returnItem.returnedQuantity,
                        returnStatus: returnItem.returnStatus,
                        returnNotes: returnItem.returnNotes,
                    },
                });

                // Handle different return statuses
                if (returnItem.returnedQuantity > 0) {
                    anyReturned = true;

                    switch (returnItem.returnStatus) {
                        case "RETURNED":
                            // Add back to stock
                            await tx.item.update({
                                where: { id: challanItem.itemId },
                                data: {
                                    quantityAvailable: { increment: returnItem.returnedQuantity },
                                },
                            });

                            // Create stock movement
                            await tx.stockMovement.create({
                                data: {
                                    itemId: challanItem.itemId,
                                    projectId: challan.projectId,
                                    movementType: "RETURN",
                                    quantity: returnItem.returnedQuantity,
                                    previousQuantity: challanItem.item.quantityAvailable,
                                    newQuantity: challanItem.item.quantityAvailable + returnItem.returnedQuantity,
                                    notes: `Returned from challan ${challan.challanNumber}`,
                                    performedByUserId: session.user.id,
                                },
                            });
                            break;

                        case "REPAIR":
                            // Create repair queue entry
                            await tx.repairQueue.create({
                                data: {
                                    itemId: challanItem.itemId,
                                    status: "PENDING",
                                    notes: returnItem.returnNotes || `From challan ${challan.challanNumber}`,
                                },
                            });

                            // Update item condition
                            await tx.item.update({
                                where: { id: challanItem.itemId },
                                data: { condition: "REPAIR_NEEDED" },
                            });
                            break;

                        case "SCRAP":
                            // Create scrap record
                            await tx.scrapRecord.create({
                                data: {
                                    itemId: challanItem.itemId,
                                    reason: returnItem.returnNotes || "Marked as scrap on return",
                                    disposalMethod: "DESTRUCTION",
                                    disposalDate: new Date(),
                                },
                            });

                            // Update item condition
                            await tx.item.update({
                                where: { id: challanItem.itemId },
                                data: { condition: "SCRAP" },
                            });
                            break;

                        case "TRANSFERRED":
                            // Just mark as transferred - item stays at new location
                            // Could create a new challan for transfer tracking
                            break;
                    }
                }

                // Check if all items are fully returned
                if (returnItem.returnedQuantity < challanItem.quantity) {
                    allReturned = false;
                }
            }

            // Determine new challan status
            let newStatus: "SENT" | "RETURNED" | "PARTIALLY_RETURNED" = "SENT";
            if (allReturned && anyReturned) {
                newStatus = "RETURNED";
            } else if (anyReturned) {
                newStatus = "PARTIALLY_RETURNED";
            }

            // Update challan status
            return await tx.challan.update({
                where: { id: params.id },
                data: { status: newStatus },
                include: {
                    items: {
                        include: {
                            item: true,
                        },
                    },
                },
            });
        });

        return NextResponse.json({
            success: true,
            challan: updatedChallan,
            message: `Challan status updated to ${updatedChallan.status}`,
        });
    } catch (error) {
        console.error("Error processing return:", error);
        const message = error instanceof Error ? error.message : "Failed to process return";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
