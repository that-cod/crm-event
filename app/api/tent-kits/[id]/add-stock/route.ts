import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageInventory } from "@/lib/permissions";

// POST /api/tent-kits/[id]/add-stock - Add complete tent kits to inventory
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !canManageInventory(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { quantity } = await request.json();

        if (!quantity || quantity <= 0) {
            return NextResponse.json(
                { error: "Quantity must be greater than 0" },
                { status: 400 }
            );
        }

        // Get bundle template with components
        const kit = await prisma.bundleTemplate.findUnique({
            where: { id: params.id },
            include: {
                items: {
                    include: {
                        item: true,
                    }
                }
            }
        });

        if (!kit) {
            return NextResponse.json({ error: "Tent kit not found" }, { status: 404 });
        }

        // Add stock in transaction
        await prisma.$transaction(async (tx) => {
            for (const bundleItem of kit.items) {
                const qtyToAdd = quantity * bundleItem.quantityPerBaseUnit;

                await tx.item.update({
                    where: { id: bundleItem.itemId },
                    data: {
                        quantityAvailable: {
                            increment: qtyToAdd
                        }
                    }
                });
            }
        });

        return NextResponse.json({
            success: true,
            message: `Added ${quantity} ${kit.name}(s) to inventory`,
            quantity
        });

    } catch (error) {
        console.error("Error adding tent kit stock:", error);
        return NextResponse.json(
            { error: "Failed to add tent kit stock" },
            { status: 500 }
        );
    }
}
