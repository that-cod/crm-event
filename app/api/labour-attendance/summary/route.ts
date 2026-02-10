import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Force dynamic rendering for this route (uses authentication)
export const dynamic = 'force-dynamic';

// GET /api/labour-attendance/summary - Get attendance summary by labourer
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Prisma.LabourAttendanceWhereInput = {};

    if (startDate && endDate) {
      where.attendanceDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where.attendanceDate = { gte: new Date(startDate) };
    } else if (endDate) {
      where.attendanceDate = { lte: new Date(endDate) };
    }

    const attendanceRecords = await prisma.labourAttendance.findMany({
      where,
      include: {
        site: true,
        markedBy: true,
      },
      orderBy: {
        attendanceDate: "desc",
      },
    });

    // Group by labour name
    const labourSummary: Record<
      string,
      {
        labourName: string;
        totalDays: number;
        totalShifts: number;
        totalWages: number;
        warehouseDays: number;
        siteDays: number;
        records: unknown[];
  }
    > = { };

  attendanceRecords.forEach((record) => {
    if (!labourSummary[record.labourName]) {
      labourSummary[record.labourName] = {
        labourName: record.labourName,
        totalDays: 0,
        totalShifts: 0,
        totalWages: 0,
        warehouseDays: 0,
        siteDays: 0,
        records: [],
      };
    }

    const summary = labourSummary[record.labourName];
    summary.totalDays++;
    summary.totalShifts += record.shiftsWorked;
    summary.totalWages += record.totalWage || 0;

    if (record.shiftType === "WAREHOUSE") {
      summary.warehouseDays++;
    } else {
      summary.siteDays++;
    }

    summary.records.push(record);
  });

  const summaryArray = Object.values(labourSummary).sort(
    (a, b) => b.totalShifts - a.totalShifts
  );

  return NextResponse.json({ labourSummary: summaryArray });
} catch (error) {
  console.error("Error fetching attendance summary:", error);
  return NextResponse.json(
    { error: "Failed to fetch attendance summary" },
    { status: 500 }
  );
}
}
