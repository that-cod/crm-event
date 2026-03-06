import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageInventory } from "@/lib/permissions";

// POST /api/sites/[id]/deploy - Deploy more items to an existing site
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !canManageInventory(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await request.json();
        const { deployedItems } = body as {
            deployedItems: {
                itemId: string;
                quantityDeployed: number;
                shiftType: "WAREHOUSE" | "SITE";
                expectedReturnDate?: string;
                notes?: string;
            }[];
        };

        if (!deployedItems || deployedItems.length === 0) {
            return NextResponse.json({ error: "No items provided" }, { status: 400 });
        }

        // Verify site exists
        const site = await prisma.site.findUnique({ where: { id: params.id } });
        if (!site) {
            return NextResponse.json({ error: "Site not found" }, { status: 404 });
        }

        // Batch-validate all item quantities
        const itemIds = deployedItems.map((di) => di.itemId);
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
                        error: `Insufficient stock for "${item.name}". Available: ${item.quantityAvailable}, Requested: ${deployedItem.quantityDeployed}`,
                    },
                    { status: 400 }
                );
            }
        }

        // Deploy in a transaction: create SiteInventory records + decrement stock
        await prisma.$transaction(async (tx) => {
            // For each item, check if there's already an active deployment for this site+item
            // If yes, update quantity; if no, create new record
            for (const deployedItem of deployedItems) {
                const existing = await tx.siteInventory.findFirst({
                    where: {
                        siteId: params.id,
                        itemId: deployedItem.itemId,
                        actualReturnDate: null,
                    },
                });

                if (existing) {
                    // Add to existing deployment
                    const additionalQty = deployedItem.quantityDeployed;
                    await tx.siteInventory.update({
                        where: { id: existing.id },
                        data: {
                            quantityDeployed: { increment: additionalQty },
                            notes: deployedItem.notes
                                ? `${existing.notes ? existing.notes + "; " : ""}${deployedItem.notes}`
                                : existing.notes,
                        },
                    });
                } else {
                    // Create new deployment record
                    await tx.siteInventory.create({
                        data: {
                            siteId: params.id,
                            itemId: deployedItem.itemId,
                            quantityDeployed: deployedItem.quantityDeployed,
                            shiftType: deployedItem.shiftType ?? "SITE",
                            expectedReturnDate: deployedItem.expectedReturnDate
                                ? new Date(deployedItem.expectedReturnDate)
                                : null,
                            notes: deployedItem.notes,
                        },
                    });
                }

                // Decrement available stock
                await tx.item.update({
                    where: { id: deployedItem.itemId },
                    data: { quantityAvailable: { decrement: deployedItem.quantityDeployed } },
                });
            }
        });

        return NextResponse.json({
            success: true,
            message: `${deployedItems.length} item(s) deployed to site`,
        });
    } catch (error) {
        console.error("Error deploying items to site:", error);
        return NextResponse.json({ error: "Failed to deploy items" }, { status: 500 });
    }
}
