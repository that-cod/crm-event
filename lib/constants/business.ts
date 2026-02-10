/**
 * Tax rates and percentages
 */
export const TAX = {
    IGST_PERCENT: 18,  // Inter-state GST
    CGST_PERCENT: 9,   // Central GST
    SGST_PERCENT: 9,   // State GST
} as const;

/**
 * Labor shift values
 */
export const LABOR = {
    SHIFTS: {
        ABSENT: 0,
        HALF: 0.5,
        FULL: 1,
        OVERTIME_HALF: 1.5,
        DOUBLE: 2,
    },
} as const;

/**
 * Time conversions (in milliseconds)
 */
export const TIME = {
    MILLISECONDS_PER_SECOND: 1_000,
    SECONDS_PER_MINUTE: 60,
    MINUTES_PER_HOUR: 60,
    HOURS_PER_DAY: 24,
    DAYS_PER_WEEK: 7,
    DAYS_PER_MONTH: 30,  // Approximate
    DAYS_PER_YEAR: 365,  // Approximate
} as const;

/**
 * Helper to convert days to milliseconds
 */
export const daysToMilliseconds = (days: number): number => {
    return days * TIME.HOURS_PER_DAY * TIME.MINUTES_PER_HOUR * TIME.SECONDS_PER_MINUTE * TIME.MILLISECONDS_PER_SECOND;
};
