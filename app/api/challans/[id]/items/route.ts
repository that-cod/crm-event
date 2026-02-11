import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateChallans } from "@/lib/permissions";
import { z } from "zod";

// Validation schema
const updateItemsSchema = z.object({
    items: z.array(
        z.object({
            itemId: z.string().cuid(),
            quantity: z.number().int().positive(),
            notes: z.string().max(500).optional().nullable(),
        })
    ).min(1, "At least one item is required"),
});

// PUT /api/challans/[id]/items - Update challan items
export async function PUT(
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
        const result = updateItemsSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400 }
            );
        }

        const { items: newItems } = result.data;

        // Get existing challan with items
        const existingChallan = await prisma.challan.findUnique({
            where: { id: params.id },
            include: {
                items: true,
            },
        });

        if (!existingChallan) {
            return NextResponse.json({ error: "Challan not found" }, { status: 404 });
        }

        // Validate all items exist and have sufficient stock
        const itemIds = newItems.map(i => i.itemId);
        const itemsData = await prisma.item.findMany({
            where: { id: { in: itemIds } },
        });

        if (itemsData.length !== itemIds.length) {
            return NextResponse.json(
                { error: "One or more items not found" },
                { status: 404 }
            );
        }

        // Calculate stock adjustments needed
        const stockAdjustments = new Map<string, number>();

        // First, restore stock from removed/reduced items
        for (const oldItem of existingChallan.items) {
            const newItem = newItems.find(i => i.itemId === oldItem.itemId);
            if (!newItem) {
                // Item removed - restore full quantity
                stockAdjustments.set(oldItem.itemId, (stockAdjustments.get(oldItem.itemId) || 0) + oldItem.quantity);
            } else if (newItem.quantity < oldItem.quantity) {
                // Quantity reduced - restore difference
                const diff = oldItem.quantity - newItem.quantity;
                stockAdjustments.set(oldItem.itemId, (stockAdjustments.get(oldItem.itemId) || 0) + diff);
            }
        }

        // Then, deduct stock for new/increased items
        for (const newItem of newItems) {
            const oldItem = existingChallan.items.find(i => i.itemId === newItem.itemId);
            if (!oldItem) {
                // New item - deduct full quantity
                stockAdjustments.set(newItem.itemId, (stockAdjustments.get(newItem.itemId) || 0) - newItem.quantity);
            } else if (newItem.quantity > oldItem.quantity) {
                // Quantity increased - deduct difference
                const diff = newItem.quantity - oldItem.quantity;
                stockAdjustments.set(newItem.itemId, (stockAdjustments.get(newItem.itemId) || 0) - diff);
            }
        }

        // Validate stock availability for items that need deduction
        for (const [itemId, adjustment] of stockAdjustments.entries()) {
            if (adjustment < 0) {
                const item = itemsData.find(i => i.id === itemId);
                if (!item) continue;
                
                const requiredStock = Math.abs(adjustment);
                if (item.quantityAvailable < requiredStock) {
                    return NextResponse.json(
                        {
                            error: `Insufficient stock for "${item.name}". Available: ${item.quantityAvailable}, Required: ${requiredStock}`
                        },
                        { status: 400 }
                    );
                }
            }
        }

        // Update challan items and stock in a transaction
        await prisma.$transaction(async (tx) => {
            // Delete all existing challan items
            await tx.challanItem.deleteMany({
                where: { challanId: params.id },
            });

            // Create new challan items
            await tx.challanItem.createMany({
                data: newItems.map(item => ({
                    challanId: params.id,
                    itemId: item.itemId,
                    quantity: item.quantity,
                    notes: item.notes || null,
                })),
            });

            // Apply stock adjustments
            for (const [itemId, adjustment] of stockAdjustments.entries()) {
                if (adjustment !== 0) {
                    const item = await tx.item.findUnique({
                        where: { id: itemId },
                    });

                    if (!item) continue;

                    const previousQuantity = item.quantityAvailable;
                    const newQuantity = previousQuantity + adjustment;

                    // Update item stock
                    await tx.item.update({
                        where: { id: itemId },
                        data: { quantityAvailable: newQuantity },
                    });

                    // Create stock movement record
                    await tx.stockMovement.create({
                        data: {
                            itemId,
                            projectId: existingChallan.projectId,
                            movementType: adjustment > 0 ? "RETURN" : "OUTWARD",
                            quantity: Math.abs(adjustment),
                            previousQuantity,
                            newQuantity,
                            notes: `Challan ${existingChallan.challanNumber} items updated`,
                            performedByUserId: session.user.id,
                        },
                    });
                }
            }
        });

        return NextResponse.json({
            success: true,
            message: "Challan items updated successfully",
        });
    } catch (error: unknown) {
        console.error("Error updating challan items:", error);
        const errorMessage =
            error instanceof Error ? error.message : "Failed to update challan items";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
