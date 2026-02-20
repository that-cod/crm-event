import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageInventory } from "@/lib/permissions";

// GET /api/tent-kits/[id] - Get a single tent kit by ID
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const kit = await prisma.bundleTemplate.findUnique({
            where: { id: params.id },
            include: {
                baseItem: {
                    include: {
                        category: true,
                        subcategory: true,
                    },
                },
                items: {
                    include: {
                        item: true,
                    },
                },
            },
        });

        if (!kit) {
            return NextResponse.json({ error: "Tent kit not found" }, { status: 404 });
        }

        // Calculate availability
        const componentAvailability = kit.items.map((bundleItem) => {
            const availableQty = bundleItem.item.quantityAvailable;
            const qtyPerKit = bundleItem.quantityPerBaseUnit;
            return Math.floor(availableQty / qtyPerKit);
        });

        const availableKits = componentAvailability.length > 0
            ? Math.min(...componentAvailability)
            : 0;

        const baseQty = componentAvailability[0] || 0;
        const isBalanced = componentAvailability.every((q) => q === baseQty);

        return NextResponse.json({
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
                availableKits: Math.floor(
                    bundleItem.item.quantityAvailable / bundleItem.quantityPerBaseUnit
                ),
            })),
        });
    } catch (error) {
        console.error("Error fetching tent kit:", error);
        return NextResponse.json(
            { error: "Failed to fetch tent kit" },
            { status: 500 }
        );
    }
}

// PUT /api/tent-kits/[id] - Update tent kit name/description
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !canManageInventory(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await request.json();
        const { name, description } = body;

        const kit = await prisma.bundleTemplate.findUnique({
            where: { id: params.id },
        });

        if (!kit) {
            return NextResponse.json({ error: "Tent kit not found" }, { status: 404 });
        }

        const updatedKit = await prisma.bundleTemplate.update({
            where: { id: params.id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
            },
            include: {
                baseItem: true,
                items: {
                    include: { item: true },
                },
            },
        });

        return NextResponse.json({ success: true, kit: updatedKit });
    } catch (error) {
        console.error("Error updating tent kit:", error);
        return NextResponse.json(
            { error: "Failed to update tent kit" },
            { status: 500 }
        );
    }
}

// DELETE /api/tent-kits/[id] - Delete a tent kit
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !canManageInventory(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const kit = await prisma.bundleTemplate.findUnique({
            where: { id: params.id },
        });

        if (!kit) {
            return NextResponse.json({ error: "Tent kit not found" }, { status: 404 });
        }

        await prisma.bundleTemplate.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ success: true, message: "Tent kit deleted successfully" });
    } catch (error) {
        console.error("Error deleting tent kit:", error);
        return NextResponse.json(
            { error: "Failed to delete tent kit" },
            { status: 500 }
        );
    }
}
