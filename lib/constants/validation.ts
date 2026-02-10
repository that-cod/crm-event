/**
 * Validation constraints for forms and inputs
 */
export const VALIDATION = {
    MIN_PASSWORD_LENGTH: 8,
    MAX_NAME_LENGTH: 255,
    MAX_DESCRIPTION_LENGTH: 1000,
    MIN_QUANTITY: 0,
    MAX_QUANTITY: 999_999,
    MIN_PRICE: 0,
    MAX_PRICE: 999_999_999,
} as const;

/**
 * Common numeric thresholds
 */
export const THRESHOLDS = {
    LOW_STOCK_WARNING: 5,  // Items with quantity <= 5 are low stock
    CRITICAL_STOCK: 0,
    OVERDUE_DAYS: 0,  // Days past expected return date
} as const;
