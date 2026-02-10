import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/attendance-sheets/pdf - Generate PDF payroll report
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

        // Get all sheets for the month
        const sheets = await prisma.attendanceSheet.findMany({
            where: {
                siteId,
                month: parseInt(month),
                year: parseInt(year),
            },
            include: {
                labour: true,
                site: true,
            },
            orderBy: {
                labour: {
                    name: "asc",
                },
            },
        });

        if (sheets.length === 0) {
            return NextResponse.json(
                { error: "No attendance sheets found for this period" },
                { status: 404 }
            );
        }

        // Get site and company info
        const site = sheets[0].site;
        const companySettings = await prisma.companySettings.findUnique({
            where: { id: "default" },
        });

        // Prepare data for PDF
        const monthNames = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
        ];

        const pdfData = {
            companyName: companySettings?.companyName || "Company Name",
            siteName: site.name,
            month: monthNames[parseInt(month) - 1],
            year: parseInt(year),
            labours: sheets.map((sheet, index) => ({
                serialNo: index + 1,
                name: sheet.labour.name,
                totalShifts: sheet.totalShifts,
                rate: sheet.dailyRate,
                wages: sheet.wages,
                incentive: sheet.incentive,
                netWages: sheet.netWages,
                openingBalance: sheet.openingBalance,
                advance: sheet.totalAdvance,
                paid: sheet.totalPaid,
                netPayable: sheet.netPayable,
                balanceDue: sheet.balanceDue,
            })),
            totals: {
                totalPayable: sheets.reduce((sum, s) => sum + s.netPayable, 0),
                totalPaid: sheets.reduce((sum, s) => sum + s.totalPaid, 0),
                totalBalance: sheets.reduce((sum, s) => sum + s.balanceDue, 0),
            },
        };

        // For now, return JSON data
        // TODO: Implement actual PDF generation using jsPDF or similar
        return NextResponse.json({
            success: true,
            pdfData,
            message:
                "PDF generation endpoint ready. Frontend will handle PDF creation.",
        });
    } catch (error) {
        console.error("Error generating PDF data:", error);
        return NextResponse.json(
            { error: "Failed to generate PDF data" },
            { status: 500 }
        );
    }
}
