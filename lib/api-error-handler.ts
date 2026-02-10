import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

/**
 * API Error Handler Utility
 * 
 * Provides consistent error handling across API routes following CLAUDE.md best practices:
 * - Proper error typing (error: unknown)
 * - User-friendly error messages
 * - Appropriate HTTP status codes
 * - Context logging for debugging
 */

/**
 * Error types that can occur in API routes
 */
export type ApiErrorType =
    | "VALIDATION_ERROR"
    | "NOT_FOUND"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "DATABASE_ERROR"
    | "UNKNOWN_ERROR";

/**
 * Error context for logging
 */
export interface ErrorContext {
    operation: string;
    userId?: string;
    resourceId?: string;
    additionalInfo?: Record<string, unknown>;
}

/**
 * Maps error types to HTTP status codes
 */
const ERROR_STATUS_MAP: Record<ApiErrorType, number> = {
    VALIDATION_ERROR: 400,
    NOT_FOUND: 404,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    DATABASE_ERROR: 500,
    UNKNOWN_ERROR: 500,
};

/**
 * Determines the error type from an unknown error
 */
function getErrorType(error: unknown): ApiErrorType {
    // Prisma-specific errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
            case "P2002":
                return "VALIDATION_ERROR"; // Unique constraint violation
            case "P2025":
                return "NOT_FOUND"; // Record not found
            case "P2003":
                return "VALIDATION_ERROR"; // Foreign key constraint
            default:
                return "DATABASE_ERROR";
        }
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
        return "VALIDATION_ERROR";
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
        return "DATABASE_ERROR";
    }

    // Generic Error with name check
    if (error instanceof Error) {
        if (error.message.includes("not found")) {
            return "NOT_FOUND";
        }
        if (error.message.includes("Unauthorized") || error.message.includes("Invalid credentials")) {
            return "UNAUTHORIZED";
        }
    }

    return "UNKNOWN_ERROR";
}

/**
 * Extracts a user-friendly error message from an unknown error
 */
function getUserFriendlyMessage(error: unknown, errorType: ApiErrorType): string {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
            case "P2002":
                const field = (error.meta?.target as string[])?.join(", ") || "field";
                return `A record with this ${field} already exists`;
            case "P2025":
                return "The requested resource was not found";
            case "P2003":
                return "Cannot perform this operation due to related data";
            case "P1001":
            case "P1008":
            case "P1017":
                return "Database connection error. Please try again later";
            default:
                return "A database error occurred";
        }
    }

    if (error instanceof Error) {
        // Return the error message if it's already user-friendly
        if (errorType === "VALIDATION_ERROR" || errorType === "NOT_FOUND") {
            return error.message;
        }
    }

    // Generic fallback messages
    switch (errorType) {
        case "UNAUTHORIZED":
            return "Authentication required";
        case "FORBIDDEN":
            return "You don't have permission to perform this action";
        case "DATABASE_ERROR":
            return "A database error occurred. Please try again later";
        default:
            return "An unexpected error occurred. Please try again";
    }
}

/**
 * Logs error with context for debugging
 */
function logError(
    error: unknown,
    errorType: ApiErrorType,
    context: ErrorContext
): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined;

    console.error(`❌ API Error [${errorType}] in ${context.operation}:`, {
        message: errorMessage,
        code: errorCode,
        userId: context.userId,
        resourceId: context.resourceId,
        ...context.additionalInfo,
    });
}

/**
 * Main error handler function
 * 
 * @param error - The caught error (typed as unknown following best practices)
 * @param context - Context about where the error occurred
 * @returns NextResponse with appropriate error message and status code
 * 
 * @example
 * ```typescript
 * try {
 *   const item = await prisma.item.findUniqueOrThrow({ where: { id } });
 *   return NextResponse.json(item);
 * } catch (error: unknown) {
 *   return handleApiError(error, {
 *     operation: "fetch item",
 *     userId: session.user.id,
 *     resourceId: id,
 *   });
 * }
 * ```
 */
export function handleApiError(
    error: unknown,
    context: ErrorContext
): NextResponse {
    const errorType = getErrorType(error);
    const userMessage = getUserFriendlyMessage(error, errorType);
    const statusCode = ERROR_STATUS_MAP[errorType];

    // Log error for debugging
    logError(error, errorType, context);

    // Return user-friendly response
    return NextResponse.json(
        { error: userMessage },
        { status: statusCode }
    );
}

/**
 * Convenience function for validation errors
 */
export function validationError(message: string): NextResponse {
    return NextResponse.json(
        { error: message },
        { status: 400 }
    );
}

/**
 * Convenience function for not found errors
 */
export function notFoundError(resource: string = "Resource"): NextResponse {
    return NextResponse.json(
        { error: `${resource} not found` },
        { status: 404 }
    );
}

/**
 * Convenience function for unauthorized errors
 */
export function unauthorizedError(message: string = "Unauthorized"): NextResponse {
    return NextResponse.json(
        { error: message },
        { status: 403 }
    );
}

/**
 * Success response helper for consistent formatting
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse {
    return NextResponse.json(data, { status });
}

/**
 * Created response helper (201)
 */
export function createdResponse<T>(data: T): NextResponse {
    return NextResponse.json(data, { status: 201 });
}

/**
 * Parse and validate JSON request body
 * Returns parsed data or throws an error
 */
export async function parseRequestBody<T = unknown>(request: Request): Promise<T> {
    try {
        const body = await request.json();
        return body as T;
    } catch (error) {
        throw new Error("Invalid JSON in request body");
    }
}
