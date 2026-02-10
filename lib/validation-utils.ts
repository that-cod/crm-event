/**
 * Validation utility functions for form inputs
 */

/**
 * Validation result interface
 */
export interface ValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validate a phone number (10 digits)
 */
export function validatePhone(phone: string | null | undefined): ValidationResult {
    if (!phone) {
        return { valid: true }; // Optional field
    }

    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, "");

    if (cleaned.length === 0) {
        return { valid: true }; // Empty is valid (optional)
    }

    if (cleaned.length !== 10) {
        return {
            valid: false,
            error: "Phone number must be exactly 10 digits",
        };
    }

    if (!/^[6-9]/.test(cleaned)) {
        return {
            valid: false,
            error: "Phone number must start with 6, 7, 8, or 9",
        };
    }

    return { valid: true };
}

/**
 * Format phone number as user types (adds spacing)
 */
export function formatPhoneInput(value: string): string {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, "");

    // Limit to 10 digits
    const limited = cleaned.substring(0, 10);

    return limited;
}

/**
 * Display formatted phone number
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
    if (!phone) return "-";

    const cleaned = phone.replace(/\D/g, "");

    if (cleaned.length === 10) {
        // Format as: 98765 43210
        return `${cleaned.substring(0, 5)} ${cleaned.substring(5)}`;
    }

    return cleaned || "-";
}

/**
 * Validate a number field
 */
export function validateNumber(
    value: string | number | null | undefined,
    options: {
        min?: number;
        max?: number;
        required?: boolean;
        integer?: boolean;
    } = {}
): ValidationResult {
    const { min, max, required = false, integer = false } = options;

    // Check if empty
    if (value === null || value === undefined || value === "") {
        if (required) {
            return { valid: false, error: "This field is required" };
        }
        return { valid: true };
    }

    const num = typeof value === "string" ? parseFloat(value) : value;

    // Check if valid number
    if (isNaN(num)) {
        return { valid: false, error: "Must be a valid number" };
    }

    // Check if integer required
    if (integer && !Number.isInteger(num)) {
        return { valid: false, error: "Must be a whole number" };
    }

    // Check minimum
    if (min !== undefined && num < min) {
        return { valid: false, error: `Must be at least ${min}` };
    }

    // Check maximum
    if (max !== undefined && num > max) {
        return { valid: false, error: `Must be at most ${max}` };
    }

    return { valid: true };
}

/**
 * Validate a positive number (greater than 0)
 */
export function validatePositiveNumber(
    value: string | number | null | undefined,
    required = false
): ValidationResult {
    return validateNumber(value, { min: 0.01, required });
}

/**
 * Validate a non-negative number (0 or greater)
 */
export function validateNonNegativeNumber(
    value: string | number | null | undefined,
    required = false
): ValidationResult {
    return validateNumber(value, { min: 0, required });
}

/**
 * Validate quantity (positive integer)
 */
export function validateQuantity(
    value: string | number | null | undefined,
    maxAvailable?: number
): ValidationResult {
    const result = validateNumber(value, {
        min: 1,
        required: true,
        integer: true,
    });

    if (!result.valid) return result;

    if (maxAvailable !== undefined) {
        const num = typeof value === "string" ? parseInt(value) : (value as number);
        if (num > maxAvailable) {
            return {
                valid: false,
                error: `Quantity cannot exceed ${maxAvailable} (available stock)`,
            };
        }
    }

    return { valid: true };
}

/**
 * Validate email address
 */
export function validateEmail(email: string | null | undefined): ValidationResult {
    if (!email) {
        return { valid: true }; // Optional field
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return { valid: false, error: "Please enter a valid email address" };
    }

    return { valid: true };
}

/**
 * Validate required field (not empty)
 */
export function validateRequired(
    value: string | null | undefined,
    fieldName = "This field"
): ValidationResult {
    if (!value || value.trim() === "") {
        return { valid: false, error: `${fieldName} is required` };
    }

    return { valid: true };
}

/**
 * Validate string length
 */
export function validateLength(
    value: string | null | undefined,
    options: {
        min?: number;
        max?: number;
        exact?: number;
    } = {}
): ValidationResult {
    const { min, max, exact } = options;

    if (!value) {
        return { valid: true }; // Optional field
    }

    const length = value.length;

    if (exact !== undefined && length !== exact) {
        return { valid: false, error: `Must be exactly ${exact} characters` };
    }

    if (min !== undefined && length < min) {
        return { valid: false, error: `Must be at least ${min} characters` };
    }

    if (max !== undefined && length > max) {
        return { valid: false, error: `Must be at most ${max} characters` };
    }

    return { valid: true };
}

/**
 * Format number input (remove non-numeric characters except decimal)
 */
export function formatNumberInput(
    value: string,
    allowDecimal = true
): string {
    if (allowDecimal) {
        // Allow digits and one decimal point
        return value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
    } else {
        // Only digits
        return value.replace(/\D/g, "");
    }
}

/**
 * Sanitize numeric input to prevent invalid values
 */
export function sanitizeNumericInput(
    value: string,
    options: {
        allowNegative?: boolean;
        allowDecimal?: boolean;
        maxDecimals?: number;
    } = {}
): string {
    const { allowNegative = false, allowDecimal = true, maxDecimals = 2 } = options;

    let sanitized = value;

    // Remove all non-numeric characters except decimal and minus
    if (allowNegative && allowDecimal) {
        sanitized = sanitized.replace(/[^\d.-]/g, "");
    } else if (allowNegative) {
        sanitized = sanitized.replace(/[^\d-]/g, "");
    } else if (allowDecimal) {
        sanitized = sanitized.replace(/[^\d.]/g, "");
    } else {
        sanitized = sanitized.replace(/\D/g, "");
    }

    // Ensure only one decimal point
    if (allowDecimal) {
        const parts = sanitized.split(".");
        if (parts.length > 2) {
            sanitized = parts[0] + "." + parts.slice(1).join("");
        }

        // Limit decimal places
        if (parts.length === 2 && parts[1].length > maxDecimals) {
            sanitized = `${parts[0]}.${parts[1].substring(0, maxDecimals)}`;
        }
    }

    // Ensure only one minus sign at the beginning
    if (allowNegative) {
        const hasNegative = sanitized.startsWith("-");
        sanitized = sanitized.replace(/-/g, "");
        if (hasNegative) sanitized = "-" + sanitized;
    }

    return sanitized;
}
