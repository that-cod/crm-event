/**
 * Seed script to update category loading order for truck loading sequence
 * Run with: npx ts-node prisma/seed-loading-order.ts
 * 
 * Loading sequence for trucks:
 * 1. Tents (heaviest, loaded first)
 * 2. Furniture
 * 3. Sanitary
 * 4. Electrical
 * 5. Linen
 * 6. Tools
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LOADING_ORDER: { [key: string]: number } = {
    "Tents": 1,
    "Tent": 1,
    "Furniture": 2,
    "Sanitary": 3,
    "Electrical": 4,
    "Linen": 5,
    "Tools": 6,
};

async function main() {
    console.log("Updating category loading order...");

    const categories = await prisma.category.findMany();

    for (const category of categories) {
        const loadingOrder = LOADING_ORDER[category.name] || 999;

        await prisma.category.update({
            where: { id: category.id },
            data: { loadingOrder },
        });

        console.log(`  ${category.name}: ${loadingOrder}`);
    }

    console.log("\nLoading order updated successfully!");
}

main()
    .catch((e) => {
        console.error("Error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
