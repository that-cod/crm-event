import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import type { Session } from "next-auth";

/**
 * Session caching layer to reduce repeated getServerSession calls.
 * 
 * USAGE:
 * Instead of:
 *   const session = await getServerSession(authOptions);
 * 
 * Use:
 *   const session = await getCachedSession(request);
 * 
 * This caches sessions based on request headers to avoid redundant JWT verification.
 */

// In-memory cache with TTL
const sessionCache = new Map<string, { session: Session | null; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Extract a cache key from the request headers
 */
function getCacheKey(request?: Request): string | null {
    if (!request) return null;

    // Use cookie header as cache key (contains session token)
    const cookies = request.headers.get('cookie');
    if (!cookies) return null;

    // Extract next-auth session token
    const sessionTokenMatch = cookies.match(/next-auth\.session-token=([^;]+)/);
    if (!sessionTokenMatch) return null;

    return sessionTokenMatch[1];
}

/**
 * Get session with caching to reduce repeated auth checks.
 * 
 * @param request - Optional Request object to extract session from
 * @returns Session object or null if not authenticated
 */
export async function getCachedSession(request?: Request): Promise<Session | null> {
    const cacheKey = getCacheKey(request);

    // If no cache key, fall back to regular getServerSession
    if (!cacheKey) {
        return await getServerSession(authOptions);
    }

    // Check cache
    const cached = sessionCache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < CACHE_TTL) {
        return cached.session;
    }

    // Cache miss or expired - fetch fresh session
    const session = await getServerSession(authOptions);
    sessionCache.set(cacheKey, { session, timestamp: now });

    // Cleanup old entries (prevent memory leak)
    if (sessionCache.size > 1000) {
        const entries = Array.from(sessionCache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp);

        // Remove oldest 100 entries
        for (let i = 0; i < 100; i++) {
            sessionCache.delete(entries[i][0]);
        }
    }

    return session;
}

/**
 * Clear the session cache (useful for testing or forced logout scenarios)
 */
export function clearSessionCache(): void {
    sessionCache.clear();
}

/**
 * Get cache statistics (for monitoring/debugging)
 */
export function getSessionCacheStats() {
    return {
        size: sessionCache.size,
        entries: sessionCache.size,
    };
}
