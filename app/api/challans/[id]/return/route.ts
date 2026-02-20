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
 * 
 * Supports multiple status entries per item for quantity splitting
 */

const statusEntrySchema = z.object({
    returnedQuantity: z.number().int().min(1),
    returnStatus: z.nativeEnum(ChallanItemReturnStatus),
    returnNotes: z.string().optional().nullable(),
});

const returnItemSchema = z.object({
    challanItemId: z.string().cuid(),
    statusEntries: z.array(statusEntrySchema).min(1),
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

        // Validate quantities before processing
        for (const returnItem of items) {
            const challanItem = challan.items.find(
                (ci) => ci.id === returnItem.challanItemId
            );

            if (!challanItem) {
                throw new Error(`Challan item not found: ${returnItem.challanItemId}`);
            }

            const totalReturned = returnItem.statusEntries.reduce(
                (sum, entry) => sum + entry.returnedQuantity,
                0
            );

            const remainingQuantity = challanItem.quantity - challanItem.returnedQuantity;

            if (totalReturned !== remainingQuantity) {
                throw new Error(
                    `Total quantity for ${challanItem.item.name} (${totalReturned}) doesn't match remaining quantity (${remainingQuantity})`
                );
            }
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

                let totalReturnedForItem = 0;

                // Process each status entry
                for (const entry of returnItem.statusEntries) {
                    totalReturnedForItem += entry.returnedQuantity;

                    switch (entry.returnStatus) {
                        case "RETURNED":
                            // Add back to stock
                            await tx.item.update({
                                where: { id: challanItem.itemId },
                                data: {
                                    quantityAvailable: { increment: entry.returnedQuantity },
                                },
                            });

                            // Create stock movement
                            await tx.stockMovement.create({
                                data: {
                                    itemId: challanItem.itemId,
                                    projectId: challan.projectId,
                                    movementType: "RETURN",
                                    quantity: entry.returnedQuantity,
                                    previousQuantity: challanItem.item.quantityAvailable,
                                    newQuantity: challanItem.item.quantityAvailable + entry.returnedQuantity,
                                    notes: entry.returnNotes || `Returned from challan ${challan.challanNumber}`,
                                    performedByUserId: session.user.id,
                                },
                            });
                            break;

                        case "REPAIR":
                            // Create multiple repair queue entries (one per item)
                            for (let i = 0; i < entry.returnedQuantity; i++) {
                                await tx.repairQueue.create({
                                    data: {
                                        itemId: challanItem.itemId,
                                        status: "PENDING",
                                        notes: entry.returnNotes || `From challan ${challan.challanNumber}`,
                                    },
                                });
                            }

                            // Update item condition
                            await tx.item.update({
                                where: { id: challanItem.itemId },
                                data: { condition: "REPAIR_NEEDED" },
                            });
                            break;

                        case "SCRAP":
                            // Create multiple scrap records (one per item)
                            for (let i = 0; i < entry.returnedQuantity; i++) {
                                await tx.scrapRecord.create({
                                    data: {
                                        itemId: challanItem.itemId,
                                        reason: entry.returnNotes || "Marked as scrap on return",
                                        disposalMethod: "DESTRUCTION",
                                        disposalDate: new Date(),
                                    },
                                });
                            }

                            // Update item condition
                            await tx.item.update({
                                where: { id: challanItem.itemId },
                                data: { condition: "SCRAP" },
                            });
                            break;

                        case "TRANSFERRED":
                            // Just mark as transferred - item stays at new location
                            // Could create a new challan for transfer tracking in the future
                            break;
                    }
                }

                anyReturned = totalReturnedForItem > 0;

                // Update challan item
                const newReturnedQuantity = challanItem.returnedQuantity + totalReturnedForItem;

                // Determine return status for this item
                let itemReturnStatus: ChallanItemReturnStatus;
                if (returnItem.statusEntries.length === 1) {
                    itemReturnStatus = returnItem.statusEntries[0].returnStatus;
                } else {
                    // Multiple statuses - store as "RETURNED" but note in returnNotes
                    itemReturnStatus = "RETURNED";
                }

                // Combine notes from all status entries
                const combinedNotes = returnItem.statusEntries
                    .map((e) => `${e.returnStatus}: ${e.returnedQuantity}${e.returnNotes ? ` (${e.returnNotes})` : ""}`)
                    .join("; ");

                await tx.challanItem.update({
                    where: { id: returnItem.challanItemId },
                    data: {
                        returnedQuantity: newReturnedQuantity,
                        returnStatus: itemReturnStatus,
                        returnNotes: combinedNotes,
                    },
                });

                // Check if all items are fully returned
                if (newReturnedQuantity < challanItem.quantity) {
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
