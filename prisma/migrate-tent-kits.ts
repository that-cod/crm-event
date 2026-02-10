import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Tent kit definitions matching the user's structure
const TENT_KIT_DEFINITIONS = {
    FULL_FRAME: {
        name: 'Full Frame Tent',
        code: 'FULL_FRAME_TENT',
        subcategoryName: '14*28 Full Frame',
        components: [
            { oldPattern: '14*28 FF - Inner', newName: 'Full Frame Inner', type: 'INNER', qtyPerKit: 1 },
            { oldPattern: '14*28 FF - non woven carpet', newName: 'Full Frame Carpet 7.5x14', type: 'CARPET', qtyPerKit: 4 },
            { oldPattern: '14*28 FF - connector pipes', newName: 'Full Frame Connector Pipes 7ft', type: 'PIPES', qtyPerKit: 6 },
            { oldPattern: '14*28 FF - outer', newName: 'Full Frame Outer', type: 'OUTER', qtyPerKit: 1 },
            { oldPattern: '14*28 FF - Sockets', newName: 'Full Frame Socket Set (23 Brown)', type: 'SOCKETS', qtyPerKit: 1 },
        ]
    },
    HALF_FRAME: {
        name: 'Half Frame Tent',
        code: 'HALF_FRAME_TENT',
        subcategoryName: '14*28 Half Frame',
        components: [
            { oldPattern: '14*28 HF - Inner', newName: 'Half Frame Inner', type: 'INNER', qtyPerKit: 1 },
            { oldPattern: '14*28 HF - non woven carpet', newName: 'Half Frame Carpet 7.5x14', type: 'CARPET', qtyPerKit: 4 },
            { oldPattern: '14*28 HF - connector pipes', newName: 'Half Frame Connector Pipes 7ft', type: 'PIPES', qtyPerKit: 6 },
            { oldPattern: '14*28 HF - outer', newName: 'Half Frame Outer', type: 'OUTER', qtyPerKit: 1 },
            { oldPattern: '14*28 HF - Sockets', newName: 'Half Frame Socket Set (29 White)', type: 'SOCKETS', qtyPerKit: 1 },
        ]
    },
    TENT_18X22: {
        name: '18*22 Tent',
        code: 'TENT_18X22',
        subcategoryName: '18*22',
        components: [
            { oldPattern: '18*22 - connector pipes', newName: '18*22 Connector Pipes', type: 'PIPES', qtyPerKit: 1 },
            { oldPattern: '18*22 - inner', newName: '18*22 Inner', type: 'INNER', qtyPerKit: 1 },
            { oldPattern: '18*22 - outer', newName: '18*22 Outer', type: 'OUTER', qtyPerKit: 1 },
            { oldPattern: '18*22 - non woven carpet', newName: '18*22 Carpet 6x12', type: 'CARPET', qtyPerKit: 4 },
            { oldPattern: '18*22 - Sockets', newName: '18*22 Sockets', type: 'SOCKETS', qtyPerKit: 1 },
        ]
    },
    TENT_24X24: {
        name: '24*24 Tent',
        code: 'TENT_24X24',
        subcategoryName: '24*24',
        components: [
            { oldPattern: '24*24 - connector pipes', newName: '24*24 Connector Pipes', type: 'PIPES', qtyPerKit: 1 },
            { oldPattern: '24*24 - inner', newName: '24*24 Inner', type: 'INNER', qtyPerKit: 1 },
            { oldPattern: '24*24 - outer', newName: '24*24 Outer', type: 'OUTER', qtyPerKit: 1 },
            { oldPattern: '24*24 - non woven carpet (12ft*24ft)', newName: '24*24 Carpet Large 12x24', type: 'CARPET_LARGE', qtyPerKit: 1 },
            { oldPattern: '24*24 - non woven carpet (6ft)', newName: '24*24 Carpet Small 6ft', type: 'CARPET_SMALL', qtyPerKit: 2 },
            { oldPattern: '24*24 - Sockets', newName: '24*24 Sockets', type: 'SOCKETS', qtyPerKit: 1 },
        ]
    },
    CANOPY: {
        name: 'Canopy Tent',
        code: 'CANOPY_TENT',
        subcategoryName: 'Canopy',
        components: [
            { oldPattern: 'Canopy - Cloth', newName: 'Canopy Cloth 12x12', type: 'CLOTH', qtyPerKit: 1 },
            { oldPattern: 'Canopy - Pillars', newName: 'Canopy Pillars', type: 'PILLARS', qtyPerKit: 1 },
            { oldPattern: 'Canopy - Hinges', newName: 'Canopy Hinges', type: 'HINGES', qtyPerKit: 1 },
        ]
    },
    DINING_15X30: {
        name: 'Dining Tent 15*30ft',
        code: 'DINING_TENT_15X30',
        subcategoryName: 'Dining Tent 15*30 ft',
        components: [
            { oldPattern: 'Dining Tent 15*30 ft - Cloth', newName: 'Dining 15x30 Cloth', type: 'CLOTH', qtyPerKit: 1 },
            { oldPattern: 'Dining Tent 15*30 ft - Pillars', newName: 'Dining 15x30 Pillars', type: 'PILLARS', qtyPerKit: 1 },
            { oldPattern: 'Dining Tent 15*30 ft - Hinges', newName: 'Dining 15x30 Hinges', type: 'HINGES', qtyPerKit: 1 },
        ]
    },
    DINING_30X60: {
        name: 'Dining Tent 30*60ft',
        code: 'DINING_TENT_30X60',
        subcategoryName: 'Dining Tent 30*60 ft',
        components: [
            { oldPattern: 'Dining Tent 30*60 ft - Cloth', newName: 'Dining 30x60 Cloth', type: 'CLOTH', qtyPerKit: 1 },
            { oldPattern: 'Dining Tent 30*60 ft - Pillars', newName: 'Dining 30x60 Pillars', type: 'PILLARS', qtyPerKit: 1 },
            { oldPattern: 'Dining Tent 30*60 ft - Hinges', newName: 'Dining 30x60 Hinges', type: 'HINGES', qtyPerKit: 1 },
        ]
    },
};

