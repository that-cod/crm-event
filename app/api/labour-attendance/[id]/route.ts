import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// GET /api/labour-attendance/:id - Get single attendance record
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const attendance = await prisma.labourAttendance.findUnique({
      where: { id: params.id },
      include: {
        site: true,
        markedBy: true,
      },
    });

    if (!attendance) {
      return NextResponse.json(
        { error: "Attendance record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(attendance);
  } catch (error) {
    console.error("Error fetching attendance record:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance record" },
      { status: 500 }
    );
  }
}

// PUT /api/labour-attendance/:id - Update attendance record
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
    const { shiftsWorked, wagePerShift, notes } = body;

    const existingAttendance = await prisma.labourAttendance.findUnique({
      where: { id: params.id },
    });

    if (!existingAttendance) {
      return NextResponse.json(
        { error: "Attendance record not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (shiftsWorked !== undefined) {
      const shifts = parseFloat(shiftsWorked);
      if (shifts <= 0 || shifts % 0.5 !== 0) {
        return NextResponse.json(
          {
            error: "Shifts must be in increments of 0.5 (e.g., 0.5, 1, 1.5, 2)",
          },
          { status: 400 }
        );
      }
      updateData.shiftsWorked = shifts;
    }

    if (wagePerShift !== undefined) {
      updateData.wagePerShift = wagePerShift ? parseFloat(wagePerShift) : null;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Recalculate total wage if either shifts or wage changed
    if (shiftsWorked !== undefined || wagePerShift !== undefined) {
      const finalShifts =
        updateData.shiftsWorked !== undefined
          ? updateData.shiftsWorked
          : existingAttendance.shiftsWorked;
      const finalWage =
        updateData.wagePerShift !== undefined
          ? updateData.wagePerShift
          : existingAttendance.wagePerShift || null;
      const finalIncentive = existingAttendance.incentive || 0;

      updateData.totalWage = finalWage ? finalShifts * finalWage + finalIncentive : null;
    }

    const updatedAttendance = await prisma.labourAttendance.update({
      where: { id: params.id },
      data: updateData,
      include: {
        site: true,
        markedBy: true,
      },
    });

    return NextResponse.json(updatedAttendance);
  } catch (error) {
    console.error("Error updating attendance record:", error);
    return NextResponse.json(
      { error: "Failed to update attendance record" },
      { status: 500 }
    );
  }
}

// DELETE /api/labour-attendance/:id - Delete attendance record
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role === "VIEWER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const attendance = await prisma.labourAttendance.findUnique({
      where: { id: params.id },
    });

    if (!attendance) {
      return NextResponse.json(
        { error: "Attendance record not found" },
        { status: 404 }
      );
    }

    await prisma.labourAttendance.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: "Attendance record deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting attendance record:", error);
    return NextResponse.json(
      { error: "Failed to delete attendance record" },
      { status: 500 }
    );
  }
}
