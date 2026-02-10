import { toast } from 'sonner';

/**
 * Custom toast hook for consistent notification UX across the app
 * Replaces alert() calls with modern toast notifications
 * 
 * @example
 * ```tsx
 * const { success, error } = useToast();
 * 
 * // Success notification
 * success("Item created successfully!");
 * 
 * // Error notification
 * error("Failed to save changes");
 * 
 * // Info notification
 * info("Processing your request...");
 * ```
 */
export function useToast() {
    return {
        success: (message: string) => toast.success(message),
        error: (message: string) => toast.error(message),
        info: (message: string) => toast.info(message),
        loading: (message: string) => toast.loading(message),
        promise: toast.promise,
    };
}
