import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageInventory } from "@/lib/permissions";
import { z } from "zod";
import { handleApiError } from "@/lib/api-error-handler";

const deployKitSchema = z.object({
    quantity: z.number().int().positive("Quantity must be greater than 0"),
    siteId: z.string().cuid("Invalid site ID"),
    shiftType: z.enum(["WAREHOUSE", "SITE"]),
    expectedReturnDate: z.string().datetime().optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
});

// POST /api/tent-kits/[id]/deploy - Deploy tent kits to a site
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    let session = null;
    let deployContext = {};

    try {
        session = await getServerSession(authOptions);
        if (!session || !canManageInventory(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await request.json();
        const validation = deployKitSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.errors[0].message },
                { status: 400 }
            );
        }

        const { quantity, siteId, shiftType, expectedReturnDate, notes } = validation.data;
        deployContext = { kitId: params.id, quantity, siteId };

        // Get bundle template with components
        const kit = await prisma.bundleTemplate.findUnique({
            where: { id: params.id },
            include: {
                baseItem: true,
                items: {
                    include: {
                        item: true,
                    }
                }
            }
        });

        if (!kit) {
            return NextResponse.json({ error: "Tent kit not found" }, { status: 404 });
        }

        // Verify site exists
        const site = await prisma.site.findUnique({
            where: { id: siteId }
        });

        if (!site) {
            return NextResponse.json({ error: "Site not found" }, { status: 404 });
        }

        // Check availability for all components
        const insufficientComponents: string[] = [];

        for (const bundleItem of kit.items) {
            const required = quantity * bundleItem.quantityPerBaseUnit;
            const available = bundleItem.item.quantityAvailable;

            if (available < required) {
                insufficientComponents.push(
                    `${bundleItem.item.name}: need ${required}, have ${available} (short ${required - available})`
                );
            }
        }

        if (insufficientComponents.length > 0) {
            return NextResponse.json(
                {
                    error: "Insufficient components to deploy",
                    details: insufficientComponents
                },
                { status: 400 }
            );
        }

        // Deploy kits in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Deploy each component
            for (const bundleItem of kit.items) {
                const qtyToDeploy = quantity * bundleItem.quantityPerBaseUnit;

                // Check if SiteInventory already exists for this item
                const existing = await tx.siteInventory.findUnique({
                    where: {
                        siteId_itemId: {
                            siteId,
                            itemId: bundleItem.itemId
                        }
                    }
                });

                if (existing) {
                    // Update existing deployment
                    await tx.siteInventory.update({
                        where: { id: existing.id },
                        data: {
                            quantityDeployed: {
                                increment: qtyToDeploy
                            }
                        }
                    });
                } else {
                    // Create new deployment
                    await tx.siteInventory.create({
                        data: {
                            siteId,
                            itemId: bundleItem.itemId,
                            quantityDeployed: qtyToDeploy,
                            shiftType,
                            expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
                            notes: notes || `${quantity} ${kit.name}(s) deployed`,
                        }
                    });
                }

                // Decrement available quantity
                await tx.item.update({
                    where: { id: bundleItem.itemId },
                    data: {
                        quantityAvailable: {
                            decrement: qtyToDeploy
                        }
                    }
                });
            }

            return { deployedKits: quantity };
        });

        return NextResponse.json({
            success: true,
            message: `Deployed ${quantity} ${kit.name}(s) to ${site.name}`,
            ...result
        });

    } catch (error: unknown) {
        return handleApiError(error, {
            operation: "deploy tent kits",
            userId: session?.user?.id,
            additionalInfo: deployContext,
        });
    }
}
