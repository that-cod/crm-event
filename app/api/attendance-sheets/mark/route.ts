import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Helper function to recalculate sheet totals
function calculateSheetTotals(sheet: { attendanceJson: unknown; dailyRate: number; incentive: number; totalAdvance: number; openingBalance: number; totalPaid: number }) {
    const attendanceArray = sheet.attendanceJson as number[];
    const totalShifts = attendanceArray.reduce((sum, val) => sum + val, 0);
    const wages = totalShifts * sheet.dailyRate;
    const netWages = wages + sheet.incentive;
    const netPayable = netWages - sheet.totalAdvance + sheet.openingBalance;
    const balanceDue = netPayable - sheet.totalPaid;

    return {
        totalShifts,
        wages,
        netWages,
        netPayable,
        balanceDue,
    };
}

// PUT /api/attendance-sheets/mark - Mark attendance for a specific date
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { attendanceSheetId, date, shifts } = body;

        if (!attendanceSheetId || !date || shifts === undefined) {
            return NextResponse.json(
                { error: "attendanceSheetId, date, and shifts are required" },
                { status: 400 }
            );
        }

        // Get the sheet
        const sheet = await prisma.attendanceSheet.findUnique({
            where: { id: attendanceSheetId },
        });

        if (!sheet) {
            return NextResponse.json(
                { error: "Attendance sheet not found" },
                { status: 404 }
            );
        }

        // Parse the date and get day of month (1-31)
        const dateObj = new Date(date);
        const dayOfMonth = dateObj.getDate();

        if (dayOfMonth < 1 || dayOfMonth > 31) {
            return NextResponse.json(
                { error: "Invalid date - day must be between 1 and 31" },
                { status: 400 }
            );
        }

        // Update attendance JSON
        const attendanceArray = sheet.attendanceJson as number[];
        attendanceArray[dayOfMonth - 1] = parseFloat(shifts.toString());

        // Create/update attendance record
        await prisma.attendanceRecord.upsert({
            where: {
                labourId_date: {
                    labourId: sheet.labourId,
                    date: dateObj,
                },
            },
            create: {
                labourId: sheet.labourId,
                date: dateObj,
                shifts: parseFloat(shifts.toString()),
                siteId: sheet.siteId,
                attendanceSheetId: sheet.id,
            },
            update: {
                shifts: parseFloat(shifts.toString()),
            },
        });

        // Recalculate totals
        const calculated = calculateSheetTotals({
            ...sheet,
            attendanceJson: attendanceArray,
        });

        // Update the sheet
        const updatedSheet = await prisma.attendanceSheet.update({
            where: { id: attendanceSheetId },
            data: {
                attendanceJson: attendanceArray,
                totalShifts: calculated.totalShifts,
                wages: calculated.wages,
                netWages: calculated.netWages,
                netPayable: calculated.netPayable,
                balanceDue: calculated.balanceDue,
            },
            include: {
                labour: true,
                transactions: true,
            },
        });

        return NextResponse.json({
            success: true,
            attendanceRecord: {
                date,
                shifts: parseFloat(shifts.toString()),
            },
            updatedSheet: {
                totalShifts: calculated.totalShifts,
                wages: calculated.wages,
                netWages: calculated.netWages,
                netPayable: calculated.netPayable,
                balanceDue: calculated.balanceDue,
            },
            sheet: updatedSheet,
        });
    } catch (error) {
        console.error("Error marking attendance:", error);
        return NextResponse.json(
            { error: "Failed to mark attendance" },
            { status: 500 }
        );
    }
}

// POST /api/attendance-sheets/mark - Bulk mark attendance
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { updates } = body;

        if (!updates || !Array.isArray(updates)) {
            return NextResponse.json(
                { error: "updates array is required" },
                { status: 400 }
            );
        }

        const results = [];

        for (const update of updates) {
            const { attendanceSheetId, date, shifts } = update;

            // Get the sheet
            const sheet = await prisma.attendanceSheet.findUnique({
                where: { id: attendanceSheetId },
            });

            if (!sheet) continue;

            // Parse the date and get day of month
            const dateObj = new Date(date);
            const dayOfMonth = dateObj.getDate();

            if (dayOfMonth < 1 || dayOfMonth > 31) continue;

            // Update attendance JSON
            const attendanceArray = sheet.attendanceJson as number[];
            attendanceArray[dayOfMonth - 1] = parseFloat(shifts.toString());

            // Create/update attendance record
            await prisma.attendanceRecord.upsert({
                where: {
                    labourId_date: {
                        labourId: sheet.labourId,
                        date: dateObj,
                    },
                },
                create: {
                    labourId: sheet.labourId,
                    date: dateObj,
                    shifts: parseFloat(shifts.toString()),
                    siteId: sheet.siteId,
                    attendanceSheetId: sheet.id,
                },
                update: {
                    shifts: parseFloat(shifts.toString()),
                },
            });

            // Recalculate totals
            const calculated = calculateSheetTotals({
                ...sheet,
                attendanceJson: attendanceArray,
            });

            // Update the sheet
            const updatedSheet = await prisma.attendanceSheet.update({
                where: { id: attendanceSheetId },
                data: {
                    attendanceJson: attendanceArray,
                    totalShifts: calculated.totalShifts,
                    wages: calculated.wages,
                    netWages: calculated.netWages,
                    netPayable: calculated.netPayable,
                    balanceDue: calculated.balanceDue,
                },
            });

            results.push({
                attendanceSheetId,
                date,
                shifts,
                calculated,
            });
        }

        return NextResponse.json({
            success: true,
            results,
            count: results.length,
        });
    } catch (error) {
        console.error("Error bulk marking attendance:", error);
        return NextResponse.json(
            { error: "Failed to bulk mark attendance" },
            { status: 500 }
        );
    }
}
