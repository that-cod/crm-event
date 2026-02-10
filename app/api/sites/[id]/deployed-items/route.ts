import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/sites/[id]/deployed-items
// Returns items currently deployed at the site (not yet returned)
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const siteInventory = await prisma.siteInventory.findMany({
            where: {
                siteId: params.id,
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

        const items = siteInventory.map((inv) => ({
            itemId: inv.itemId,
            itemName: inv.item.name,
            categoryId: inv.item.categoryId,
            categoryName: inv.item.category.name,
            quantity: inv.quantityDeployed,
            weightPerUnit: inv.item.weightPerUnit,
            totalWeight: (inv.item.weightPerUnit || 0) * inv.quantityDeployed,
            hsnCode: inv.item.hsnCode,
        }));

        return NextResponse.json({ items });
    } catch (error) {
        console.error("Error fetching deployed items:", error);
        return NextResponse.json(
            { error: "Failed to fetch deployed items" },
            { status: 500 }
        );
    }
}
