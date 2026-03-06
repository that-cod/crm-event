import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageInventory } from "@/lib/permissions";

// The 7 tent kit definitions matching the actual DB item naming patterns from the migration script
const TENT_KIT_DEFINITIONS = [
    {
        name: "Full Frame Tent",
        subcategoryPattern: "14*28 Full Frame",
        componentPatterns: [
            { nameContains: "Full Frame Inner", type: "INNER", qtyPerKit: 1 },
            { nameContains: "Full Frame Carpet", type: "CARPET", qtyPerKit: 4 },
            { nameContains: "Full Frame Connector", type: "PIPES", qtyPerKit: 6 },
            { nameContains: "Full Frame Outer", type: "OUTER", qtyPerKit: 1 },
            { nameContains: "Full Frame Socket", type: "SOCKETS", qtyPerKit: 1 },
        ],
    },
    {
        name: "Half Frame Tent",
        subcategoryPattern: "14*28 Half Frame",
        componentPatterns: [
            { nameContains: "Half Frame Inner", type: "INNER", qtyPerKit: 1 },
            { nameContains: "Half Frame Carpet", type: "CARPET", qtyPerKit: 4 },
            { nameContains: "Half Frame Connector", type: "PIPES", qtyPerKit: 6 },
            { nameContains: "Half Frame Outer", type: "OUTER", qtyPerKit: 1 },
            { nameContains: "Half Frame Socket", type: "SOCKETS", qtyPerKit: 1 },
        ],
    },
    {
        name: "18*22 Tent",
        subcategoryPattern: "18*22",
        componentPatterns: [
            { nameContains: "18*22 Inner", type: "INNER", qtyPerKit: 1 },
            { nameContains: "18*22 Outer", type: "OUTER", qtyPerKit: 1 },
            { nameContains: "18*22 Carpet", type: "CARPET", qtyPerKit: 4 },
            { nameContains: "18*22 Connector", type: "PIPES", qtyPerKit: 1 },
            { nameContains: "18*22 Socket", type: "SOCKETS", qtyPerKit: 1 },
        ],
    },
    {
        name: "24*24 Tent",
        subcategoryPattern: "24*24",
        componentPatterns: [
            { nameContains: "24*24 Inner", type: "INNER", qtyPerKit: 1 },
            { nameContains: "24*24 Outer", type: "OUTER", qtyPerKit: 1 },
            { nameContains: "24*24 Carpet Large", type: "CARPET_LARGE", qtyPerKit: 1 },
            { nameContains: "24*24 Carpet Small", type: "CARPET_SMALL", qtyPerKit: 2 },
            { nameContains: "24*24 Connector", type: "PIPES", qtyPerKit: 1 },
            { nameContains: "24*24 Socket", type: "SOCKETS", qtyPerKit: 1 },
        ],
    },
    {
        name: "Canopy Tent",
        subcategoryPattern: "Canopy",
        componentPatterns: [
            { nameContains: "Canopy Cloth", type: "CLOTH", qtyPerKit: 1 },
            { nameContains: "Canopy Pillar", type: "PILLARS", qtyPerKit: 1 },
            { nameContains: "Canopy Hinge", type: "HINGES", qtyPerKit: 1 },
        ],
    },
    {
        name: "Dining Tent 15*30ft",
        subcategoryPattern: "Dining Tent 15*30",
        componentPatterns: [
            { nameContains: "Dining 15x30 Cloth", type: "CLOTH", qtyPerKit: 1 },
            { nameContains: "Dining 15x30 Pillar", type: "PILLARS", qtyPerKit: 1 },
            { nameContains: "Dining 15x30 Hinge", type: "HINGES", qtyPerKit: 1 },
        ],
    },
    {
        name: "Dining Tent 30*60ft",
        subcategoryPattern: "Dining Tent 30*60",
        componentPatterns: [
            { nameContains: "Dining 30x60 Cloth", type: "CLOTH", qtyPerKit: 1 },
            { nameContains: "Dining 30x60 Pillar", type: "PILLARS", qtyPerKit: 1 },
            { nameContains: "Dining 30x60 Hinge", type: "HINGES", qtyPerKit: 1 },
        ],
    },
];

