import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, ShiftType } from "@prisma/client";
import {
  handleApiError,
  unauthorizedError,
  validationError,
  createdResponse,
  successResponse,
} from "@/lib/api-error-handler";
import {
  labourAttendanceSchema,
  validateRequestBody,
} from "@/lib/validation-schemas";

// GET /api/labour-attendance - List all attendance records
export async function GET(request: NextRequest) {
  let session;

  try {
    session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const shiftType = searchParams.get("shiftType");
    const siteId = searchParams.get("siteId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const labourName = searchParams.get("labourName");

    const where: Prisma.LabourAttendanceWhereInput = {};

    if (shiftType && shiftType !== "ALL" && Object.values(ShiftType).includes(shiftType as ShiftType)) {
      where.shiftType = shiftType as ShiftType;
    }

    if (siteId) {
      where.siteId = siteId;
    }

    if (labourName) {
      where.labourName = {
        contains: labourName,
        mode: "insensitive",
      };
    }

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

    // Calculate summary statistics
    const summary = {
      total: attendanceRecords.length,
      warehouse: attendanceRecords.filter((a) => a.shiftType === "WAREHOUSE")
        .length,
      site: attendanceRecords.filter((a) => a.shiftType === "SITE").length,
      totalShifts: attendanceRecords.reduce(
        (sum, a) => sum + a.shiftsWorked,
        0
      ),
      totalWages: attendanceRecords.reduce(
        (sum, a) => sum + (a.totalWage || 0),
        0
      ),
      uniqueLabourers: new Set(attendanceRecords.map((a) => a.labourName)).size,
    };

    return successResponse({ attendanceRecords, summary });
  } catch (error: unknown) {
    return handleApiError(error, {
      operation: "fetch labour attendance records",
      userId: session?.user?.id,
    });
  }
}

// POST /api/labour-attendance - Create new attendance record
export async function POST(request: NextRequest) {
  let session;
  let labourName: string | undefined;
  let attendanceDate: string | undefined;

  try {
    session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return unauthorizedError("Authentication required");
    }

    // Validate request body
    const validation = await validateRequestBody(request, labourAttendanceSchema);
    if (!validation.success) {
      return validationError(validation.errors.join("; "));
    }

    const data = validation.data;
    labourName = data.labourName;
    attendanceDate = data.attendanceDate;
    const shiftType = data.shiftType;
    const siteId = data.siteId;
    const shiftsWorked = Number(data.shiftsWorked);
    const wagePerShift = data.wagePerShift ? Number(data.wagePerShift) : null;
    const notes = data.notes;

    // Validate site for SITE shift type
    if (shiftType === "SITE" && !siteId) {
      return validationError("Site is required for site attendance");
    }

    // Verify site exists if provided
    if (siteId) {
      const site = await prisma.site.findUnique({
        where: { id: siteId },
      });
      if (!site) {
        return validationError("Site not found");
      }
    }

    // Calculate total wage
    const totalWage = wagePerShift ? wagePerShift * shiftsWorked : null;

    const attendance = await prisma.labourAttendance.create({
      data: {
        labourName,
        attendanceDate: new Date(attendanceDate),
        shiftType,
        siteId: shiftType === "SITE" ? siteId : null,
        shiftsWorked,
        wagePerShift: wagePerShift || null,
        totalWage: totalWage,
        notes: notes || null,
        markedByUserId: session.user.id,
      },
      include: {
        site: true,
        markedBy: true,
      },
    });

    return createdResponse(attendance);
  } catch (error: unknown) {
    return handleApiError(error, {
      operation: "create labour attendance",
      userId: session?.user?.id,
      additionalInfo: labourName && attendanceDate ? { labourName, attendanceDate } : undefined,
    });
  }
}
