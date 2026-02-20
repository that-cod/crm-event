import { Prisma } from '@prisma/client';

/**
 * Prisma extension for query monitoring and performance tracking.
 * Uses the Prisma 5 extension API (replaces deprecated $use middleware).
 *
 * Usage: const extendedPrisma = prisma.$extends(queryMonitorExtension)
 */
export const queryMonitorExtension = Prisma.defineExtension({
    name: 'query-monitor',
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                const before = Date.now();

                try {
                    const result = await query(args);
                    const duration = Date.now() - before;

                    // Log slow queries (over 1 second)
                    if (duration > 1000) {
                        console.warn(`⚠️  Slow query detected: ${model}.${operation} took ${duration}ms`);
                    }

                    // Log very slow queries (over 3 seconds) as errors
                    if (duration > 3000) {
                        console.error(`🔴 Very slow query: ${model}.${operation} took ${duration}ms`, {
                            args: JSON.stringify(args).substring(0, 200),
                        });
                    }

                    return result;
                } catch (error) {
                    const duration = Date.now() - before;

                    // Log database errors with context
                    console.error(`❌ Database error in ${model}.${operation}:`, {
                        error: error instanceof Error ? error.message : 'Unknown error',
                        model,
                        action: operation,
                        duration: `${duration}ms`,
                    });

                    throw error;
                }
            },
        },
    },
});

/**
 * @deprecated Use queryMonitorExtension with prisma.$extends() instead.
 * This function is kept for backwards compatibility but is a no-op.
 * The $use() middleware API was removed in Prisma 5.
 */
export function setupPrismaMiddleware() {
    console.warn(
        '⚠️  setupPrismaMiddleware() is deprecated. ' +
        'Use prisma.$extends(queryMonitorExtension) from lib/prisma.ts instead.'
    );
}
