import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers } from "@/lib/permissions";
import { z } from "zod";

// Validation schema for company settings
const updateCompanySettingsSchema = z.object({
    companyName: z.string().min(1, "Company name is required").max(255),
    tagline: z.string().max(500).optional().nullable(),
    registeredOffice: z.string().max(1000).optional().nullable(),
    corporateOffice: z.string().max(1000).optional().nullable(),
    godownAddress: z.string().max(1000).optional().nullable(),
    gstin: z.string().max(50).optional().nullable(),
    pan: z.string().max(20).optional().nullable(),
    email: z.string().email("Invalid email").max(100).optional().nullable(),
    phone: z.string().max(50).optional().nullable(),
    logoUrl: z.string().url("Invalid URL").max(500).optional().nullable(),
    sellerState: z.string().max(100).optional().nullable(),
    sellerStateCode: z.string().max(10).optional().nullable(),
});

// GET /api/settings/company - Fetch company settings
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get or create default settings
        let settings = await prisma.companySettings.findUnique({
            where: { id: "default" },
        });

        // If no settings exist, create default
        if (!settings) {
            settings = await prisma.companySettings.create({
                data: {
                    id: "default",
                    companyName: "YOUR COMPANY NAME",
                    tagline: "Event Management & Tent Rental Services",
                },
            });
        }

        return NextResponse.json(settings);
    } catch (error) {
        console.error("Error fetching company settings:", error);
        return NextResponse.json(
            { error: "Failed to fetch company settings" },
            { status: 500 }
        );
    }
}

// PUT /api/settings/company - Update company settings
export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !canManageUsers(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await request.json();

        // Validate input
        const result = updateCompanySettingsSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400 }
            );
        }

        const settings = await prisma.companySettings.upsert({
            where: { id: "default" },
            update: result.data,
            create: {
                id: "default",
                ...result.data,
            },
        });

        return NextResponse.json(settings);
    } catch (error) {
        console.error("Error updating company settings:", error);
        return NextResponse.json(
            { error: "Failed to update company settings" },
            { status: 500 }
        );
    }
}
