import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function calculateSheetTotals(sheet: {
    attendanceJson: unknown;
    dailyRate: number;
    incentive: number;
    totalAdvance: number;
    openingBalance: number;
    totalPaid: number;
}) {
    const attendanceArray = sheet.attendanceJson as number[];
    const totalShifts = attendanceArray.reduce((sum, val) => sum + val, 0);
    const wages = totalShifts * sheet.dailyRate;
    const netWages = wages + sheet.incentive;
    const netPayable = netWages - sheet.totalAdvance + sheet.openingBalance;
    const balanceDue = netPayable - sheet.totalPaid;

    return { totalShifts, wages, netWages, netPayable, balanceDue };
}

// PATCH /api/attendance-sheets/[id] - Update sheet fields
// Accepts: incentive, totalAdvance, totalPaid, dailyRate, status
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
        const { incentive, totalAdvance, totalPaid, dailyRate, status } = body;

        const sheet = await prisma.attendanceSheet.findUnique({
            where: { id: params.id },
        });

        if (!sheet) {
            return NextResponse.json(
                { error: "Attendance sheet not found" },
                { status: 404 }
            );
        }

        // Apply updates
        const updatedFields = {
            incentive: incentive !== undefined ? parseFloat(String(incentive)) : sheet.incentive,
            totalAdvance: totalAdvance !== undefined ? parseFloat(String(totalAdvance)) : sheet.totalAdvance,
            totalPaid: totalPaid !== undefined ? parseFloat(String(totalPaid)) : sheet.totalPaid,
            dailyRate: dailyRate !== undefined ? parseFloat(String(dailyRate)) : sheet.dailyRate,
        };

        // Recalculate all derived fields
        const calculated = calculateSheetTotals({
            attendanceJson: sheet.attendanceJson,
            dailyRate: updatedFields.dailyRate,
            incentive: updatedFields.incentive,
            totalAdvance: updatedFields.totalAdvance,
            openingBalance: sheet.openingBalance,
            totalPaid: updatedFields.totalPaid,
        });

        const updatedSheet = await prisma.attendanceSheet.update({
            where: { id: params.id },
            data: {
                ...updatedFields,
                totalShifts: calculated.totalShifts,
                wages: calculated.wages,
                netWages: calculated.netWages,
                netPayable: calculated.netPayable,
                balanceDue: calculated.balanceDue,
                ...(status && { status }),
                ...(status === "finalized" && { finalizedAt: new Date() }),
            },
            include: {
                labour: true,
                site: true,
            },
        });

        return NextResponse.json({ success: true, sheet: updatedSheet });
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
