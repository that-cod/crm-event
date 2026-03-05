import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getOpeningBalance(
    labourId: string,
    month: number,
    year: number,
    siteId: string
): Promise<number> {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const prevSheet = await prisma.attendanceSheet.findUnique({
        where: {
            labourId_month_year_siteId: {
                labourId,
                month: prevMonth,
                year: prevYear,
                siteId,
            },
        },
    });

    return prevSheet?.balanceDue || 0;
}

// GET /api/attendance-sheets - Get all attendance sheets for a site/month
// When autoCreate=true, creates sheets for any labours that don't have one yet
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const siteId = searchParams.get("siteId");
        const month = searchParams.get("month");
        const year = searchParams.get("year");
        const autoCreate = searchParams.get("autoCreate") === "true";

        if (!siteId || !month || !year) {
            return NextResponse.json(
                { error: "siteId, month, and year are required" },
                { status: 400 }
            );
        }

        const m = parseInt(month);
        const y = parseInt(year);

        // Auto-create sheets for all labours at the site
        if (autoCreate) {
            const labours = await prisma.labour.findMany({
                where: { siteId },
                orderBy: { name: "asc" },
            });

            const existingSheets = await prisma.attendanceSheet.findMany({
                where: { siteId, month: m, year: y },
                select: { labourId: true },
            });

            const existingLabourIds = new Set(existingSheets.map((s) => s.labourId));

            for (const labour of labours) {
                if (existingLabourIds.has(labour.id)) continue;

                const openingBalance = await getOpeningBalance(labour.id, m, y, siteId);

                await prisma.attendanceSheet.create({
                    data: {
                        labourId: labour.id,
                        month: m,
                        year: y,
                        siteId,
                        attendanceJson: Array(31).fill(0),
                        dailyRate: labour.defaultDailyRate,
                        openingBalance,
                        totalShifts: 0,
                        wages: 0,
                        incentive: 0,
                        netWages: 0,
                        totalAdvance: 0,
                        totalPaid: 0,
                        netPayable: openingBalance,
                        balanceDue: openingBalance,
                    },
                });
            }
        }

        // Fetch all sheets
        const sheets = await prisma.attendanceSheet.findMany({
            where: { siteId, month: m, year: y },
            include: {
                labour: true,
                site: true,
            },
            orderBy: { labour: { name: "asc" } },
        });

        return NextResponse.json({ success: true, sheets });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Error fetching attendance sheets:", error);
        return NextResponse.json(
            { error: `Failed to fetch attendance sheets: ${errorMessage}` },
            { status: 500 }
        );
    }
}
