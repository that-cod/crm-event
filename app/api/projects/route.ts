import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateProjects } from "@/lib/permissions";
import { createProjectSchema, validateRequest } from "@/lib/validations";
import { Prisma, ProjectStatus } from "@prisma/client";

// GET /api/projects
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Prisma.ProjectWhereInput = {};
    if (status && Object.values(ProjectStatus).includes(status as ProjectStatus)) {
      where.status = status as ProjectStatus;
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        _count: {
          select: {
            stockMovements: true,
            challans: true,
          },
        },
      },
      orderBy: {
        startDate: "desc",
      },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST /api/projects
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !canCreateProjects(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();

    // Validate input with Zod
    const validation = validateRequest(createProjectSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { name, type, location, siteId, startDate, endDate, status } = validation.data;
    const deployedItems = body.deployedItems || [];

    // If items provided, validate quantities available
    if (deployedItems && deployedItems.length > 0) {
      const itemIds = deployedItems.map((di: any) => di.itemId);
      const itemsData = await prisma.item.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, quantityAvailable: true, name: true },
      });

      const itemMap = new Map(itemsData.map((i) => [i.id, i]));

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
              error: `Insufficient quantity for ${item.name}. Available: ${item.quantityAvailable}, Requested: ${deployedItem.quantityDeployed}`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Create project and deploy items in a transaction
    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          name,
          type,
          location,
          siteId: siteId || null,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          status,
        },
      });

      // If items provided, create stock movements and update quantities
      if (deployedItems && deployedItems.length > 0) {
        for (const item of deployedItems) {
          const currentItem = await tx.item.findUnique({
            where: { id: item.itemId },
          });

          if (!currentItem) continue;

          const previousQuantity = currentItem.quantityAvailable;
          const newQuantity = previousQuantity - item.quantityDeployed;

          // Create stock movement
          await tx.stockMovement.create({
            data: {
              itemId: item.itemId,
              projectId: newProject.id,
              movementType: "OUTWARD",
              quantity: item.quantityDeployed,
              previousQuantity,
              newQuantity,
              notes: item.notes || `Deployed to project: ${name}`,
              performedByUserId: session.user.id,
            },
          });

          // Update item quantity
          await tx.item.update({
            where: { id: item.itemId },
            data: { quantityAvailable: newQuantity },
          });
        }
      }

      return newProject;
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}

