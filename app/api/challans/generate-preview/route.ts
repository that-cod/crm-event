import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateChallans } from "@/lib/permissions";
import { z } from "zod";

/**
 * Challan Generation Preview API
 * 
 * Takes a site/project ID and truck capacity, returns suggested
 * challan splits based on:
 * 1. Category loading sequence (Tents=1, Furniture=2, Sanitary=3, etc.)
 * 2. Item weight (fills up truck until capacity)
 * 3. Groups items by category to optimize loading
 */

// Request validation schema
const generatePreviewSchema = z.object({
    siteId: z.string().cuid().optional().nullable(),
    projectId: z.string().cuid().optional().nullable(),
    truckCapacityKg: z.number().positive("Truck capacity must be positive"),
}).refine((data) => data.siteId || data.projectId, {
    message: "Either siteId or projectId is required",
});

type ItemWithCategory = {
    itemId: string;
    itemName: string;
    categoryId: string;
    categoryName: string;
    loadingOrder: number;
    quantity: number;
    weightPerUnit: number | null;
    totalWeight: number;
    hsnCode: string | null;
};

type TruckAssignment = {
    truckNumber: number;
    items: ItemWithCategory[];
    totalWeight: number;
    remainingCapacity: number;
};

// POST /api/challans/generate-preview
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !canCreateChallans(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await request.json();

        // Validate input
        const result = generatePreviewSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400 }
            );
        }

        const { siteId, projectId, truckCapacityKg } = result.data;

        // Fetch items based on source (site inventory or project)
        let items: ItemWithCategory[] = [];

        if (siteId) {
            // Get items from site inventory
            const siteInventory = await prisma.siteInventory.findMany({
                where: {
                    siteId,
                    actualReturnDate: null, // Only items still deployed
                },
                include: {
                    item: {
                        include: {
                            category: true,
                        },
                    },
                },
            });

            items = siteInventory.map((inv) => ({
                itemId: inv.itemId,
                itemName: inv.item.name,
                categoryId: inv.item.categoryId,
                categoryName: inv.item.category.name,
                loadingOrder: inv.item.category.loadingOrder,
                quantity: inv.quantityDeployed,
                weightPerUnit: inv.item.weightPerUnit,
                totalWeight: (inv.item.weightPerUnit || 0) * inv.quantityDeployed,
                hsnCode: inv.item.hsnCode,
            }));
        } else if (projectId) {
            // Get project's stock movements (outward items)
            const movements = await prisma.stockMovement.findMany({
                where: {
                    projectId,
                    movementType: "OUTWARD",
                },
                include: {
                    item: {
                        include: {
                            category: true,
                        },
                    },
                },
            });

            // Aggregate by item
            const itemMap = new Map<string, ItemWithCategory>();

            for (const movement of movements) {
                const existing = itemMap.get(movement.itemId);
                if (existing) {
                    existing.quantity += movement.quantity;
                    existing.totalWeight = (existing.weightPerUnit || 0) * existing.quantity;
                } else {
                    itemMap.set(movement.itemId, {
                        itemId: movement.itemId,
                        itemName: movement.item.name,
                        categoryId: movement.item.categoryId,
                        categoryName: movement.item.category.name,
                        loadingOrder: movement.item.category.loadingOrder,
                        quantity: movement.quantity,
                        weightPerUnit: movement.item.weightPerUnit,
                        totalWeight: (movement.item.weightPerUnit || 0) * movement.quantity,
                        hsnCode: movement.item.hsnCode,
                    });
                }
            }

            items = Array.from(itemMap.values());
        }

        if (items.length === 0) {
            return NextResponse.json(
                { error: "No items found for challan generation" },
                { status: 400 }
            );
        }

        // Sort items by loading order (category sequence)
        items.sort((a, b) => a.loadingOrder - b.loadingOrder);

        // Assign items to trucks based on weight capacity
        const trucks: TruckAssignment[] = [];
        let currentTruck: TruckAssignment = {
            truckNumber: 1,
            items: [],
            totalWeight: 0,
            remainingCapacity: truckCapacityKg,
        };

        for (const item of items) {
            // If item has no weight, use a default estimate (1kg per unit)
            const itemWeight = item.totalWeight || item.quantity;

            // Check if item fits in current truck
            if (currentTruck.remainingCapacity >= itemWeight) {
                // Add entire item to current truck
                currentTruck.items.push(item);
                currentTruck.totalWeight += itemWeight;
                currentTruck.remainingCapacity -= itemWeight;
            } else if (currentTruck.remainingCapacity > 0 && itemWeight > truckCapacityKg) {
                // Item is too heavy for any single truck, split across trucks
                let remainingQuantity = item.quantity;
                const weightPerUnit = item.weightPerUnit || 1;

                while (remainingQuantity > 0) {
                    // Calculate how many units fit in current truck
                    const unitsForThisTruck = Math.floor(currentTruck.remainingCapacity / weightPerUnit);

                    if (unitsForThisTruck > 0) {
                        const quantityForThisTruck = Math.min(unitsForThisTruck, remainingQuantity);
                        currentTruck.items.push({
                            ...item,
                            quantity: quantityForThisTruck,
                            totalWeight: weightPerUnit * quantityForThisTruck,
                        });
                        currentTruck.totalWeight += weightPerUnit * quantityForThisTruck;
                        currentTruck.remainingCapacity -= weightPerUnit * quantityForThisTruck;
                        remainingQuantity -= quantityForThisTruck;
                    }

                    if (remainingQuantity > 0) {
                        // Start a new truck
                        trucks.push(currentTruck);
                        currentTruck = {
                            truckNumber: trucks.length + 1,
                            items: [],
                            totalWeight: 0,
                            remainingCapacity: truckCapacityKg,
                        };
                    }
                }
            } else {
                // Item doesn't fit, start a new truck
                if (currentTruck.items.length > 0) {
                    trucks.push(currentTruck);
                }
                currentTruck = {
                    truckNumber: trucks.length + 1,
                    items: [item],
                    totalWeight: itemWeight,
                    remainingCapacity: truckCapacityKg - itemWeight,
                };
            }
        }

        // Don't forget the last truck
        if (currentTruck.items.length > 0) {
            trucks.push(currentTruck);
        }

        // Prepare response with summary statistics
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        const totalWeight = items.reduce((sum, item) => sum + item.totalWeight, 0);

        return NextResponse.json({
            preview: {
                trucks,
                summary: {
                    totalTrucks: trucks.length,
                    totalItems,
                    totalWeight,
                    truckCapacityKg,
                    categorySequence: [...new Set(items.map((i) => i.categoryName))],
                },
            },
        });
    } catch (error) {
        console.error("Error generating challan preview:", error);
        return NextResponse.json(
            { error: "Failed to generate challan preview" },
            { status: 500 }
        );
    }
}
