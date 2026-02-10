import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/attendance-sheets/upload-csv - Parse CSV and create/update labours
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { csvData, siteId, month, year } = body;

        if (!csvData || !siteId || !month || !year) {
            return NextResponse.json(
                { error: "csvData, siteId, month, and year are required" },
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

        // Parse CSV data (expecting array of objects)
        // Format: [{ serialNo, name, rate, ... }]
        const parsedLabours = [];

        for (const row of csvData) {
            const { serialNo, name, rate } = row;

            if (!name) continue; // Skip empty rows

            // Check if labour exists
            const existingLabour = await prisma.labour.findUnique({
                where: {
                    name_siteId: {
                        name: name.trim(),
                        siteId,
                    },
                },
            });

            if (existingLabour) {
                // Update rate if different
                if (rate && existingLabour.defaultDailyRate !== parseFloat(rate)) {
                    await prisma.labour.update({
                        where: { id: existingLabour.id },
                        data: { defaultDailyRate: parseFloat(rate) },
                    });
                }

                parsedLabours.push({
                    serialNo,
                    name: name.trim(),
                    rate: parseFloat(rate) || existingLabour.defaultDailyRate,
                    existingLabourId: existingLabour.id,
                    isNew: false,
                });
            } else {
                // Create new labour
                const newLabour = await prisma.labour.create({
                    data: {
                        name: name.trim(),
                        defaultDailyRate: parseFloat(rate) || 500,
                        siteId,
                    },
                });

                parsedLabours.push({
                    serialNo,
                    name: name.trim(),
                    rate: parseFloat(rate) || 500,
                    existingLabourId: newLabour.id,
                    isNew: true,
                });
            }
        }

        return NextResponse.json({
            success: true,
            labours: parsedLabours,
            month,
            year,
            siteId,
        });
    } catch (error) {
        console.error("Error uploading CSV:", error);
        return NextResponse.json(
            { error: "Failed to upload CSV" },
            { status: 500 }
        );
    }
}
