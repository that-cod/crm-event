import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateChallans } from "@/lib/permissions";

// POST /api/challans/[id]/cancel - Cancel a challan and return items to inventory
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !canCreateChallans(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Get the challan with items
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

        // Check if challan is already cancelled
        if (challan.status === "CANCELLED") {
            return NextResponse.json(
                { error: "Challan is already cancelled" },
                { status: 400 }
            );
        }

        // Check if challan has been returned (fully or partially)
        if (challan.status === "RETURNED" || challan.status === "PARTIALLY_RETURNED") {
            return NextResponse.json(
                { error: "Cannot cancel a challan that has items returned. Please process returns separately." },
                { status: 400 }
            );
        }

        // Cancel challan and return items to inventory in a transaction
        await prisma.$transaction(async (tx) => {
            // Update challan status to CANCELLED
            await tx.challan.update({
                where: { id: params.id },
                data: {
                    status: "CANCELLED",
                },
            });

            // Return all items to inventory
            for (const challanItem of challan.items) {
                const item = challanItem.item;
                const previousQuantity = item.quantityAvailable;
                const newQuantity = previousQuantity + challanItem.quantity;

                // Update item quantity
                await tx.item.update({
                    where: { id: item.id },
                    data: { quantityAvailable: newQuantity },
                });

                // Create stock movement record
                await tx.stockMovement.create({
                    data: {
                        itemId: item.id,
                        projectId: challan.projectId,
                        movementType: "RETURN",
                        quantity: challanItem.quantity,
                        previousQuantity,
                        newQuantity,
                        notes: `Challan ${challan.challanNumber} cancelled - items returned to inventory`,
                        performedByUserId: session.user.id,
                    },
                });
            }
        });

        return NextResponse.json({
            success: true,
            message: `Challan ${challan.challanNumber} cancelled successfully. All items returned to inventory.`,
        });
    } catch (error: unknown) {
        console.error("Error cancelling challan:", error);
        const errorMessage =
            error instanceof Error ? error.message : "Failed to cancel challan";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
