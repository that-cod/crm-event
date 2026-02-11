import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateChallans } from "@/lib/permissions";
import { z } from "zod";

// Request validation
const createSingleSchema = z.object({
    projectId: z.string().cuid("Invalid project ID"),
    siteId: z.string().cuid().optional().nullable(),
    truck: z.object({
        capacity: z.number().positive(),
        items: z.array(
            z.object({
                itemId: z.string().cuid(),
                quantity: z.number().int().positive(),
            })
        ).min(1, "At least one item required"),
    }),
});

// Generate sequential challan number (CH-XXXXX)
async function generateChallanNumber(
    tx: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">
): Promise<string> {
    const lastChallan = await tx.challan.findFirst({
        orderBy: { challanNumber: "desc" },
        select: { challanNumber: true },
    });

    let nextNumber = 1;
    if (lastChallan?.challanNumber) {
        const match = lastChallan.challanNumber.match(/CH-(\d+)/);
        if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
        }
    }

    return `CH-${nextNumber.toString().padStart(5, "0")}`;
}

// POST /api/challans/create-single
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !canCreateChallans(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await request.json();
        console.log("Create single challan request:", JSON.stringify(body, null, 2));

        // Validate input
        const result = createSingleSchema.safeParse(body);
        if (!result.success) {
            console.error("Validation failed:", result.error.errors);
            return NextResponse.json(
                { error: result.error.errors[0].message, details: result.error.errors },
                { status: 400 }
            );
        }

        const { projectId, siteId, truck } = result.data;

        // Verify project exists
        const project = await prisma.project.findUnique({
            where: { id: projectId },
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Collect item IDs and verify stock
        const itemIds = truck.items.map((i) => i.itemId);
        const items = await prisma.item.findMany({
            where: { id: { in: itemIds } },
        });

        if (items.length !== itemIds.length) {
            return NextResponse.json(
                { error: "One or more items not found" },
                { status: 404 }
            );
        }

        // Check stock availability
        for (const truckItem of truck.items) {
            const item = items.find((i) => i.id === truckItem.itemId);
            if (!item) continue;

            if (item.quantityAvailable < truckItem.quantity) {
                return NextResponse.json(
                    {
                        error: `Insufficient stock for "${item.name}". Available: ${item.quantityAvailable}, Required: ${truckItem.quantity}`,
                    },
                    { status: 400 }
                );
            }
        }

        // Create challan in transaction
        const createdChallan = await prisma.$transaction(async (tx) => {
            // Generate challan number
            const challanNumber = await generateChallanNumber(tx);

            // Create challan with DRAFT status
            const challan = await tx.challan.create({
                data: {
                    challanNumber,
                    projectId,
                    status: "DRAFT", // Can be edited later
                    challanType: "DELIVERY",
                    sourceSiteId: siteId,
                    createdByUserId: session.user.id,
                    items: {
                        create: truck.items.map((item) => ({
                            itemId: item.itemId,
                            quantity: item.quantity,
                        })),
                    },
                },
                include: {
                    items: {
                        include: {
                            item: true,
                        },
                    },
                },
            });

            // Create stock movements and update quantities
            for (const challanItem of challan.items) {
                const item = items.find((i) => i.id === challanItem.itemId)!;

                // Create stock movement
                await tx.stockMovement.create({
                    data: {
                        itemId: challanItem.itemId,
                        projectId,
                        movementType: "OUTWARD",
                        quantity: challanItem.quantity,
                        previousQuantity: item.quantityAvailable,
                        newQuantity: item.quantityAvailable - challanItem.quantity,
                        notes: `Challan ${challanNumber}`,
                        performedByUserId: session.user.id,
                    },
                });

                // Deduct from item quantity
                await tx.item.update({
                    where: { id: challanItem.itemId },
                    data: {
                        quantityAvailable: { decrement: challanItem.quantity },
                    },
                });
            }

            return challan;
        });

        return NextResponse.json({
            success: true,
            challanId: createdChallan.id,
            challanNumber: createdChallan.challanNumber,
            message: `Challan ${createdChallan.challanNumber} created successfully`,
        });
    } catch (error: unknown) {
        console.error("Error creating challan:", error);
        const errorMessage =
            error instanceof Error ? error.message : "Failed to create challan";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
