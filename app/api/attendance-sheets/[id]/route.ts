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

// PATCH /api/attendance-sheets/[id] - Update incentive or other fields
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { incentive, status } = body;

        // Get the sheet
        const sheet = await prisma.attendanceSheet.findUnique({
            where: { id: params.id },
        });

        if (!sheet) {
            return NextResponse.json(
                { error: "Attendance sheet not found" },
                { status: 404 }
            );
        }

        // Update incentive if provided
        let updatedIncentive = sheet.incentive;
        if (incentive !== undefined) {
            updatedIncentive = parseFloat(incentive.toString());
        }

        // Recalculate totals
        const calculated = calculateSheetTotals({
            ...sheet,
            incentive: updatedIncentive,
        });

        // Update the sheet
        const updatedSheet = await prisma.attendanceSheet.update({
            where: { id: params.id },
            data: {
                ...(incentive !== undefined && { incentive: updatedIncentive }),
                ...(status && { status }),
                ...(status === "finalized" && { finalizedAt: new Date() }),
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
            updatedSheet: {
                incentive: updatedIncentive,
                netWages: calculated.netWages,
                netPayable: calculated.netPayable,
                balanceDue: calculated.balanceDue,
            },
            sheet: updatedSheet,
        });
    } catch (error) {
        console.error("Error updating attendance sheet:", error);
        return NextResponse.json(
            { error: "Failed to update attendance sheet" },
            { status: 500 }
        );
    }
}

// GET /api/attendance-sheets/[id] - Get a single attendance sheet
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const sheet = await prisma.attendanceSheet.findUnique({
            where: { id: params.id },
            include: {
                labour: true,
                site: true,
                transactions: {
                    orderBy: { date: "asc" },
                },
                attendanceRecords: {
                    orderBy: { date: "asc" },
                },
            },
        });

        if (!sheet) {
            return NextResponse.json(
                { error: "Attendance sheet not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, sheet });
    } catch (error) {
        console.error("Error fetching attendance sheet:", error);
        return NextResponse.json(
            { error: "Failed to fetch attendance sheet" },
            { status: 500 }
        );
    }
}
