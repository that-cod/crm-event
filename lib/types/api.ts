/**
 * Common type definitions for Prisma queries and API responses
 */

import { Prisma } from "@prisma/client";

/**
 * Attendance Sheet with calculated totals
 */
export interface AttendanceSheetWithTotals {
    id: string;
    labourId: string;
    siteId: string;
    month: number;
    year: number;
    dailyRate: number;
    attendanceJson: Prisma.JsonValue;
    totalShifts: number;
    wages: number;
    incentive: number;
    netWages: number;
    totalAdvance: number;
    openingBalance: number;
    totalPaid: number;
    netPayable: number;
    balanceDue: number;
    status: string;
    finalizedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Bundle Template Item from request body
 */
export interface BundleTemplateItemInput {
    itemId: string;
    quantityPerBaseUnit: number;
}

/**
 * Challan item for update operations
 */
export interface ChallanItemUpdate {
    itemId?: string;
    quantity?: number;
    condition?: string;
    [key: string]: unknown;
}

/**
 * Labour attendance record from API response
 */
export interface LabourAttendanceRecord {
    id: string;
    date: Date;
    shifts: number;
    wages: number;
    notes: string | null;
}

/**
 * Generic Prisma where clause type
 */
export type PrismaWhereClause = Record<string, unknown>;

/**
 * Generic Prisma update data type
 */
export type PrismaUpdateData = Record<string, unknown>;
