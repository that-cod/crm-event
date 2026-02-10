import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Adding realistic sample data...\n');

    // Step 1: Update all items to have quantity = 40
    console.log('📦 Updating all items to quantity = 40...');
    await prisma.item.updateMany({
        data: {
            quantityAvailable: 40,
            weightPerUnit: 5.0, // Default 5kg per unit
        },
    });
    console.log('✅ All items updated to quantity 40\n');

    // Get admin user
    const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
    });

    if (!admin) {
        console.log('❌ No admin user found. Please run prisma db seed first.');
        return;
    }

    // Step 2: Create Projects
    console.log('📋 Creating sample projects...');

    const projects = await Promise.all([
        prisma.project.create({
            data: {
                name: 'Royal Wedding - Jaipur',
                location: 'City Palace, Jaipur, Rajasthan',
                status: 'ACTIVE',
                startDate: new Date('2026-02-01'),
                endDate: new Date('2026-02-05'),
            },
        }),
        prisma.project.create({
            data: {
                name: 'Corporate Summit - Gurgaon',
                location: 'DLF Cyber City, Gurgaon',
                status: 'ACTIVE',
                startDate: new Date('2026-02-10'),
                endDate: new Date('2026-02-12'),
            },
        }),
        prisma.project.create({
            data: {
                name: 'Desert Safari Camp - Pushkar',
                location: 'Pushkar Desert, Rajasthan',
                status: 'PLANNED',
                startDate: new Date('2026-03-01'),
                endDate: new Date('2026-03-10'),
            },
        }),
    ]);

    console.log(`✅ Created ${projects.length} projects\n`);

    // Step 3: Create Sites
    console.log('🏕️ Creating sample sites...');

    const sites = await Promise.all([
        prisma.site.create({
            data: {
                name: 'Jaipur Wedding Venue',
                location: 'City Palace Road, Jaipur - 302001',
                description: 'Main wedding venue with 25 luxury tents',
                isActive: true,
            },
        }),
        prisma.site.create({
            data: {
                name: 'Gurgaon Convention Center',
                location: 'Sector 29, Gurgaon - 122001',
                description: 'Corporate event site with 15 tents',
                isActive: true,
            },
        }),
        prisma.site.create({
            data: {
                name: 'Pushkar Desert Camp',
                location: 'Pushkar Highway, Rajasthan - 305022',
                description: 'Desert safari camp with 30 tents',
                isActive: true,
            },
        }),
        prisma.site.create({
            data: {
                name: 'Warehouse - Delhi',
                location: 'Okhla Industrial Area, Delhi - 110020',
                description: 'Main warehouse and storage facility',
                isActive: true,
            },
        }),
    ]);

    console.log(`✅ Created ${sites.length} sites\n`);

    // Step 4: Deploy items to sites
    console.log('📤 Deploying items to sites...');

    // Get items by category
    const tentItems = await prisma.item.findMany({
        where: { category: { name: 'Tents' } },
        take: 10,
    });

    const furnitureItems = await prisma.item.findMany({
        where: { category: { name: 'Furniture' } },
        take: 10,
    });

    const linenItems = await prisma.item.findMany({
        where: { category: { name: 'Linen' } },
        take: 8,
    });

    const sanitaryItems = await prisma.item.findMany({
        where: { category: { name: 'Sanitary' } },
        take: 6,
    });

    const electricalItems = await prisma.item.findMany({
        where: { category: { name: 'Electricals' } },
        take: 5,
    });

    // Deploy to Jaipur Wedding Venue (first site)
    const jaipurSite = sites[0];
    let deployCount = 0;

    for (const item of tentItems.slice(0, 5)) {
        await prisma.siteInventory.create({
            data: {
                siteId: jaipurSite.id,
                itemId: item.id,
                quantityDeployed: 10,
                shiftType: 'SITE',
                deployedDate: new Date(),
            },
        });
        // Reduce stock
        await prisma.item.update({
            where: { id: item.id },
            data: { quantityAvailable: { decrement: 10 } },
        });
        deployCount++;
    }

    for (const item of furnitureItems.slice(0, 5)) {
        await prisma.siteInventory.create({
            data: {
                siteId: jaipurSite.id,
                itemId: item.id,
                quantityDeployed: 15,
                shiftType: 'SITE',
                deployedDate: new Date(),
            },
        });
        await prisma.item.update({
            where: { id: item.id },
            data: { quantityAvailable: { decrement: 15 } },
        });
        deployCount++;
    }

    for (const item of linenItems.slice(0, 4)) {
        await prisma.siteInventory.create({
            data: {
                siteId: jaipurSite.id,
                itemId: item.id,
                quantityDeployed: 20,
                shiftType: 'SITE',
                deployedDate: new Date(),
            },
        });
        await prisma.item.update({
            where: { id: item.id },
            data: { quantityAvailable: { decrement: 20 } },
        });
        deployCount++;
    }

    console.log(`  ✓ Deployed ${deployCount} item types to ${jaipurSite.name}`);

    // Deploy to Gurgaon site
    const gurgaonSite = sites[1];
    deployCount = 0;

    for (const item of tentItems.slice(5, 8)) {
        await prisma.siteInventory.create({
            data: {
                siteId: gurgaonSite.id,
                itemId: item.id,
                quantityDeployed: 8,
                shiftType: 'SITE',
                deployedDate: new Date(),
            },
        });
        await prisma.item.update({
            where: { id: item.id },
            data: { quantityAvailable: { decrement: 8 } },
        });
        deployCount++;
    }

    for (const item of electricalItems.slice(0, 3)) {
        await prisma.siteInventory.create({
            data: {
                siteId: gurgaonSite.id,
                itemId: item.id,
                quantityDeployed: 12,
                shiftType: 'SITE',
                deployedDate: new Date(),
            },
        });
        await prisma.item.update({
            where: { id: item.id },
            data: { quantityAvailable: { decrement: 12 } },
        });
        deployCount++;
    }

    console.log(`  ✓ Deployed ${deployCount} item types to ${gurgaonSite.name}`);

    // Deploy to Pushkar site
    const pushkarSite = sites[2];
    deployCount = 0;

    for (const item of sanitaryItems.slice(0, 4)) {
        await prisma.siteInventory.create({
            data: {
                siteId: pushkarSite.id,
                itemId: item.id,
                quantityDeployed: 6,
                shiftType: 'SITE',
                deployedDate: new Date(),
            },
        });
        await prisma.item.update({
            where: { id: item.id },
            data: { quantityAvailable: { decrement: 6 } },
        });
        deployCount++;
    }

    for (const item of linenItems.slice(4, 8)) {
        await prisma.siteInventory.create({
            data: {
                siteId: pushkarSite.id,
                itemId: item.id,
                quantityDeployed: 10,
                shiftType: 'SITE',
                deployedDate: new Date(),
            },
        });
        await prisma.item.update({
            where: { id: item.id },
            data: { quantityAvailable: { decrement: 10 } },
        });
        deployCount++;
    }

    console.log(`  ✓ Deployed ${deployCount} item types to ${pushkarSite.name}`);

    console.log('✅ All deployments complete\n');

    // Step 5: Summary
    console.log('📊 Data Summary:');
    console.log('━'.repeat(50));
    console.log(`  Projects:        ${await prisma.project.count()}`);
    console.log(`  Sites:           ${await prisma.site.count()}`);
    console.log(`  Items:           ${await prisma.item.count()}`);
    console.log(`  Site Inventory:  ${await prisma.siteInventory.count()} deployments`);
    console.log('━'.repeat(50));

    // Show sites with inventory
    console.log('\n🏕️ Sites with Deployed Items:');
    const sitesWithInventory = await prisma.site.findMany({
        include: {
            _count: { select: { siteInventory: true } },
            siteInventory: {
                include: { item: true },
                take: 3,
            },
        },
    });

    for (const site of sitesWithInventory) {
        console.log(`\n  ${site.name}:`);
        console.log(`    - ${site._count.siteInventory} item types deployed`);
        console.log(`    - Sample items: ${site.siteInventory.map(i => i.item.name).slice(0, 3).join(', ')}`);
    }

    console.log('\n\n✨ Sample data created successfully!');
    console.log('\n📝 Next Steps:');
    console.log('  1. Log in as admin@example.com / password123');
    console.log('  2. Go to Sites → Click on a site with inventory');
    console.log('  3. Click "🚛 Auto-Generate Challans" button');
    console.log('  4. Enter truck capacity and generate preview');
    console.log('  5. Create challans!');
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
