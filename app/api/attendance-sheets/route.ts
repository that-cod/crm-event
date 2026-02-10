import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Retrieves the opening balance for a labour from the previous month's attendance sheet.
 * If no previous sheet exists, returns 0.
 * 
 * @param labourId - ID of the labour
 * @param month - Current month (1-12)
 * @param year - Current year
 * @param siteId - ID of the site
 * @returns Opening balance from previous month or 0
 */
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

        if (!siteId || !month || !year) {
            return NextResponse.json(
                { error: "siteId, month, and year are required" },
                { status: 400 }
            );
        }

        const sheets = await prisma.attendanceSheet.findMany({
            where: {
                siteId,
                month: parseInt(month),
                year: parseInt(year),
            },
            include: {
                labour: true,
                site: true,
                transactions: {
                    orderBy: { date: "asc" },
                },
                _count: {
                    select: {
                        attendanceRecords: true,
                    },
                },
            },
            orderBy: {
                labour: {
                    name: "asc",
                },
            },
        });

        return NextResponse.json({ success: true, sheets });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Error fetching attendance sheets:", errorMessage);
        return NextResponse.json(
            { error: "Failed to fetch attendance sheets" },
            { status: 500 }
        );
    }
}

// POST /api/attendance-sheets - Create attendance sheets for labours
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { siteId, month, year, labours } = body;

        if (!siteId || !month || !year || !labours || !Array.isArray(labours)) {
            return NextResponse.json(
                { error: "siteId, month, year, and labours array are required" },
                { status: 400 }
            );
        }

        // Verify site exists
        const site = await prisma.site.findUnique({
            where: { id: siteId },
        });

        if (!site) {
            return NextResponse.json({ error: "Site not found" }, { status: 404 });
        }

        // Use transaction for batch operations to avoid N+1 queries
        const createdSheets = await prisma.$transaction(async (tx) => {
            const sheets = [];

            for (const labourData of labours) {
                const { labourId, dailyRate } = labourData;

                // Check if sheet already exists
                const existingSheet = await tx.attendanceSheet.findUnique({
                    where: {
                        labourId_month_year_siteId: {
                            labourId,
                            month: parseInt(month),
                            year: parseInt(year),
                            siteId,
                        },
                    },
                    include: {
                        labour: true,
                        transactions: true,
                    },
                });

                if (existingSheet) {
                    sheets.push(existingSheet);
                    continue;
                }

                // Get opening balance from previous month
                const openingBalance = await getOpeningBalance(
                    labourId,
                    parseInt(month),
                    parseInt(year),
                    siteId
                );

                // Create new sheet with 31 zeros
                const attendanceJson = Array(31).fill(0);

                const newSheet = await tx.attendanceSheet.create({
                    data: {
                        labourId,
                        month: parseInt(month),
                        year: parseInt(year),
                        siteId,
                        attendanceJson,
                        dailyRate: dailyRate || 500,
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
                    include: {
                        labour: true,
                        transactions: true,
                    },
                });

                sheets.push(newSheet);
            }

            return sheets;
        });

        return NextResponse.json({ success: true, sheets: createdSheets });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Error creating attendance sheets:", errorMessage);
        return NextResponse.json(
            { error: "Failed to create attendance sheets" },
            { status: 500 }
        );
    }
}
