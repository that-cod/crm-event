/**
 * UI-related constants for timeouts, delays, and visual feedback
 */
export const TIMEOUTS = {
    TOAST_AUTO_DISMISS: 3_000,  // 3 seconds
    DEBOUNCE_SEARCH: 500,  // 0.5 seconds
    BUTTON_RESET_DELAY: 3_000,  // 3 seconds (for error button text reset)
    ANIMATION_DURATION: 300,  // 0.3 seconds
} as const;

/**
 * Tailwind status color classes
 */
export const STATUS_COLORS = {
    SUCCESS: 'bg-green-100 text-green-800',
    SUCCESS_DARK: 'bg-green-500 text-white',
    ERROR: 'bg-red-100 text-red-800',
    ERROR_DARK: 'bg-red-500 text-white',
    WARNING: 'bg-yellow-100 text-yellow-800',
    WARNING_DARK: 'bg-orange-100 text-orange-800',
    INFO: 'bg-blue-100 text-blue-800',
    INFO_DARK: 'bg-blue-500 text-white',
    NEUTRAL: 'bg-gray-100 text-gray-800',
    NEUTRAL_DARK: 'bg-gray-500 text-white',
} as const;

/**
 * Icon sizes (Tailwind classes)
 */
export const ICON_SIZES = {
    SMALL: 'w-4 h-4',
    MEDIUM: 'w-6 h-6',
    LARGE: 'w-8 h-8',
    XLARGE: 'w-12 h-12',
} as const;
