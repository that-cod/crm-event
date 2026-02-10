import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/repairs/:id/complete - Complete repair and restore item
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { repairCost, notes: completionNotes, itemCondition } = body;

    if (!itemCondition) {
      return NextResponse.json(
        { error: "Item condition after repair is required" },
        { status: 400 }
      );
    }

    const repair = await prisma.repairQueue.findUnique({
      where: { id: params.id },
      include: { item: true },
    });

    if (!repair) {
      return NextResponse.json({ error: "Repair not found" }, { status: 404 });
    }

    if (repair.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Repair is already completed" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update repair record
      const updatedRepair = await tx.repairQueue.update({
        where: { id: params.id },
        data: {
          status: "COMPLETED",
          completedDate: new Date(),
          repairCost: repairCost ? parseFloat(repairCost) : repair.repairCost,
          notes: completionNotes ? `${repair.notes ? repair.notes + ". " : ""}Completed: ${completionNotes}` : repair.notes,
        },
        include: {
          item: {
            include: {
              category: true,
            },
          },
        },
      });

      // Update item condition and restore to inventory
      await tx.item.update({
        where: { id: repair.itemId },
        data: {
          condition: itemCondition,
          quantityAvailable: { increment: 1 },
        },
      });

      // Create stock movement for return from repair
      const item = await tx.item.findUnique({ where: { id: repair.itemId } });
      const previousQty = item!.quantityAvailable - 1; // Before increment
      const newQty = item!.quantityAvailable; // After increment

      await tx.stockMovement.create({
        data: {
          itemId: repair.itemId,
          movementType: "RETURN",
          quantity: 1,
          previousQuantity: previousQty,
          newQuantity: newQty,
          conditionAfter: itemCondition as string,
          notes: `Repair completed. Condition: ${itemCondition}. ${completionNotes || ""
            }`,
          performedByUserId: session.user?.id || "",
        },
      });

      return updatedRepair;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error completing repair:", error);
    return NextResponse.json(
      { error: "Failed to complete repair" },
      { status: 500 }
    );
  }
}
