import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageInventory } from "@/lib/permissions";

// GET /api/inventory/items/[id] - Get single item
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const item = await prisma.item.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        subcategory: true,
        stockMovements: {
          include: {
            project: true,
            performedBy: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
        maintenanceRecords: {
          include: {
            assignedTo: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error fetching item:", error);
    return NextResponse.json(
      { error: "Failed to fetch item" },
      { status: 500 }
    );
  }
}

// PUT /api/inventory/items/[id] - Update item
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !canManageInventory(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const {
      categoryId,
      subcategoryId,
      name,
      description,
      quantityAvailable,
      condition,
      cost,
      vendor,
      remarks,
      imageUrl1,
      imageUrl2,
      imageUrl3,
      currentLocation,
    } = body;

    const item = await prisma.item.update({
      where: { id: params.id },
      data: {
        categoryId,
        subcategoryId: subcategoryId || null,
        name,
        description: description || null,
        quantityAvailable: quantityAvailable ? parseInt(quantityAvailable) : 0,
        condition,
        cost: cost ? parseFloat(cost) : null,
        vendor: vendor || null,
        remarks: remarks || null,
        imageUrl1: imageUrl1 || null,
        imageUrl2: imageUrl2 || null,
        imageUrl3: imageUrl3 || null,
        currentLocation: currentLocation || null,
      },
      include: {
        category: true,
        subcategory: true,
      },
    });

    // If condition changed to REPAIR_NEEDED or DAMAGED, create maintenance record
    if (
      (condition === "REPAIR_NEEDED" || condition === "DAMAGED") &&
      body.createMaintenance
    ) {
      await prisma.maintenanceRecord.create({
        data: {
          itemId: item.id,
          status: "PENDING",
          notes: body.maintenanceNotes || `Item marked as ${condition}`,
        },
      });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error updating item:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

// DELETE /api/inventory/items/[id] - Delete item
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !canManageInventory(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.item.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting item:", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}
