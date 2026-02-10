import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/labours/[id] - Get a single labour
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const labour = await prisma.labour.findUnique({
            where: { id: params.id },
            include: {
                site: true,
                attendanceSheets: {
                    orderBy: { year: "desc" },
                    take: 6, // Last 6 months
                },
                _count: {
                    select: {
                        attendanceRecords: true,
                        transactions: true,
                    },
                },
            },
        });

        if (!labour) {
            return NextResponse.json({ error: "Labour not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, labour });
    } catch (error) {
        console.error("Error fetching labour:", error);
        return NextResponse.json(
            { error: "Failed to fetch labour" },
            { status: 500 }
        );
    }
}

// PUT /api/labours/[id] - Update a labour
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
        const { name, phone, address, defaultDailyRate } = body;

        const labour = await prisma.labour.update({
            where: { id: params.id },
            data: {
                ...(name && { name }),
                ...(phone !== undefined && { phone }),
                ...(address !== undefined && { address }),
                ...(defaultDailyRate !== undefined && { defaultDailyRate }),
            },
            include: {
                site: true,
            },
        });

        return NextResponse.json({ success: true, labour });
    } catch (error) {
        console.error("Error updating labour:", error);
        return NextResponse.json(
            { error: "Failed to update labour" },
            { status: 500 }
        );
    }
}

// DELETE /api/labours/[id] - Delete a labour
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if labour has attendance records
        const labour = await prisma.labour.findUnique({
            where: { id: params.id },
            include: {
                _count: {
                    select: {
                        attendanceRecords: true,
                        attendanceSheets: true,
                    },
                },
            },
        });

        if (!labour) {
            return NextResponse.json({ error: "Labour not found" }, { status: 404 });
        }

        if (
            labour._count.attendanceRecords > 0 ||
            labour._count.attendanceSheets > 0
        ) {
            return NextResponse.json(
                {
                    error:
                        "Cannot delete labour with existing attendance records. Please archive instead.",
                },
                { status: 400 }
            );
        }

        await prisma.labour.delete({
            where: { id: params.id },
        });

        return NextResponse.json({
            success: true,
            message: "Labour deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting labour:", error);
        return NextResponse.json(
            { error: "Failed to delete labour" },
            { status: 500 }
        );
    }
}
