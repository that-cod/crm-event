import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { canCreateProjects } from "@/lib/permissions";

// Force dynamic rendering for this route (uses authentication)
export const dynamic = 'force-dynamic';

// GET /api/bundle-templates - Get bundle templates by base item
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const baseItemId = searchParams.get("baseItemId");

    const where: Prisma.BundleTemplateWhereInput = {};
    if (baseItemId) where.baseItemId = baseItemId;

    const templates = await prisma.bundleTemplate.findMany({
      where,
      include: {
        baseItem: true,
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching bundle templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch bundle templates" },
      { status: 500 }
    );
  }
}

// POST /api/bundle-templates - Create a new bundle template
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !canCreateProjects(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, baseItemId, items } = body;

    // Validate required fields
    if (!name || !baseItemId) {
      return NextResponse.json(
        { error: "Name and base item are required" },
        { status: 400 }
      );
    }

    // Check if template name already exists
    const existing = await prisma.bundleTemplate.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A template with this name already exists" },
        { status: 400 }
      );
    }

    // Verify base item exists
    const baseItem = await prisma.item.findUnique({
      where: { id: baseItemId },
    });

    if (!baseItem) {
      return NextResponse.json(
        { error: "Base item not found" },
        { status: 400 }
      );
    }

    // Create template with bundled items
    const template = await prisma.bundleTemplate.create({
      data: {
        name,
        description: description || null,
        baseItemId,
        items: {
          create: (items || []).map((item: { itemId: string; quantityPerBaseUnit?: number }) => ({
            itemId: item.itemId,
            quantityPerBaseUnit: item.quantityPerBaseUnit || 1,
          })),
        },
      },
      include: {
        baseItem: true,
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Error creating bundle template:", error);
    const message = error instanceof Error ? error.message : "Failed to create bundle template";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
