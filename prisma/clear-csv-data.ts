import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🗑️  Starting data cleanup...\n');

    try {
        // Delete in the correct order (respecting foreign key constraints)
        console.log('📦 Deleting inventory-related data...');

        // Step 1: Delete all scrap records
        const scrapCount = await prisma.scrapRecord.deleteMany();
        console.log(`  ✓ Deleted ${scrapCount.count} scrap records`);

        // Step 2: Delete repair queue entries
        const repairCount = await prisma.repairQueue.deleteMany();
        console.log(`  ✓ Deleted ${repairCount.count} repair queue entries`);

        // Step 3: Delete maintenance records
        const maintenanceCount = await prisma.maintenanceRecord.deleteMany();
        console.log(`  ✓ Deleted ${maintenanceCount.count} maintenance records`);

        // Step 4: Delete challan items and challans
        const challanItemCount = await prisma.challanItem.deleteMany();
        console.log(`  ✓ Deleted ${challanItemCount.count} challan items`);

        const challanCount = await prisma.challan.deleteMany();
        console.log(`  ✓ Deleted ${challanCount.count} challans`);

        // Step 5: Delete stock movements
        const stockMovementCount = await prisma.stockMovement.deleteMany();
        console.log(`  ✓ Deleted ${stockMovementCount.count} stock movements`);

        // Step 6: Delete bundle templates
        const bundleItemCount = await prisma.bundleTemplateItem.deleteMany();
        console.log(`  ✓ Deleted ${bundleItemCount.count} bundle template items`);

        const bundleCount = await prisma.bundleTemplate.deleteMany();
        console.log(`  ✓ Deleted ${bundleCount.count} bundle templates`);

        // Step 7: Delete purchase orders
        const poItemCount = await prisma.purchaseOrderItem.deleteMany();
        console.log(`  ✓ Deleted ${poItemCount.count} purchase order items`);

        const poCount = await prisma.purchaseOrder.deleteMany();
        console.log(`  ✓ Deleted ${poCount.count} purchase orders`);

        // Step 8: Delete site inventory and labour attendance
        const siteInventoryCount = await prisma.siteInventory.deleteMany();
        console.log(`  ✓ Deleted ${siteInventoryCount.count} site inventory records`);

        const labourCount = await prisma.labourAttendance.deleteMany();
        console.log(`  ✓ Deleted ${labourCount.count} labour attendance records`);

        // Step 9: Delete items (this is the main CSV-imported data)
        const itemCount = await prisma.item.deleteMany();
        console.log(`  ✓ Deleted ${itemCount.count} items`);

        // Step 10: Delete subcategories and categories
        const subcategoryCount = await prisma.subcategory.deleteMany();
        console.log(`  ✓ Deleted ${subcategoryCount.count} subcategories`);

        const categoryCount = await prisma.category.deleteMany();
        console.log(`  ✓ Deleted ${categoryCount.count} categories`);

        // Step 11: Delete projects and sites
        const projectCount = await prisma.project.deleteMany();
        console.log(`  ✓ Deleted ${projectCount.count} projects`);

        const siteCount = await prisma.site.deleteMany();
        console.log(`  ✓ Deleted ${siteCount.count} sites`);

        console.log('\n✅ All CSV-imported data has been successfully deleted!\n');

        // Show current database status
        console.log('📊 Current Database Status:');
        console.log('━'.repeat(50));
        console.log(`  Sites:         ${await prisma.site.count()}`);
        console.log(`  Categories:    ${await prisma.category.count()}`);
        console.log(`  Subcategories: ${await prisma.subcategory.count()}`);
        console.log(`  Items:         ${await prisma.item.count()}`);
        console.log(`  Users:         ${await prisma.user.count()} (preserved)`);
        console.log('━'.repeat(50));

        console.log('\n✨ Cleanup completed successfully!');
        console.log('💡 Users have been preserved and are still available for login.');

    } catch (error) {
        console.error('\n❌ Error during cleanup:', error);
        throw error;
    }
}

main()
    .catch((e) => {
        console.error('Fatal error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
