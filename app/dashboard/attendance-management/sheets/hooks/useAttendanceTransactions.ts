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

export function useAttendanceTransactions(
    setSheets: React.Dispatch<React.SetStateAction<AttendanceSheet[]>>
) {
    const handleIncentiveChange = async (sheetId: string, incentive: number) => {
        try {
            const response = await fetch(`/api/attendance-sheets/${sheetId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ incentive }),
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
            console.error("Error updating incentive:", error);
        }
    };

    const handleAddTransaction = async (
        sheetId: string,
        type: "advance" | "payment",
        amount: number
    ) => {
        try {
            const response = await fetch("/api/attendance-sheets/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    attendanceSheetId: sheetId,
                    type,
                    amount,
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
            console.error("Error adding transaction:", error);
        }
    };

    return {
        handleIncentiveChange,
        handleAddTransaction,
    };
}
