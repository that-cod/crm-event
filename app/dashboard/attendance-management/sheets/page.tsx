"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { useAttendanceSheets } from "./hooks/useAttendanceSheets";
import { useShiftManagement } from "./hooks/useShiftManagement";
import { useAttendanceTransactions } from "./hooks/useAttendanceTransactions";
import AttendanceRow from "./components/AttendanceRow";
import TransactionModal from "./components/TransactionModal";

export default function AttendanceSheetsPage() {
    const searchParams = useSearchParams();
    const siteId = searchParams.get("siteId");
    const month = parseInt(searchParams.get("month") || "1");
    const year = parseInt(searchParams.get("year") || "2026");

    // Custom hooks
    const { loading, sheets, setSheets, siteName, daysInMonth, refetchSheets } =
        useAttendanceSheets(siteId, month, year);

    const { handleShiftChange, handleBulkMarkAll, handleMarkColumn } =
        useShiftManagement(sheets, setSheets, month, year, daysInMonth, refetchSheets);

    const { handleIncentiveChange, handleAddTransaction } =
        useAttendanceTransactions(setSheets);

    // Local UI state
    const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [showBulkActions, setShowBulkActions] = useState(false);

    const handleGeneratePDF = async () => {
        try {
            const response = await fetch(
                `/api/attendance-sheets/pdf?siteId=${siteId}&month=${month}&year=${year}`
            );
            const data = await response.json();

            if (data.success) {
                window.print();
            }
        } catch (error) {
            console.error("Error generating PDF:", error);
        }
    };

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    if (!siteId) {
        return (
            <div className="p-8">
                <div className="card text-center py-12">
                    <p className="text-gray-600">Please select a site and month from the upload page.</p>
                    <Link href="/dashboard/attendance-management/upload" className="btn btn-primary mt-4">
                        Go to Upload
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Header
                title={`Attendance Sheet - ${monthNames[month - 1]} ${year}`}
                subtitle={`${siteName} - Mark daily shifts for all labours`}
                action={
                    <div className="flex gap-2">
                        <Link
                            href="/dashboard/attendance-management/upload"
                            className="btn btn-secondary"
                        >
                            ← Back
                        </Link>
                        <button
                            onClick={() => setShowBulkActions(!showBulkActions)}
                            className="btn btn-secondary"
                        >
                            ⚡ Bulk Actions
                        </button>
                        <button
                            onClick={handleGeneratePDF}
                            className="btn btn-primary"
                        >
                            🖨️ Print/PDF
                        </button>
                    </div>
                }
            />

            <div className="p-8">
                {showBulkActions && (
                    <div className="card mb-6 bg-blue-50 border-blue-200">
                        <h3 className="text-lg font-bold text-blue-900 mb-4">⚡ Bulk Actions</h3>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => handleBulkMarkAll(1)}
                                className="btn bg-green-600 text-white hover:bg-green-700"
                            >
                                Mark All Present (1 shift)
                            </button>
                            <button
                                onClick={() => handleBulkMarkAll(0)}
                                className="btn bg-red-600 text-white hover:bg-red-700"
                            >
                                Mark All Absent (0 shifts)
                            </button>
                            <button
                                onClick={() => handleBulkMarkAll(0.5)}
                                className="btn bg-orange-600 text-white hover:bg-orange-700"
                            >
                                Mark All Half Day (0.5 shifts)
                            </button>
                            <button
                                onClick={() => setShowBulkActions(false)}
                                className="btn btn-secondary"
                            >
                                Close
                            </button>
                        </div>
                        <p className="text-sm text-blue-700 mt-3">
                            💡 Tip: Click on any day number in the table header to mark all labours for that specific day
                        </p>
                    </div>
                )}

                {loading ? (
                    <div className="card text-center py-12">
                        <div className="text-4xl mb-4">⏳</div>
                        <p className="text-gray-600">Loading attendance sheets...</p>
                    </div>
                ) : sheets.length === 0 ? (
                    <div className="card text-center py-12">
                        <div className="text-6xl mb-4">📋</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No Attendance Sheets Found
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Please upload a CSV to create attendance sheets.
                        </p>
                        <Link
                            href="/dashboard/attendance-management/upload"
                            className="btn btn-primary"
                        >
                            Upload CSV
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse border border-gray-300 text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="border border-gray-300 px-2 py-2 sticky left-0 bg-gray-100 z-10">
                                        S.N.
                                    </th>
                                    <th className="border border-gray-300 px-4 py-2 sticky left-12 bg-gray-100 z-10 min-w-[150px]">
                                        Employee Name
                                    </th>
                                    {Array.from({ length: daysInMonth }, (_, i) => (
                                        <th
                                            key={i}
                                            className="border border-gray-300 px-2 py-2 w-12 cursor-pointer hover:bg-blue-100"
                                            onClick={() => {
                                                const shifts = prompt(`Mark all labours for day ${i + 1} (0, 0.5, 1, 1.5, 2):`);
                                                if (shifts !== null) {
                                                    handleMarkColumn(i, parseFloat(shifts) || 0);
                                                }
                                            }}
                                            title="Click to mark all labours for this day"
                                        >
                                            {i + 1}
                                        </th>
                                    ))}
                                    <th className="border border-gray-300 px-2 py-2 bg-orange-50">
                                        Total Shifts
                                    </th>
                                    <th className="border border-gray-300 px-2 py-2">OP BAL</th>
                                    <th className="border border-gray-300 px-2 py-2">RATE</th>
                                    <th className="border border-gray-300 px-2 py-2 bg-green-50">
                                        WAGES
                                    </th>
                                    <th className="border border-gray-300 px-2 py-2">INCENTIVE</th>
                                    <th className="border border-gray-300 px-2 py-2 bg-blue-50">
                                        NET WAGES
                                    </th>
                                    <th className="border border-gray-300 px-2 py-2">ADVANCE</th>
                                    <th className="border border-gray-300 px-2 py-2">PAID</th>
                                    <th className="border border-gray-300 px-2 py-2 bg-purple-50">
                                        NET PAYABLE
                                    </th>
                                    <th className="border border-gray-300 px-2 py-2 bg-red-50">
                                        BAL DUE
                                    </th>
                                    <th className="border border-gray-300 px-2 py-2">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sheets.map((sheet, index) => (
                                    <AttendanceRow
                                        key={sheet.id}
                                        serialNo={index + 1}
                                        sheet={sheet}
                                        daysInMonth={daysInMonth}
                                        onShiftChange={handleShiftChange}
                                        onIncentiveChange={handleIncentiveChange}
                                        onAddTransaction={handleAddTransaction}
                                        onOpenTransactions={() => {
                                            setSelectedSheet(sheet.id);
                                            setShowTransactionModal(true);
                                        }}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showTransactionModal && selectedSheet && (
                <TransactionModal
                    sheetId={selectedSheet}
                    sheet={sheets.find((s) => s.id === selectedSheet)!}
                    onClose={() => {
                        setShowTransactionModal(false);
                        setSelectedSheet(null);
                    }}
                    onAddTransaction={handleAddTransaction}
                />
            )}
        </div>
    );
}