/**
 * POST /api/tent-kits/setup-migration
 * Creates BundleTemplate records for all tent kit types from existing DB items.
 * Safe to run multiple times – skips already-existing kits.
 */
export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !canManageInventory(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get Tents category
        const tentsCategory = await prisma.category.findFirst({
            where: { name: { contains: "Tent", mode: "insensitive" } },
        });

        if (!tentsCategory) {
            return NextResponse.json({ error: "Tents category not found in database" }, { status: 404 });
        }

        const results: {
            kitName: string;
            status: "created" | "skipped" | "partial";
            componentsFound: number;
            componentsMissing: string[];
        }[] = [];

        for (const kitDef of TENT_KIT_DEFINITIONS) {
            // Skip if already exists
            const existing = await prisma.bundleTemplate.findUnique({ where: { name: kitDef.name } });
            if (existing) {
                results.push({ kitName: kitDef.name, status: "skipped", componentsFound: 0, componentsMissing: [] });
                continue;
            }

            // Find the subcategory
            const subcategory = await prisma.subcategory.findFirst({
                where: {
                    categoryId: tentsCategory.id,
                    name: { contains: kitDef.subcategoryPattern, mode: "insensitive" },
                },
            });

            // Find component items
            const componentIds: { itemId: string; quantityPerBaseUnit: number }[] = [];
            const missing: string[] = [];

            for (const comp of kitDef.componentPatterns) {
                const item = await prisma.item.findFirst({
                    where: {
                        name: { contains: comp.nameContains, mode: "insensitive" },
                        isKitComponent: true,
                    },
                });

                if (item) {
                    componentIds.push({ itemId: item.id, quantityPerBaseUnit: comp.qtyPerKit });
                } else {
                    // Also try without isKitComponent filter (in case migration didn't set the flag)
                    const itemAny = await prisma.item.findFirst({
                        where: {
                            name: { contains: comp.nameContains, mode: "insensitive" },
                            categoryId: tentsCategory.id,
                        },
                    });
                    if (itemAny) {
                        componentIds.push({ itemId: itemAny.id, quantityPerBaseUnit: comp.qtyPerKit });
                        // Mark it as kit component
                        await prisma.item.update({
                            where: { id: itemAny.id },
                            data: { isKitComponent: true, componentType: comp.type },
                        });
                    } else {
                        missing.push(comp.nameContains);
                    }
                }
            }

            // Create virtual base item for the kit
            const baseItem = await prisma.item.create({
                data: {
                    categoryId: tentsCategory.id,
                    subcategoryId: subcategory?.id || null,
                    name: kitDef.name,
                    description: `Complete ${kitDef.name} kit`,
                    quantityAvailable: 0,
                    condition: "GOOD",
                    isKitComponent: false,
                },
            });

            // Create BundleTemplate
            if (componentIds.length > 0) {
                await prisma.bundleTemplate.create({
                    data: {
                        name: kitDef.name,
                        description: `${kitDef.name} - Complete Kit`,
                        baseItemId: baseItem.id,
                        items: {
                            createMany: { data: componentIds },
                        },
                    },
                });
            }

            results.push({
                kitName: kitDef.name,
                status: missing.length > 0 ? "partial" : "created",
                componentsFound: componentIds.length,
                componentsMissing: missing,
            });
        }

        const created = results.filter((r) => r.status === "created").length;
        const skipped = results.filter((r) => r.status === "skipped").length;
        const partial = results.filter((r) => r.status === "partial").length;

        return NextResponse.json({
            success: true,
            summary: { created, skipped, partial },
            details: results,
        });
    } catch (error) {
        console.error("Error running tent kit migration:", error);
        return NextResponse.json({ error: "Migration failed", details: String(error) }, { status: 500 });
    }
}
