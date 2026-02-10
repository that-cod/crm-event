/**
 * API Request Validation Schemas using Zod
 * Provides server-side validation for critical operations
 */

import { z } from "zod";
import { validatePhone } from "./validation-utils";

/**
 * Custom phone number validator
 */
const phoneValidator = z
    .string()
    .optional()
    .refine(
        (val) => !val || val === "" || validatePhone(val).valid,
        { message: "Phone number must be exactly 10 digits starting with 6, 7, 8, or 9" }
    );

/**
 * Date string validator (YYYY-MM-DD format)
 */
const dateStringValidator = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

/**
 * Labour Attendance Schema
 */
export const labourAttendanceSchema = z.object({
    labourName: z.string().min(1, "Labour name is required").max(100),
    attendanceDate: dateStringValidator,
    shiftType: z.enum(["WAREHOUSE", "SITE"], {
        errorMap: () => ({ message: "Shift type must be WAREHOUSE or SITE" }),
    }),
    siteId: z.string().optional().nullable(),
    shiftsWorked: z
        .string()
        .or(z.number())
        .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
        .refine((val) => val >= 0.5 && val <= 3, {
            message: "Shifts worked must be between 0.5 and 3",
        }),
    wagePerShift: z
        .string()
        .or(z.number())
        .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
        .refine((val) => val >= 0, { message: "Wage must be positive" })
        .optional()
        .nullable(),
    notes: z.string().max(500).optional().nullable(),
});

export type LabourAttendanceInput = z.infer<typeof labourAttendanceSchema>;

/**
 * Bulk Labour Attendance Schema
 */
export const bulkLabourAttendanceSchema = z.object({
    date: dateStringValidator,
    shiftType: z.enum(["WAREHOUSE", "SITE"]),
    siteId: z.string().optional().nullable(),
    records: z
        .array(
            z.object({
                labourName: z.string().min(1).max(100),
                shiftsWorked: z.number().min(0.5).max(3),
                wagePerShift: z.number().min(0).optional().nullable(),
                notes: z.string().max(500).optional().nullable(),
            })
        )
        .min(1, "At least one labour record is required"),
});

/**
 * Challan Item Schema
 */
const challanItemSchema = z.object({
    itemId: z.string().min(1, "Item ID is required"),
    quantity: z
        .number()
        .int("Quantity must be a whole number")
        .min(1, "Quantity must be at least 1"),
    notes: z.string().max(500).optional().nullable(),
});

/**
 * Challan Create Schema
 */
export const challanCreateSchema = z.object({
    projectId: z.string().min(1, "Project is required"),
    items: z.array(challanItemSchema).min(1, "At least one item is required"),
    expectedReturnDate: z.string().optional().nullable(),
    remarks: z.string().max(1000).optional().nullable(),
    truckNumber: z.string().max(50).optional().nullable(),
    driverName: z.string().max(100).optional().nullable(),
    driverPhone: phoneValidator,
    movementDirection: z.enum(["OUTWARD", "INWARD"]).default("OUTWARD"),
});

export type ChallanCreateInput = z.infer<typeof challanCreateSchema>;

/**
 * Challan Return Schema
 */
export const challanReturnSchema = z.object({
    items: z
        .array(
            z.object({
                challanItemId: z.string(),
                returnedQuantity: z.number().int().min(0),
                condition: z.enum(["GOOD", "DAMAGED", "SCRAP"]).default("GOOD"),
                notes: z.string().max(500).optional().nullable(),
            })
        )
        .min(1, "At least one item must be returned"),
    returnDate: z.string().optional().nullable(),
});

/**
 * Inventory Item Create Schema
 */
export const inventoryItemCreateSchema = z.object({
    name: z.string().min(1, "Item name is required").max(200),
    categoryId: z.string().min(1, "Category is required"),
    quantityAvailable: z
        .number()
        .int("Quantity must be a whole number")
        .min(0, "Quantity cannot be negative"),
    unitCost: z.number().min(0, "Unit cost cannot be negative").optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
});

/**
 * Stock Movement Schema
 */
export const stockMovementSchema = z.object({
    itemId: z.string().min(1, "Item is required"),
    movementType: z.enum(["IN", "OUT", "ADJUSTMENT"], {
        errorMap: () => ({ message: "Invalid movement type" }),
    }),
    quantity: z.number().int().min(1, "Quantity must be at least 1"),
    reason: z.string().min(1, "Reason is required").max(500),
    notes: z.string().max(1000).optional().nullable(),
});

/**
 * Purchase Order Create Schema
 */
export const purchaseOrderCreateSchema = z.object({
    poNumber: z.string().min(1, "PO number is required").max(50),
    vendor: z.string().min(1, "Vendor is required").max(200),
    orderDate: dateStringValidator,
    expectedDate: z.string().optional().nullable(),
    totalAmount: z
        .string()
        .or(z.number())
        .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
        .refine((val) => val >= 0, { message: "Amount must be positive" })
        .optional()
        .nullable(),
    items: z
        .array(
            z.object({
                itemId: z.string(),
                orderedQuantity: z.string().or(z.number()).transform((val) =>
                    typeof val === "string" ? parseInt(val) : val
                ),
                unitCost: z
                    .string()
                    .or(z.number())
                    .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
                    .optional(),
                notes: z.string().max(500).optional().nullable(),
            })
        )
        .min(1, "At least one item is required"),
    notes: z.string().max(1000).optional().nullable(),
});

/**
 * Helper function to validate request body against schema
 */
export async function validateRequestBody<T>(
    request: Request,
    schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; errors: string[] }> {
    try {
        const body = await request.json();
        const result = schema.safeParse(body);

        if (!result.success) {
            const errors = result.error.errors.map((err) => {
                const path = err.path.join(".");
                return path ? `${path}: ${err.message}` : err.message;
            });
            return { success: false, errors };
        }

        return { success: true, data: result.data };
    } catch (error) {
        return { success: false, errors: ["Invalid JSON in request body"] };
    }
}
