import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

interface ParsedRow {
    category: string;
    subCategory: string;
    itemName: string;
    description: string;
    quantity: string;
    hsnCode: string;
    photo: string;
}

function parseCSV(csvText: string): ParsedRow[] {
    const lines = csvText.split('\n').filter((line) => line.trim());
    const rows: ParsedRow[] = [];

    // Skip header (line 0)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const parts: string[] = [];
        let current = '';
        let inQuotes = false;

        // CSV parser handling quotes and commas
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                parts.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        parts.push(current.trim());

        // Expected format: Category,Sub Category,Item Name,Description,Quantity,Hsn Code,Photo
        if (parts.length >= 5) {
            rows.push({
                category: parts[0] || '',
                subCategory: parts[1] || '',
                itemName: parts[2] || '',
                description: parts[3] || '',
                quantity: parts[4] || '0',
                hsnCode: parts[5] || '',
                photo: parts[6] || '',
            });
        }
    }

    return rows;
}

function buildItemName(subCategory: string, itemName: string, description: string): string {
    // Build a descriptive composite name
    const parts: string[] = [];

    if (subCategory) parts.push(subCategory);
    if (itemName) parts.push(itemName);
    if (description) parts.push(description);

    // If we have subcategory + item name + description, format nicely
    if (parts.length >= 2) {
        return parts.join(' - ');
    } else if (parts.length === 1) {
        return parts[0];
    } else {
        return 'Unknown Item';
    }
}

function parseQuantity(qtyStr: string): number {
    if (!qtyStr || qtyStr.trim() === '') return 0;

    const num = parseInt(qtyStr, 10);
    return isNaN(num) ? 0 : num;
}

async function main() {
    console.log('🚀 Starting master data import...\n');

    // Read CSV file
    const csvPath = path.join(__dirname, '..', 'Master data - Sheet1 (1).csv');
    if (!fs.existsSync(csvPath)) {
        console.error('❌ CSV file not found at:', csvPath);
        console.log('Please ensure "Master data - Sheet1 (1).csv" exists in the project root');
        process.exit(1);
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    // Step 1: Clear existing inventory data (keep users)
    console.log('📦 Clearing existing inventory data...');

    await prisma.scrapRecord.deleteMany();
    await prisma.repairQueue.deleteMany();
    await prisma.maintenanceRecord.deleteMany();
    await prisma.challanItem.deleteMany();
    await prisma.challan.deleteMany();
    await prisma.stockMovement.deleteMany();
    await prisma.bundleTemplateItem.deleteMany();
    await prisma.bundleTemplate.deleteMany();
    await prisma.purchaseOrderItem.deleteMany();
    await prisma.purchaseOrder.deleteMany();
    await prisma.siteInventory.deleteMany();
    await prisma.labourAttendance.deleteMany();
    await prisma.item.deleteMany();
    await prisma.subcategory.deleteMany();
    await prisma.category.deleteMany();
    await prisma.project.deleteMany();
    await prisma.site.deleteMany();

    console.log('✅ Cleared existing data\n');

    // Step 2: Parse CSV data
    console.log('📄 Parsing CSV data...');
    const rows = parseCSV(csvContent);
    console.log(`✅ Parsed ${rows.length} rows\n`);

    // Step 3: Extract unique categories and subcategories
    console.log('📂 Creating categories and subcategories...');

    const categoryMap = new Map<string, string>();
    const subcategoryMap = new Map<string, string>();

    const uniqueCategories = new Set<string>();
    const uniqueSubcategories = new Map<string, Set<string>>();

    rows.forEach((row) => {
        if (row.category) {
            uniqueCategories.add(row.category.trim());
            if (row.subCategory) {
                if (!uniqueSubcategories.has(row.category.trim())) {
                    uniqueSubcategories.set(row.category.trim(), new Set());
                }
                uniqueSubcategories.get(row.category.trim())!.add(row.subCategory.trim());
            }
        }
    });

    // Create categories
    for (const catName of uniqueCategories) {
        const category = await prisma.category.create({
            data: {
                name: catName,
                description: `${catName} category`,
            },
        });
        categoryMap.set(catName, category.id);
        console.log(`  ✓ Created category: ${catName}`);

        // Create subcategories for this category
        const subcats = uniqueSubcategories.get(catName);
        if (subcats) {
            for (const subName of subcats) {
                if (!subName) continue; // Skip empty subcategories

                const subcategory = await prisma.subcategory.create({
                    data: {
                        categoryId: category.id,
                        name: subName,
                        description: `${subName} under ${catName}`,
                    },
                });
                subcategoryMap.set(`${catName}|${subName}`, subcategory.id);
                console.log(`    ✓ Created subcategory: ${subName}`);
            }
        }
    }

    console.log(`✅ Created ${categoryMap.size} categories and ${subcategoryMap.size} subcategories\n`);

    // Step 4: Create items
    console.log('📦 Creating items...');
    let itemCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
        // Skip rows without category
        if (!row.category || !row.category.trim()) {
            skippedCount++;
            continue;
        }

        const categoryId = categoryMap.get(row.category.trim());
        if (!categoryId) {
            console.log(`  ⚠  Warning: Category not found: ${row.category}`);
            skippedCount++;
            continue;
        }

        // Get subcategory ID if exists
        const subcategoryId = row.subCategory
            ? subcategoryMap.get(`${row.category.trim()}|${row.subCategory.trim()}`)
            : null;

        // Build composite item name
        const itemName = buildItemName(
            row.subCategory.trim(),
            row.itemName.trim(),
            row.description.trim()
        );

        const quantity = parseQuantity(row.quantity);

        // Build remarks with HSN code
        let remarks = '';
        if (row.hsnCode) {
            remarks = `HSN: ${row.hsnCode}`;
        }

        try {
            await prisma.item.create({
                data: {
                    categoryId,
                    subcategoryId: subcategoryId || undefined,
                    name: itemName,
                    description: row.description ? row.description.trim() : null,
                    quantityAvailable: quantity,
                    condition: 'GOOD',
                    remarks: remarks || null,
                    imageUrl1: row.photo ? row.photo.trim() : null,
                },
            });
            itemCount++;

            if (itemCount % 25 === 0) {
                console.log(`  ... ${itemCount} items created`);
            }
        } catch (error) {
            console.error(`  ⚠ Error creating item: ${itemName}`, error);
            skippedCount++;
        }
    }

    console.log(`✅ Created ${itemCount} items (skipped ${skippedCount} rows)\n`);

    // Step 5: Summary
    console.log('📊 Import Summary:');
    console.log('━'.repeat(50));
    console.log(`  Categories:    ${await prisma.category.count()}`);
    console.log(`  Subcategories: ${await prisma.subcategory.count()}`);
    console.log(`  Items:         ${await prisma.item.count()}`);
    console.log(`  Users:         ${await prisma.user.count()} (preserved)`);
    console.log('━'.repeat(50));

    // Step 6: Category breakdown
    console.log('\n📋 Items per Category:');
    const categories = await prisma.category.findMany({
        include: {
            _count: {
                select: { items: true }
            }
        }
    });

    categories.forEach(cat => {
        console.log(`  ${cat.name}: ${cat._count.items} items`);
    });

    console.log('\n✨ Master data import completed successfully!');
    console.log('\n💡 Note: All items imported with quantity = 0 as per CSV.');
    console.log('   Update quantities through the UI or upload a CSV with current stock levels.');
}

main()
    .catch((e) => {
        console.error('❌ Error during import:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
