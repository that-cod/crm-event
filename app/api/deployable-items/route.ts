import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/deployable-items
 * 
 * Fetches all items that can be deployed to sites, including:
 * - Regular inventory items (non-kit components) with quantity > 0
 * - Tent kits with calculated availability based on component stock
 * 
 * @returns Combined list of deployable items and tent kits sorted by name
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch regular items (non-kit components) with quantity > 0
        const regularItems = await prisma.item.findMany({
            where: {
                isKitComponent: false,
                quantityAvailable: { gt: 0 },
            },
            include: {
                category: true,
                subcategory: true,
            },
            orderBy: { name: "asc" },
        });

        // Fetch tent kits with their availability
        const tentKits = await prisma.bundleTemplate.findMany({
            include: {
                baseItem: {
                    include: {
                        category: true,
                        subcategory: true,
                    }
                },
                items: {
                    include: {
                        item: true,
                    }
                }
            }
        });

        // Calculate availability for tent kits
        const tentKitsWithAvailability = tentKits.map((kit) => {
            const componentAvailability = kit.items.map((bundleItem) => {
                const availableQty = bundleItem.item.quantityAvailable;
                const qtyPerKit = bundleItem.quantityPerBaseUnit;
                return Math.floor(availableQty / qtyPerKit);
            });

            // Calculate how many complete kits can be made
            // Handle edge case: if no components, availability is 0
            const availableKits = componentAvailability.length > 0
                ? Math.min(...componentAvailability)
                : 0;

            return {
                id: kit.baseItem.id,
                name: kit.name,
                quantityAvailable: availableKits,
                category: kit.baseItem.category,
                subcategory: kit.baseItem.subcategory,
                isTentKit: true,
                bundleId: kit.id,
            };
        });

        // Filter out tent kits with 0 availability
        const availableTentKits = tentKitsWithAvailability.filter(
            (kit) => kit.quantityAvailable > 0
        );

        // Combine both lists
        const allDeployableItems = [
            ...regularItems.map((item) => ({
                id: item.id,
                name: item.name,
                quantityAvailable: item.quantityAvailable,
                category: item.category,
                subcategory: item.subcategory,
                isTentKit: false,
            })),
            ...availableTentKits,
        ].sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json({ data: allDeployableItems });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Error fetching deployable items:", errorMessage);
        return NextResponse.json(
            { error: "Failed to fetch deployable items" },
            { status: 500 }
        );
    }
}
