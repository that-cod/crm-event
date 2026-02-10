/**
 * Date utility functions for consistent date handling across the application
 */

/**
 * Format a Date object or ISO string to YYYY-MM-DD format for date inputs
 */
export function formatDateForInput(date: Date | string | null | undefined): string {
    if (!date) return "";

    try {
        const d = typeof date === "string" ? new Date(date) : date;
        if (isNaN(d.getTime())) return "";

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    } catch {
        return "";
    }
}

/**
 * Format a Date object or ISO string to datetime-local format (YYYY-MM-DDTHH:mm)
 */
export function formatDateTimeForInput(date: Date | string | null | undefined): string {
    if (!date) return "";

    try {
        const d = typeof date === "string" ? new Date(date) : date;
        if (isNaN(d.getTime())) return "";

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");

        return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
        return "";
    }
}

/**
 * Parse a date input string (YYYY-MM-DD) to ISO 8601 string
 */
export function parseInputDate(dateString: string | null | undefined): string | null {
    if (!dateString) return null;

    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;

        return date.toISOString();
    } catch {
        return null;
    }
}

/**
 * Parse a datetime-local input string to ISO 8601 string
 */
export function parseInputDateTime(dateTimeString: string | null | undefined): string | null {
    if (!dateTimeString) return null;

    try {
        const date = new Date(dateTimeString);
        if (isNaN(date.getTime())) return null;

        return date.toISOString();
    } catch {
        return null;
    }
}

/**
 * Format a Date object or ISO string for display (e.g., "Jan 15, 2024")
 */
export function formatDateForDisplay(
    date: Date | string | null | undefined,
    options: Intl.DateTimeFormatOptions = {}
): string {
    if (!date) return "-";

    try {
        const d = typeof date === "string" ? new Date(date) : date;
        if (isNaN(d.getTime())) return "-";

        const defaultOptions: Intl.DateTimeFormatOptions = {
            year: "numeric",
            month: "short",
            day: "numeric",
            ...options,
        };

        return d.toLocaleDateString("en-US", defaultOptions);
    } catch {
        return "-";
    }
}

/**
 * Format a Date object or ISO string for display with time (e.g., "Jan 15, 2024, 3:30 PM")
 */
export function formatDateTimeForDisplay(
    date: Date | string | null | undefined,
    options: Intl.DateTimeFormatOptions = {}
): string {
    if (!date) return "-";

    try {
        const d = typeof date === "string" ? new Date(date) : date;
        if (isNaN(d.getTime())) return "-";

        const defaultOptions: Intl.DateTimeFormatOptions = {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            ...options,
        };

        return d.toLocaleString("en-US", defaultOptions);
    } catch {
        return "-";
    }
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayString(): string {
    return formatDateForInput(new Date());
}

/**
 * Get current datetime in datetime-local format
 */
export function getNowString(): string {
    return formatDateTimeForInput(new Date());
}

/**
 * Check if a date string is valid
 */
export function isValidDate(dateString: string | null | undefined): boolean {
    if (!dateString) return false;

    try {
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    } catch {
        return false;
    }
}

/**
 * Check if a date is in the future
 */
export function isFutureDate(dateString: string): boolean {
    if (!isValidDate(dateString)) return false;

    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return date > today;
}

/**
 * Check if a date is in the past
 */
export function isPastDate(dateString: string): boolean {
    if (!isValidDate(dateString)) return false;

    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return date < today;
}
