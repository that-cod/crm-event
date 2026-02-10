import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/labours - Get all labours for a site
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const siteId = searchParams.get("siteId");

        if (!siteId) {
            return NextResponse.json(
                { error: "siteId is required" },
                { status: 400 }
            );
        }

        const labours = await prisma.labour.findMany({
            where: { siteId },
            include: {
                site: true,
                _count: {
                    select: {
                        attendanceSheets: true,
                        attendanceRecords: true,
                    },
                },
            },
            orderBy: { name: "asc" },
        });

        return NextResponse.json({ success: true, labours });
    } catch (error) {
        console.error("Error fetching labours:", error);
        return NextResponse.json(
            { error: "Failed to fetch labours" },
            { status: 500 }
        );
    }
}

// POST /api/labours - Create a new labour
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name, phone, address, defaultDailyRate, siteId } = body;

        if (!name || !siteId) {
            return NextResponse.json(
                { error: "name and siteId are required" },
                { status: 400 }
            );
        }

        // Check if labour already exists for this site
        const existing = await prisma.labour.findUnique({
            where: {
                name_siteId: {
                    name,
                    siteId,
                },
            },
        });

        if (existing) {
            return NextResponse.json(
                { error: "Labour with this name already exists at this site" },
                { status: 409 }
            );
        }

        // Verify site exists
        const site = await prisma.site.findUnique({
            where: { id: siteId },
        });

        if (!site) {
            return NextResponse.json({ error: "Site not found" }, { status: 404 });
        }

        const labour = await prisma.labour.create({
            data: {
                name,
                phone: phone || null,
                address: address || null,
                defaultDailyRate: defaultDailyRate || 500,
                siteId,
            },
            include: {
                site: true,
            },
        });

        return NextResponse.json({ success: true, labour }, { status: 201 });
    } catch (error) {
        console.error("Error creating labour:", error);
        return NextResponse.json(
            { error: "Failed to create labour" },
            { status: 500 }
        );
    }
}
