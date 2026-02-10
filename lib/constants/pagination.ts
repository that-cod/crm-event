/**
 * Pagination and data loading constants
 */
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 20,
    MOVEMENTS_LIMIT: 100,
    MAX_ITEMS_PER_PAGE: 200,
    SMALL_PAGE_SIZE: 10,
    MEDIUM_PAGE_SIZE: 50,
} as const;

/**
 * Data refresh intervals (in milliseconds)
 */
export const REFRESH_INTERVALS = {
    FAST: 5_000,  // 5 seconds
    NORMAL: 30_000,  // 30 seconds  
    SLOW: 60_000,  // 1 minute
    VERY_SLOW: 300_000,  // 5 minutes
} as const;
