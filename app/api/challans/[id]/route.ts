import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Validation schema for PUT
const updateChallanSchema = z.object({
    truckNumber: z.string().optional().nullable(),
    driverName: z.string().optional().nullable(),
    driverPhone: z.string().optional().nullable(),
    transporterName: z.string().optional().nullable(),
    lrBiltyNo: z.string().optional().nullable(),
    contactPersonName: z.string().optional().nullable(),
    contactPersonNumber: z.string().optional().nullable(),
    dispatchFrom: z.string().optional().nullable(),
    dispatchTo: z.string().optional().nullable(),
    amount: z.number().optional().nullable(),
    expectedReturnDate: z.string().optional().nullable(),
    remarks: z.string().max(1000).optional().nullable(),
    status: z.enum(["DRAFT", "SENT", "RETURNED", "PARTIALLY_RETURNED"]).optional(),
});

// GET /api/challans/[id] - Get single challan with items
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const challan = await prisma.challan.findUnique({
            where: { id: params.id },
            include: {
                project: true,
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                items: {
                    include: {
                        item: {
                            include: {
                                category: true,
                            },
                        },
                    },
                },
            },
        });

        if (!challan) {
            return NextResponse.json({ error: "Challan not found" }, { status: 404 });
        }

        return NextResponse.json(challan);
    } catch (error) {
        console.error("Error fetching challan:", error);
        return NextResponse.json(
            { error: "Failed to fetch challan" },
            { status: 500 }
        );
    }
}

// PUT /api/challans/[id] - Update challan details
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

        // Validate input
        const result = updateChallanSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400 }
            );
        }

        const updateData = result.data;

        // Check challan exists
        const existingChallan = await prisma.challan.findUnique({
            where: { id: params.id },
        });

        if (!existingChallan) {
            return NextResponse.json({ error: "Challan not found" }, { status: 404 });
        }

        // Prepare update object  
        const dataToUpdate: Record<string, unknown> = {};

        if (updateData.truckNumber !== undefined)
            dataToUpdate.truckNumber = updateData.truckNumber;
        if (updateData.driverName !== undefined)
            dataToUpdate.driverName = updateData.driverName;
        if (updateData.driverPhone !== undefined)
            dataToUpdate.driverPhone = updateData.driverPhone;
        if (updateData.transporterName !== undefined)
            dataToUpdate.transporterName = updateData.transporterName;
        if (updateData.lrBiltyNo !== undefined)
            dataToUpdate.lrBiltyNo = updateData.lrBiltyNo;
        if (updateData.contactPersonName !== undefined)
            dataToUpdate.contactPersonName = updateData.contactPersonName;
        if (updateData.contactPersonNumber !== undefined)
            dataToUpdate.contactPersonNumber = updateData.contactPersonNumber;
        if (updateData.dispatchFrom !== undefined)
            dataToUpdate.dispatchFrom = updateData.dispatchFrom;
        if (updateData.dispatchTo !== undefined)
            dataToUpdate.dispatchTo = updateData.dispatchTo;
        if (updateData.amount !== undefined)
            dataToUpdate.amount = updateData.amount;
        if (updateData.expectedReturnDate !== undefined)
            dataToUpdate.expectedReturnDate = updateData.expectedReturnDate
                ? new Date(updateData.expectedReturnDate)
                : null;
        if (updateData.remarks !== undefined)
            dataToUpdate.remarks = updateData.remarks;
        if (updateData.status !== undefined)
            dataToUpdate.status = updateData.status;

        // Update challan
        const updatedChallan = await prisma.challan.update({
            where: { id: params.id },
            data: dataToUpdate,
            include: {
                project: true,
                items: {
                    include: {
                        item: true,
                    },
                },
            },
        });

        return NextResponse.json({
            success: true,
            challan: updatedChallan,
            message: "Challan updated successfully",
        });
    } catch (error: unknown) {
        console.error("Error updating challan:", error);
        const errorMessage =
            error instanceof Error ? error.message : "Failed to update challan";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

// DELETE /api/challans/[id] - Delete DRAFT challan
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if challan exists
        const challan = await prisma.challan.findUnique({
            where: { id: params.id },
            include: {
                items: true,
            },
        });

        if (!challan) {
            return NextResponse.json({ error: "Challan not found" }, { status: 404 });
        }

        // Only allow deletion of DRAFT challans
        if (challan.status !== "DRAFT") {
            return NextResponse.json(
                { error: "Only DRAFT challans can be deleted" },
                { status: 400 }
            );
        }

        // Delete in transaction (restore stock)
        await prisma.$transaction(async (tx) => {
            // Restore stock quantities
            for (const challanItem of challan.items) {
                await tx.item.update({
                    where: { id: challanItem.itemId },
                    data: {
                        quantityAvailable: { increment: challanItem.quantity },
                    },
                });
            }

            // Delete challan (cascade will delete items)
            await tx.challan.delete({
                where: { id: params.id },
            });
        });

        return NextResponse.json({
            success: true,
            message: "Challan deleted successfully",
        });
    } catch (error: unknown) {
        console.error("Error deleting challan:", error);
        const errorMessage =
            error instanceof Error ? error.message : "Failed to delete challan";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
