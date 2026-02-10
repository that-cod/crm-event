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

// POST /api/attendance-sheets/transactions - Add a transaction (advance or payment)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { attendanceSheetId, type, amount, date, description } = body;

        if (!attendanceSheetId || !type || !amount) {
            return NextResponse.json(
                { error: "attendanceSheetId, type, and amount are required" },
                { status: 400 }
            );
        }

        if (type !== "advance" && type !== "payment") {
            return NextResponse.json(
                { error: "type must be 'advance' or 'payment'" },
                { status: 400 }
            );
        }

        // Get the sheet
        const sheet = await prisma.attendanceSheet.findUnique({
            where: { id: attendanceSheetId },
            include: {
                transactions: true,
            },
        });

        if (!sheet) {
            return NextResponse.json(
                { error: "Attendance sheet not found" },
                { status: 404 }
            );
        }

        // Create transaction
        const transaction = await prisma.labourTransaction.create({
            data: {
                labourId: sheet.labourId,
                attendanceSheetId,
                type,
                amount: parseFloat(amount.toString()),
                date: date ? new Date(date) : new Date(),
                description: description || null,
            },
        });

        // Calculate new totals
        const allTransactions = [...sheet.transactions, transaction];
        const totalAdvance = allTransactions
            .filter((t) => t.type === "advance")
            .reduce((sum, t) => sum + t.amount, 0);
        const totalPaid = allTransactions
            .filter((t) => t.type === "payment")
            .reduce((sum, t) => sum + t.amount, 0);

        // Recalculate totals
        const calculated = calculateSheetTotals({
            ...sheet,
            totalAdvance,
            totalPaid,
        });

        // Update the sheet
        const updatedSheet = await prisma.attendanceSheet.update({
            where: { id: attendanceSheetId },
            data: {
                totalAdvance,
                totalPaid,
                netPayable: calculated.netPayable,
                balanceDue: calculated.balanceDue,
            },
            include: {
                labour: true,
                transactions: {
                    orderBy: { date: "asc" },
                },
            },
        });

        return NextResponse.json({
            success: true,
            transaction,
            updatedSheet: {
                totalAdvance,
                totalPaid,
                netPayable: calculated.netPayable,
                balanceDue: calculated.balanceDue,
            },
            sheet: updatedSheet,
        });
    } catch (error) {
        console.error("Error creating transaction:", error);
        return NextResponse.json(
            { error: "Failed to create transaction" },
            { status: 500 }
        );
    }
}

// DELETE /api/attendance-sheets/transactions?id=xxx - Delete a transaction
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const transactionId = searchParams.get("id");

        if (!transactionId) {
            return NextResponse.json(
                { error: "Transaction id is required" },
                { status: 400 }
            );
        }

        // Get the transaction
        const transaction = await prisma.labourTransaction.findUnique({
            where: { id: transactionId },
        });

        if (!transaction) {
            return NextResponse.json(
                { error: "Transaction not found" },
                { status: 404 }
            );
        }

        const attendanceSheetId = transaction.attendanceSheetId;

        // Delete the transaction
        await prisma.labourTransaction.delete({
            where: { id: transactionId },
        });

        // Get updated sheet with remaining transactions
        const sheet = await prisma.attendanceSheet.findUnique({
            where: { id: attendanceSheetId },
            include: {
                transactions: true,
            },
        });

        if (!sheet) {
            return NextResponse.json({
                success: true,
                message: "Transaction deleted",
            });
        }

        // Recalculate totals
        const totalAdvance = sheet.transactions
            .filter((t) => t.type === "advance")
            .reduce((sum, t) => sum + t.amount, 0);
        const totalPaid = sheet.transactions
            .filter((t) => t.type === "payment")
            .reduce((sum, t) => sum + t.amount, 0);

        const calculated = calculateSheetTotals({
            ...sheet,
            totalAdvance,
            totalPaid,
        });

        // Update the sheet
        await prisma.attendanceSheet.update({
            where: { id: attendanceSheetId },
            data: {
                totalAdvance,
                totalPaid,
                netPayable: calculated.netPayable,
                balanceDue: calculated.balanceDue,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Transaction deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting transaction:", error);
        return NextResponse.json(
            { error: "Failed to delete transaction" },
            { status: 500 }
        );
    }
}
