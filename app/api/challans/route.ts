import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateChallans } from "@/lib/permissions";
import { Prisma } from "@prisma/client";
import {
  handleApiError,
  unauthorizedError,
  validationError,
  createdResponse,
  successResponse,
} from "@/lib/api-error-handler";
import {
  challanCreateSchema,
  validateRequestBody,
} from "@/lib/validation-schemas";

// GET /api/challans
export async function GET(request: Request) {
  let session;

  try {
    session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const where: Prisma.ChallanWhereInput = {};
    if (projectId) where.projectId = projectId;

    const challans = await prisma.challan.findMany({
      where,
      include: {
        project: true,
        createdBy: true,
        items: {
          include: {
            item: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return successResponse(challans);
  } catch (error: unknown) {
    return handleApiError(error, {
      operation: "fetch challans",
      userId: session?.user?.id,
    });
  }
}

// POST /api/challans - Create challan with automatic stock deduction
export async function POST(request: Request) {
  let session;
  let projectId: string | undefined;

  try {
    session = await getServerSession(authOptions);
    if (!session || !canCreateChallans(session.user.role)) {
      return unauthorizedError("You don't have permission to create challans");
    }

    // Validate request body
    const validationResult = await validateRequestBody(request, challanCreateSchema);
    if (!validationResult.success) {
      return validationError(validationResult.errors.join("; "));
    }

    const validatedData = validationResult.data;
    projectId = validatedData.projectId;
    const projectIdStr = validatedData.projectId as string;
    const items = validatedData.items;
    const expectedReturnDate = validatedData.expectedReturnDate;
    const remarks = validatedData.remarks;
    const truckNumber = validatedData.truckNumber;
    const driverName = validatedData.driverName;
    const driverPhone = validatedData.driverPhone;
    const movementDirection = validatedData.movementDirection;

    // Use transaction to create challan and deduct stock
    // CRITICAL: Generate challan number INSIDE transaction to prevent race condition
    const result = await prisma.$transaction(async (tx) => {
      // Generate challan number atomically within transaction
      const lastChallan = await tx.challan.findFirst({
        orderBy: { createdAt: "desc" },
        select: { challanNumber: true },
      });


      const challanNumber = generateChallanNumber(lastChallan?.challanNumber);

      // Verify stock availability for all items (OPTIMIZED: batch query instead of N queries)
      const itemIds = items.map(item => item.itemId);
      const itemsData = await tx.item.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, name: true, quantityAvailable: true },
      });

      // Create lookup map for O(1) access
      const itemMap = new Map(itemsData.map(i => [i.id, i]));

      // Validate all items
      for (const item of items) {
        const itemData = itemMap.get(item.itemId);

        if (!itemData) {
          throw new Error(`Item not found: ${item.itemId}`);
        }

        if (itemData.quantityAvailable < item.quantity) {
          throw new Error(
            `Insufficient stock for ${itemData.name}. Available: ${itemData.quantityAvailable}, Required: ${item.quantity}`
          );
        }
      }


      // Create challan
      const challan = await tx.challan.create({
        data: {
          challanNumber,
          projectId: projectIdStr,
          createdByUserId: session.user.id,
          expectedReturnDate: expectedReturnDate
            ? new Date(expectedReturnDate)
            : null,
          remarks,
          truckNumber,
          driverName,
          driverPhone,
          movementDirection,
          items: {
            create: items.map((item) => ({
              itemId: item.itemId,
              quantity: item.quantity,
              notes: item.notes,
            })),
          },
        },
        include: {
          project: true,
          createdBy: true,
          items: {
            include: {
              item: true,
            },
          },
        },
      });

      // Create stock movements and deduct quantities
      for (const item of items) {
        const currentItem = await tx.item.findUnique({
          where: { id: item.itemId },
        });

        if (!currentItem) continue;

        const previousQuantity = currentItem.quantityAvailable;
        const newQuantity = previousQuantity - item.quantity;

        // Create stock movement
        await tx.stockMovement.create({
          data: {
            itemId: item.itemId,
            projectId,
            movementType: "OUTWARD",
            quantity: item.quantity,
            previousQuantity,
            newQuantity,
            notes: `Allocated via Challan ${challanNumber}`,
            performedByUserId: session.user.id,
          },
        });

        // Update item quantity
        await tx.item.update({
          where: { id: item.itemId },
          data: { quantityAvailable: newQuantity },
        });
      }

      return challan;
    });

    return createdResponse(result);
  } catch (error: unknown) {
    return handleApiError(error, {
      operation: "create challan",
      userId: session?.user?.id,
      resourceId: projectId,
    });
  }
}

// Helper function to generate challan number
function generateChallanNumber(lastNumber?: string): string {
  const year = new Date().getFullYear();
  const prefix = `CH-${year}-`;

  if (!lastNumber) {
    return `${prefix}001`;
  }

  const lastNumberParts = lastNumber.split("-");
  const lastSequence = parseInt(lastNumberParts[lastNumberParts.length - 1]);
  const nextSequence = lastSequence + 1;

  return `${prefix}${nextSequence.toString().padStart(3, "0")}`;
}

