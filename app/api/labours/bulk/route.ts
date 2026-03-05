import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/labours/bulk - Bulk create/update labours from CSV data
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { siteId, labours } = body;

        if (!siteId || !labours || !Array.isArray(labours)) {
            return NextResponse.json(
                { error: "siteId and labours array are required" },
                { status: 400 }
            );
        }

        const site = await prisma.site.findUnique({ where: { id: siteId } });
        if (!site) {
            return NextResponse.json({ error: "Site not found" }, { status: 404 });
        }

        const results = [];
        let created = 0;
        let updated = 0;

        for (const labour of labours) {
            const { name, rate } = labour;
            if (!name?.trim()) continue;

            const parsedRate = parseFloat(rate) || 500;

            const existing = await prisma.labour.findUnique({
                where: { name_siteId: { name: name.trim(), siteId } },
            });

            if (existing) {
                if (parsedRate !== existing.defaultDailyRate) {
                    await prisma.labour.update({
                        where: { id: existing.id },
                        data: { defaultDailyRate: parsedRate },
                    });
                    updated++;
                }
                results.push({ id: existing.id, name: existing.name, rate: parsedRate, isNew: false });
            } else {
                const newLabour = await prisma.labour.create({
                    data: {
                        name: name.trim(),
                        defaultDailyRate: parsedRate,
                        siteId,
                    },
                });
                created++;
                results.push({ id: newLabour.id, name: newLabour.name, rate: parsedRate, isNew: true });
            }
        }

        return NextResponse.json({
            success: true,
            labours: results,
            count: results.length,
            created,
            updated,
        });
    } catch (error) {
        console.error("Error bulk creating labours:", error);
        const msg = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { error: `Failed to bulk create labours: ${msg}` },
            { status: 500 }
        );
    }
}
