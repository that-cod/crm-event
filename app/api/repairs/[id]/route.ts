import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// GET /api/repairs/:id - Get single repair details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const repair = await prisma.repairQueue.findUnique({
      where: { id: params.id },
      include: {
        item: {
          include: {
            category: true,
            subcategory: true,
          },
        },
      },
    });

    if (!repair) {
      return NextResponse.json({ error: "Repair not found" }, { status: 404 });
    }

    return NextResponse.json(repair);
  } catch (error) {
    console.error("Error fetching repair:", error);
    return NextResponse.json(
      { error: "Failed to fetch repair" },
      { status: 500 }
    );
  }
}

// PUT /api/repairs/:id - Update repair status/details
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      status,
      assignedToUserId,
      technicianName,
      vendorName,
      startDate,
      completedDate,
      repairCost,
      estimatedDays,
      notes,
    } = body;

    const existingRepair = await prisma.repairQueue.findUnique({
      where: { id: params.id },
      include: { item: true },
    });

    if (!existingRepair) {
      return NextResponse.json({ error: "Repair not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (status) updateData.status = status;
    if (assignedToUserId !== undefined) updateData.assignedToUserId = assignedToUserId;
    if (technicianName !== undefined) updateData.technicianName = technicianName;
    if (vendorName !== undefined) updateData.vendorName = vendorName;
    if (startDate) updateData.startDate = new Date(startDate);
    if (completedDate) updateData.completedDate = new Date(completedDate);
    if (repairCost) updateData.repairCost = parseFloat(repairCost);
    if (estimatedDays) updateData.estimatedDays = parseInt(estimatedDays);
    if (notes !== undefined) updateData.notes = notes;

    const updatedRepair = await prisma.repairQueue.update({
      where: { id: params.id },
      data: updateData,
      include: {
        item: {
          include: {
            category: true,
          },
        },
      },
    });

    return NextResponse.json(updatedRepair);
  } catch (error) {
    console.error("Error updating repair:", error);
    return NextResponse.json(
      { error: "Failed to update repair" },
      { status: 500 }
    );
  }
}

// DELETE /api/repairs/:id - Cancel repair request
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role === "VIEWER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const repair = await prisma.repairQueue.findUnique({
      where: { id: params.id },
      include: { item: true },
    });

    if (!repair) {
      return NextResponse.json({ error: "Repair not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // If repair was pending or in repair, restore item
      if (repair.status === "PENDING" || repair.status === "IN_REPAIR") {
        // Get current item for quantity tracking
        const item = await tx.item.findUnique({ where: { id: repair.itemId } });
        const previousQty = item!.quantityAvailable;
        const newQty = previousQty + 1;

        // Update item condition back to GOOD (or keep as is if needed)
        await tx.item.update({
          where: { id: repair.itemId },
          data: {
            condition: "GOOD",
            quantityAvailable: { increment: 1 },
          },
        });

        // Create stock movement for return from repair
        await tx.stockMovement.create({
          data: {
            itemId: repair.itemId,
            movementType: "RETURN",
            quantity: 1,
            previousQuantity: previousQty,
            newQuantity: newQty,
            conditionAfter: "GOOD",
            notes: `Repair cancelled: ${repair.notes || "No details"}`,
            performedByUserId: session.user?.id || "",
          },
        });
      }

      // Delete the repair record
      await tx.repairQueue.delete({
        where: { id: params.id },
      });
    });

    return NextResponse.json({ message: "Repair cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling repair:", error);
    return NextResponse.json(
      { error: "Failed to cancel repair" },
      { status: 500 }
    );
  }
}
