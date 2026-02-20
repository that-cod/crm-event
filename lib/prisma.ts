import { PrismaClient } from '@prisma/client'
import { queryMonitorExtension } from './prisma-middleware'

// ============================================
// Prisma Client Singleton with Error Handling
// ============================================

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined
}

/**
 * Creates Prisma client with appropriate logging configuration.
 * DATABASE_URL should include ?pgbouncer=true when using Supabase pooler (port 6543).
 * DIRECT_URL should point to the direct connection (port 5432) for migrations.
 */
function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['error', 'warn']
      : ['error'],
    // Configure transaction timeout settings to prevent long-running transactions
    transactionOptions: {
      maxWait: 5000,      // Maximum time (5s) to wait to start a transaction
      timeout: 10000,     // Maximum time (10s) for transaction to complete
      isolationLevel: 'ReadCommitted',
    },
  })

  // Apply query monitoring extension (Prisma 5 replaces deprecated $use())
  return client.$extends(queryMonitorExtension)
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * Test database connection health.
 * Useful for health check endpoints or startup validation.
 */
export async function testDatabaseConnection(): Promise<{
  connected: boolean
  error?: string
  latencyMs?: number
}> {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return {
      connected: true,
      latencyMs: Date.now() - start,
    }
  } catch (error) {
    console.error('Database connection failed:', error)
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}

/**
 * Gracefully disconnect Prisma client.
 * Call this during app shutdown.
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect()
    console.log('Database disconnected successfully')
  } catch (error) {
    console.error('Error disconnecting database:', error)
    throw error
  }
}

// Handle process termination gracefully
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await disconnectDatabase()
  })
}
