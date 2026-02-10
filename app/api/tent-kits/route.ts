import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageInventory } from "@/lib/permissions";

// GET /api/tent-kits - List all tent kit types with availability
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get all bundle templates (tent kits) - OPTIMIZED: select only needed fields
        const kits = await prisma.bundleTemplate.findMany({
            select: {
                id: true,
                name: true,
                description: true,
                baseItem: {
                    select: {
                        kitType: true,
                        category: { select: { name: true } },
                        subcategory: { select: { name: true } },
                    }
                },
                items: {
                    select: {
                        quantityPerBaseUnit: true,
                        item: {
                            select: {
                                id: true,
                                name: true,
                                componentType: true,
                                quantityAvailable: true,
                            }
                        }
                    }
                }
            }
        });

        // Calculate available quantity for each kit
        const kitsWithAvailability = await Promise.all(
            kits.map(async (kit) => {
                // Get minimum available based on components
                const componentAvailability = kit.items.map((bundleItem) => {
                    const availableQty = bundleItem.item.quantityAvailable;
                    const qtyPerKit = bundleItem.quantityPerBaseUnit;
                    return Math.floor(availableQty / qtyPerKit);
                });

                const availableKits = Math.min(...componentAvailability, 0);

                // Check if balanced
                const baseQty = componentAvailability[0] || 0;
                const isBalanced = componentAvailability.every(q => q === baseQty);

                return {
                    id: kit.id,
                    name: kit.name,
                    description: kit.description,
                    code: kit.baseItem.kitType,
                    category: kit.baseItem.category?.name,
                    subcategory: kit.baseItem.subcategory?.name,
                    availableKits,
                    isBalanced,
                    components: kit.items.map((bundleItem) => ({
                        id: bundleItem.item.id,
                        name: bundleItem.item.name,
                        componentType: bundleItem.item.componentType,
                        quantityPerKit: bundleItem.quantityPerBaseUnit,
                        availableQuantity: bundleItem.item.quantityAvailable,
                        availableKits: Math.floor(bundleItem.item.quantityAvailable / bundleItem.quantityPerBaseUnit),
                    }))
                };
            })
        );

        return NextResponse.json({ kits: kitsWithAvailability });
    } catch (error) {
        console.error("Error fetching tent kits:", error);
        return NextResponse.json(
            { error: "Failed to fetch tent kits" },
            { status: 500 }
        );
    }
}
