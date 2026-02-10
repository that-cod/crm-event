import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageInventory } from "@/lib/permissions";
import { createSiteSchema, validateRequest } from "@/lib/validations";

// GET /api/sites - List all sites
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sites = await prisma.site.findMany({
      where: {
        isActive: true, // Only fetch active sites
      },
      include: {
        _count: {
          select: {
            projects: true,
            siteInventory: true,
            labourAttendances: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(sites); // Return array directly
  } catch (error) {
    console.error("Error fetching sites:", error);
    return NextResponse.json(
      { error: "Failed to fetch sites" },
      { status: 500 }
    );
  }
}

// POST /api/sites - Create new site
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !canManageInventory(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();

    // Validate input with Zod
    const validation = validateRequest(createSiteSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { name, location, description, isActive, deployedItems } = validation.data;

    // Check if site name already exists
    const existing = await prisma.site.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Site with this name already exists" },
        { status: 400 }
      );
    }

    // If items provided, validate quantities available (OPTIMIZED: batch query)
    if (deployedItems && deployedItems.length > 0) {
      const itemIds = deployedItems.map(di => di.itemId);
      const itemsData = await prisma.item.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, quantityAvailable: true, name: true },
      });

      // Create lookup map
      const itemMap = new Map(itemsData.map(i => [i.id, i]));

      // Validate all items
      for (const deployedItem of deployedItems) {
        const item = itemMap.get(deployedItem.itemId);

        if (!item) {
          return NextResponse.json(
            { error: `Item not found: ${deployedItem.itemId}` },
            { status: 400 }
          );
        }

        if (item.quantityAvailable < deployedItem.quantityDeployed) {
          return NextResponse.json(
            {
              error: `Insufficient quantity for ${item.name}. Available: ${item.quantityAvailable}, Requested: ${deployedItem.quantityDeployed}`
            },
            { status: 400 }
          );
        }
      }
    }

    // Create site and deploy items in a transaction
    const site = await prisma.$transaction(async (tx) => {
      // 1. Create site
      const newSite = await tx.site.create({
        data: {
          name,
          location,
          description,
          isActive,
        },
      });

      // 2. If items provided, create SiteInventory records and update quantities
      if (deployedItems && deployedItems.length > 0) {
        // Create SiteInventory records
        await tx.siteInventory.createMany({
          data: deployedItems.map((item) => ({
            siteId: newSite.id,
            itemId: item.itemId,
            quantityDeployed: item.quantityDeployed,
            shiftType: item.shiftType,
            expectedReturnDate: item.expectedReturnDate
              ? new Date(item.expectedReturnDate)
              : null,
            notes: item.notes,
          })),
        });

        // Update item quantities (decrease available quantity)
        for (const item of deployedItems) {
          await tx.item.update({
            where: { id: item.itemId },
            data: {
              quantityAvailable: {
                decrement: item.quantityDeployed,
              },
            },
          });
        }
      }

      return newSite;
    });

    return NextResponse.json(site, { status: 201 });
  } catch (error) {
    console.error("Error creating site:", error);
    return NextResponse.json(
      { error: "Failed to create site" },
      { status: 500 }
    );
  }
}

