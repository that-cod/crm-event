import { prisma } from './prisma';

/**
 * Sets up Prisma middleware for query monitoring and performance tracking
 * Call this once during application initialization
 */
export function setupPrismaMiddleware() {
    prisma.$use(async (params, next) => {
        const before = Date.now();

        try {
            const result = await next(params);
            const after = Date.now();
            const duration = after - before;

            // Log slow queries (over 1 second)
            if (duration > 1000) {
                console.warn(`⚠️  Slow query detected: ${params.model}.${params.action} took ${duration}ms`, {
                    model: params.model,
                    action: params.action,
                    duration: `${duration}ms`,
                });
            }

            // Log very slow queries (over 3 seconds) as errors
            if (duration > 3000) {
                console.error(`🔴 Very slow query: ${params.model}.${params.action} took ${duration}ms`, {
                    model: params.model,
                    action: params.action,
                    duration: `${duration}ms`,
                    args: JSON.stringify(params.args).substring(0, 200), // First 200 chars
                });
            }

            return result;
        } catch (error) {
            const after = Date.now();
            const duration = after - before;

            // Log database errors with context
            console.error(`❌ Database error in ${params.model}.${params.action}:`, {
                error: error instanceof Error ? error.message : 'Unknown error',
                model: params.model,
                action: params.action,
                duration: `${duration}ms`,
            });

            throw error;
        }
    });

    console.log('✅ Prisma middleware initialized');
}

/**
 * Get connection pool statistics
 * Note: Requires Prisma metrics to be enabled in Prisma Client configuration
 * This is an optional feature and may not be available in all setups
 */
export async function getPoolStats(): Promise<unknown | null> {
    try {
        // Check if $metrics is available on Prisma client
        // Using type assertion only for the check, not the result
        const prismaWithMetrics = prisma as { $metrics?: { json: () => Promise<unknown> } };

        if (!prismaWithMetrics.$metrics) {
            console.warn('Prisma metrics not enabled. Enable in Prisma Client configuration.');
            return null;
        }

        const metrics = await prismaWithMetrics.$metrics.json();
        return metrics;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Pool metrics not available:', errorMessage);
        return null;
    }
}
