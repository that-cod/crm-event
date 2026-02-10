import { useState } from "react";
import { useToast } from "@/lib/hooks/useToast";

interface AttendanceSheet {
    id: string;
    labour: { id: string; name: string };
    attendanceJson: number[];
    totalShifts: number;
    dailyRate: number;
    wages: number;
    incentive: number;
    netWages: number;
    openingBalance: number;
    totalAdvance: number;
    totalPaid: number;
    netPayable: number;
    balanceDue: number;
}

export function useShiftManagement(
    sheets: AttendanceSheet[],
    setSheets: React.Dispatch<React.SetStateAction<AttendanceSheet[]>>,
    month: number,
    year: number,
    daysInMonth: number,
    refetchSheets: () => void
) {
    const { success } = useToast();

    const handleShiftChange = async (
        sheetId: string,
        dayIndex: number,
        shifts: number
    ) => {
        try {
            const date = new Date(year, month - 1, dayIndex + 1);
            const response = await fetch("/api/attendance-sheets/mark", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    attendanceSheetId: sheetId,
                    date: date.toISOString(),
                    shifts,
                }),
            });

            const data = await response.json();
            if (data.success) {
                setSheets((prevSheets) =>
                    prevSheets.map((sheet) =>
                        sheet.id === sheetId ? { ...sheet, ...data.sheet } : sheet
                    )
                );
            }
        } catch (error) {
            console.error("Error marking attendance:", error);
        }
    };

    const handleBulkMarkAll = async (shifts: number) => {
        if (!confirm(`Mark all labours as ${shifts} shift(s) for all days?`)) return;

        const updates = sheets.flatMap((sheet) =>
            Array.from({ length: daysInMonth }, (_, dayIndex) => ({
                attendanceSheetId: sheet.id,
                date: new Date(year, month - 1, dayIndex + 1).toISOString(),
                shifts,
            }))
        );

        try {
            const response = await fetch("/api/attendance-sheets/mark", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ updates }),
            });

            if (response.ok) {
                refetchSheets();
                success("Bulk update completed!");
            }
        } catch (err) {
            console.error("Error bulk marking:", err);
        }
    };

    const handleMarkColumn = async (dayIndex: number, shifts: number) => {
        if (!confirm(`Mark all labours as ${shifts} shift(s) for day ${dayIndex + 1}?`)) return;

        const updates = sheets.map((sheet) => ({
            attendanceSheetId: sheet.id,
            date: new Date(year, month - 1, dayIndex + 1).toISOString(),
            shifts,
        }));

        try {
            const response = await fetch("/api/attendance-sheets/mark", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ updates }),
            });

            if (response.ok) {
                refetchSheets();
                success(`Day ${dayIndex + 1} updated!`);
            }
        } catch (err) {
            console.error("Error marking column:", err);
        }
    };

    return {
        handleShiftChange,
        handleBulkMarkAll,
        handleMarkColumn,
    };
}
