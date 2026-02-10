import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateChallans } from "@/lib/permissions";
import { z } from "zod";

/**
 * Bulk Challan Creation API
 * 
 * Creates multiple challans at once from a preview, handling:
 * 1. Sequential challan number generation (CH-XXXXX)
 * 2. Stock movement creation for each item
 * 3. Stock quantity deduction for each item
 */

// Truck item schema
const truckItemSchema = z.object({
    itemId: z.string().cuid(),
    quantity: z.number().int().positive(),
});

// Simplified truck schema
const truckChallanSchema = z.object({
    capacity: z.number().positive(),
    items: z.array(truckItemSchema).min(1, "At least one item required"),
});

// Request schema
const bulkCreateSchema = z.object({
    projectId: z.string().cuid("Invalid project ID"),
    siteId: z.string().cuid().optional().nullable(), // Source site for transfer
    challanType: z.enum(["DELIVERY", "TRANSFER"]).default("DELIVERY"),
    trucks: z.array(truckChallanSchema).min(1, "At least one truck required"),
});

// Generate sequential challan number (CH-XXXXX)
async function generateChallanNumber(tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>): Promise<string> {
    const lastChallan = await tx.challan.findFirst({
        orderBy: { challanNumber: "desc" },
        select: { challanNumber: true },
    });

    let nextNumber = 1;
    if (lastChallan?.challanNumber) {
        // Extract number from CH-XXXXX format
        const match = lastChallan.challanNumber.match(/CH-(\d+)/);
        if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
        }
    }

    // Format with leading zeros (5 digits)
    return `CH-${nextNumber.toString().padStart(5, "0")}`;
}

// POST /api/challans/bulk-create
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !canCreateChallans(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await request.json();

        // Validate input
        const result = bulkCreateSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400 }
            );
        }

        const { projectId, siteId, challanType, trucks } = result.data;

        // Verify project exists
        const project = await prisma.project.findUnique({
            where: { id: projectId },
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Collect all item IDs to validate stock
        const allItemIds = new Set<string>();
        const itemQuantities = new Map<string, number>();

        for (const truck of trucks) {
            for (const item of truck.items) {
                allItemIds.add(item.itemId);
                const current = itemQuantities.get(item.itemId) || 0;
                itemQuantities.set(item.itemId, current + item.quantity);
            }
        }

        // Fetch all items and verify stock
        const items = await prisma.item.findMany({
            where: { id: { in: Array.from(allItemIds) } },
        });

        if (items.length !== allItemIds.size) {
            return NextResponse.json(
                { error: "One or more items not found" },
                { status: 404 }
            );
        }

        // Check stock availability
        for (const item of items) {
            const requiredQty = itemQuantities.get(item.id) || 0;
            if (item.quantityAvailable < requiredQty) {
                return NextResponse.json(
                    {
                        error: `Insufficient stock for "${item.name}". Available: ${item.quantityAvailable}, Required: ${requiredQty}`
                    },
                    { status: 400 }
                );
            }
        }

        // Create challans in a transaction
        const createdChallans = await prisma.$transaction(async (tx) => {
            const challans = [];

            for (const truck of trucks) {
                // Generate unique challan number
                const challanNumber = await generateChallanNumber(tx);

                // Create challan with DRAFT status (details added later)
                const challan = await tx.challan.create({
                    data: {
                        challanNumber,
                        projectId,
                        status: "DRAFT",
                        challanType,
                        sourceSiteId: challanType === "TRANSFER" ? siteId : null,
                        createdByUserId: session.user.id,
                        items: {
                            create: truck.items.map((item) => ({
                                itemId: item.itemId,
                                quantity: item.quantity,
                            })),
                        },
                    },
                    include: {
                        items: {
                            include: {
                                item: true,
                            },
                        },
                    },
                });

                // Create stock movements and update quantities
                for (const challanItem of challan.items) {
                    const item = items.find((i) => i.id === challanItem.itemId)!;

                    // Create stock movement
                    await tx.stockMovement.create({
                        data: {
                            itemId: challanItem.itemId,
                            projectId,
                            movementType: "OUTWARD",
                            quantity: challanItem.quantity,
                            previousQuantity: item.quantityAvailable,
                            newQuantity: item.quantityAvailable - challanItem.quantity,
                            notes: `Challan ${challanNumber}`,
                            performedByUserId: session.user.id,
                        },
                    });

                    // Deduct from item quantity
                    await tx.item.update({
                        where: { id: challanItem.itemId },
                        data: {
                            quantityAvailable: { decrement: challanItem.quantity },
                        },
                    });

                    // Update cached quantity for subsequent challans
                    item.quantityAvailable -= challanItem.quantity;
                }

                challans.push(challan);
            }

            return challans;
        });

        return NextResponse.json({
            success: true,
            challans: createdChallans.map((c) => ({
                id: c.id,
                challanNumber: c.challanNumber,
                itemsCount: c.items.length,
            })),
            message: `Successfully created ${createdChallans.length} challan(s)`,
        });
    } catch (error: unknown) {
        console.error("Error creating challans:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to create challans";
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
