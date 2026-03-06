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

                const availableKits = componentAvailability.length > 0 ? Math.min(...componentAvailability) : 0;

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

// POST /api/tent-kits - Create a new tent kit (BundleTemplate)
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !canManageInventory(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { kitName, description, categoryId, subcategoryId, componentItems } = body;

        if (!kitName || !categoryId) {
            return NextResponse.json({ error: "kitName and categoryId are required" }, { status: 400 });
        }
        if (!componentItems || !Array.isArray(componentItems) || componentItems.length === 0) {
            return NextResponse.json({ error: "At least one component item is required" }, { status: 400 });
        }

        // Check if a BundleTemplate with this name already exists
        const existing = await prisma.bundleTemplate.findUnique({ where: { name: kitName } });
        if (existing) {
            return NextResponse.json({ error: `A tent kit named "${kitName}" already exists` }, { status: 409 });
        }

        // Create the virtual base item for this tent kit
        const baseItem = await prisma.item.create({
            data: {
                categoryId,
                subcategoryId: subcategoryId || null,
                name: kitName,
                description: description || `Complete ${kitName} kit`,
                quantityAvailable: 0,
                condition: "GOOD",
                isKitComponent: false,
            },
        });

        // Create the BundleTemplate + components
        const bundleTemplate = await prisma.bundleTemplate.create({
            data: {
                name: kitName,
                description: description || `${kitName} - Complete Kit`,
                baseItemId: baseItem.id,
                items: {
                    createMany: {
                        data: componentItems.map((c: { itemId: string; quantityPerKit: number }) => ({
                            itemId: c.itemId,
                            quantityPerBaseUnit: c.quantityPerKit,
                        })),
                    },
                },
            },
            include: {
                baseItem: true,
                items: {
                    include: { item: true },
                },
            },
        });

        return NextResponse.json({ success: true, kit: bundleTemplate }, { status: 201 });
    } catch (error) {
        console.error("Error creating tent kit:", error);
        return NextResponse.json({ error: "Failed to create tent kit" }, { status: 500 });
    }
}

