import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// GET /api/scrap/:id - Get single scrap record
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scrapRecord = await prisma.scrapRecord.findUnique({
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

    if (!scrapRecord) {
      return NextResponse.json(
        { error: "Scrap record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(scrapRecord);
  } catch (error) {
    console.error("Error fetching scrap record:", error);
    return NextResponse.json(
      { error: "Failed to fetch scrap record" },
      { status: 500 }
    );
  }
}

// PUT /api/scrap/:id - Update scrap record
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
    const { valueRealized, disposalNotes } = body;

    const existingScrap = await prisma.scrapRecord.findUnique({
      where: { id: params.id },
    });

    if (!existingScrap) {
      return NextResponse.json(
        { error: "Scrap record not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (valueRealized !== undefined)
      updateData.valueRealized = valueRealized
        ? parseFloat(valueRealized)
        : null;
    if (disposalNotes !== undefined) updateData.disposalNotes = disposalNotes;

    const updatedScrap = await prisma.scrapRecord.update({
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

    return NextResponse.json(updatedScrap);
  } catch (error) {
    console.error("Error updating scrap record:", error);
    return NextResponse.json(
      { error: "Failed to update scrap record" },
      { status: 500 }
    );
  }
}

// DELETE /api/scrap/:id - Delete scrap record (only if not disposed)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role === "VIEWER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scrapRecord = await prisma.scrapRecord.findUnique({
      where: { id: params.id },
      include: { item: true },
    });

    if (!scrapRecord) {
      return NextResponse.json(
        { error: "Scrap record not found" },
        { status: 404 }
      );
    }

    if (scrapRecord.disposalDate) {
      return NextResponse.json(
        { error: "Cannot delete disposed scrap records" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Delete scrap record
      await tx.scrapRecord.delete({
        where: { id: params.id },
      });

      // Restore quantity to item (assuming 1 item was scrapped)
      const item = await tx.item.findUnique({ where: { id: scrapRecord.itemId } });
      const previousQty = item!.quantityAvailable;
      const newQty = previousQty + 1;

      await tx.item.update({
        where: { id: scrapRecord.itemId },
        data: {
          condition: "GOOD",
          quantityAvailable: { increment: 1 },
        },
      });

      // Create stock movement for restoration
      await tx.stockMovement.create({
        data: {
          itemId: scrapRecord.itemId,
          movementType: "RETURN",
          quantity: 1,
          previousQuantity: previousQty,
          newQuantity: newQty,
          conditionAfter: "GOOD",
          notes: `Scrap record cancelled and item restored`,
          performedByUserId: session.user?.id || "",
        },
      });
    });

    return NextResponse.json({ message: "Scrap record deleted successfully" });
  } catch (error) {
    console.error("Error deleting scrap record:", error);
    return NextResponse.json(
      { error: "Failed to delete scrap record" },
      { status: 500 }
    );
  }
}