async function main() {
    console.log('🚀 Starting tent kit migration...\n');

    // Get Tents category
    const tentsCategory = await prisma.category.findUnique({
        where: { name: 'Tents' }
    });

    if (!tentsCategory) {
        console.error('❌ Tents category not found!');
        return;
    }

    console.log(`✓ Found Tents category: ${tentsCategory.id}\n`);

    // Process each tent kit type
    for (const [kitKey, kitDef] of Object.entries(TENT_KIT_DEFINITIONS)) {
        console.log(`\n📦 Processing ${kitDef.name}...`);
        console.log('─'.repeat(50));

        // Find or create subcategory
        let subcategory = await prisma.subcategory.findFirst({
            where: {
                categoryId: tentsCategory.id,
                name: kitDef.subcategoryName
            }
        });

        if (!subcategory) {
            subcategory = await prisma.subcategory.create({
                data: {
                    categoryId: tentsCategory.id,
                    name: kitDef.subcategoryName,
                    description: `${kitDef.name} components`
                }
            });
            console.log(`  ✓ Created subcategory: ${kitDef.subcategoryName}`);
        } else {
            console.log(`  ✓ Found subcategory: ${kitDef.subcategoryName}`);
        }

        const componentIds: { id: string; qty: number }[] = [];

        // Process each component
        for (const comp of kitDef.components) {
            // Find item by pattern
            const item = await prisma.item.findFirst({
                where: {
                    categoryId: tentsCategory.id,
                    name: {
                        contains: comp.oldPattern.split(' - ')[1] || comp.oldPattern,
                        mode: 'insensitive'
                    }
                }
            });

            if (item) {
                // Update item: rename and mark as kit component
                await prisma.item.update({
                    where: { id: item.id },
                    data: {
                        name: comp.newName,
                        subcategoryId: subcategory.id,
                        isKitComponent: true,
                        kitType: kitDef.code,
                        componentType: comp.type,
                        quantityPerKit: comp.qtyPerKit,
                    }
                });

                componentIds.push({ id: item.id, qty: comp.qtyPerKit });
                console.log(`    ✓ Updated: ${comp.newName} (qty/kit: ${comp.qtyPerKit})`);
            } else {
                console.log(`    ⚠  Not found: ${comp.oldPattern}`);
            }
        }

        // Create virtual "tent kit" item
        const virtualTentItem = await prisma.item.create({
            data: {
                categoryId: tentsCategory.id,
                subcategoryId: subcategory.id,
                name: kitDef.name,
                description: `Complete ${kitDef.name} kit`,
                quantityAvailable: 0, // Will be calculated from components
                condition: 'GOOD',
                isKitComponent: false, // This is the kit itself, not a component
            }
        });

        console.log(`  ✓ Created virtual tent item: ${kitDef.name}`);

        // Create bundle template
        if (componentIds.length > 0) {
            await prisma.bundleTemplate.create({
                data: {
                    name: kitDef.name,
                    description: `${kitDef.name} - Complete Kit`,
                    baseItemId: virtualTentItem.id,
                    items: {
                        createMany: {
                            data: componentIds.map(c => ({
                                itemId: c.id,
                                quantityPerBaseUnit: c.qty
                            }))
                        }
                    }
                }
            });
            console.log(`  ✓ Created bundle template with ${componentIds.length} components`);
        }

        console.log(`✅ ${kitDef.name} migration complete!`);
    }

    // Handle Staff Tent (no components - just rename)
    console.log(`\n📦 Processing Staff Tent...`);
    console.log('─'.repeat(50));

    const staffTent = await prisma.item.findFirst({
        where: {
            categoryId: tentsCategory.id,
            name: { contains: 'Staff Tent', mode: 'insensitive' }
        }
    });

    if (staffTent) {
        let staffSubcategory = await prisma.subcategory.findFirst({
            where: {
                categoryId: tentsCategory.id,
                name: 'Staff Tent'
            }
        });

        if (!staffSubcategory) {
            staffSubcategory = await prisma.subcategory.create({
                data: {
                    categoryId: tentsCategory.id,
                    name: 'Staff Tent',
                    description: 'Ready-made staff tents'
                }
            });
        }

        await prisma.item.update({
            where: { id: staffTent.id },
            data: {
                name: 'Staff Tent 12x24',
                subcategoryId: staffSubcategory.id,
                description: 'Complete ready-made staff tent (12ft x 24ft)',
                isKitComponent: false,
            }
        });
        console.log(`  ✓ Updated: Staff Tent 12x24 (ready-made)`);
    }

    console.log('\n✨ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log('─'.repeat(50));

    const kits = await prisma.bundleTemplate.count();
    const components = await prisma.item.count({
        where: { isKitComponent: true }
    });

    console.log(`  Tent Kits Created: ${kits}`);
    console.log(`  Kit Components: ${components}`);
    console.log('─'.repeat(50));
}

main()
    .catch((e) => {
        console.error('❌ Migration error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
