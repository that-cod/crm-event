"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { useToast } from "@/lib/hooks/useToast";
import AttendanceRow from "./components/AttendanceRow";

interface Site {
    id: string;
    name: string;
}

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

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

export default function AttendanceManagementPage() {
    const { error: showError } = useToast();

    // Selection state
    const [sites, setSites] = useState<Site[]>([]);
    const [selectedSite, setSelectedSite] = useState("");
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    // Data state
    const [loading, setLoading] = useState(false);
    const [sheets, setSheets] = useState<AttendanceSheet[]>([]);
    const [loaded, setLoaded] = useState(false);

    const daysInMonth = new Date(year, month, 0).getDate();
    const siteName = sites.find((s) => s.id === selectedSite)?.name || "";

    // Fetch sites on mount
    useEffect(() => {
        fetch("/api/sites")
            .then((r) => r.json())
            .then((data) => setSites(Array.isArray(data) ? data : []))
            .catch(console.error);
    }, []);

    // Load/create sheets
    const loadSheets = useCallback(async () => {
        if (!selectedSite) {
            showError("Please select a site");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(
                `/api/attendance-sheets?siteId=${selectedSite}&month=${month}&year=${year}&autoCreate=true`
            );
            const data = await res.json();
            if (data.success) {
                setSheets(data.sheets || []);
                setLoaded(true);
                if (data.sheets?.length === 0) {
                    showError("No labours found for this site. Add labours first.");
                }
            } else {
                showError(data.error || "Failed to load sheets");
            }
        } catch {
            showError("Failed to load attendance sheets");
        } finally {
            setLoading(false);
        }
    }, [selectedSite, month, year, showError]);

    // Handle shift change for a single cell
    const handleShiftChange = async (
        sheetId: string,
        dayIndex: number,
        shifts: number
    ) => {
        // Optimistic update
        setSheets((prev) =>
            prev.map((s) => {
                if (s.id !== sheetId) return s;
                const newJson = [...s.attendanceJson];
                newJson[dayIndex] = shifts;
                const totalShifts = newJson.reduce((sum, v) => sum + v, 0);
                const wages = totalShifts * s.dailyRate;
                const netWages = wages + s.incentive;
                const netPayable = netWages - s.totalAdvance + s.openingBalance;
                const balanceDue = netPayable - s.totalPaid;
                return { ...s, attendanceJson: newJson, totalShifts, wages, netWages, netPayable, balanceDue };
            })
        );

        try {
            const date = new Date(year, month - 1, dayIndex + 1);
            const res = await fetch("/api/attendance-sheets/mark", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    attendanceSheetId: sheetId,
                    date: date.toISOString(),
                    shifts,
                }),
            });
            const data = await res.json();
            if (data.success && data.sheet) {
                setSheets((prev) =>
                    prev.map((s) => (s.id === sheetId ? { ...s, ...data.sheet } : s))
                );
            }
        } catch {
            loadSheets();
        }
    };

    // Handle field update (incentive, advance, paid, rate)
    const handleFieldUpdate = async (
        sheetId: string,
        field: string,
        value: number
    ) => {
        // Optimistic update with recalculation
        setSheets((prev) =>
            prev.map((s) => {
                if (s.id !== sheetId) return s;
                const updated = { ...s, [field]: value };
                const wages = updated.totalShifts * updated.dailyRate;
                const netWages = wages + updated.incentive;
                const netPayable = netWages - updated.totalAdvance + updated.openingBalance;
                const balanceDue = netPayable - updated.totalPaid;
                return { ...updated, wages, netWages, netPayable, balanceDue };
            })
        );

        try {
            const res = await fetch(`/api/attendance-sheets/${sheetId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [field]: value }),
            });
            const data = await res.json();
            if (data.success && data.sheet) {
                setSheets((prev) =>
                    prev.map((s) => (s.id === sheetId ? { ...s, ...data.sheet } : s))
                );
            }
        } catch {
            loadSheets();
        }
    };

    // Totals row
    const totals = sheets.reduce(
        (acc, s) => ({
            totalShifts: acc.totalShifts + s.totalShifts,
            wages: acc.wages + s.wages,
            incentive: acc.incentive + s.incentive,
            netWages: acc.netWages + s.netWages,
            totalAdvance: acc.totalAdvance + s.totalAdvance,
            netPayable: acc.netPayable + s.netPayable,
            totalPaid: acc.totalPaid + s.totalPaid,
            balanceDue: acc.balanceDue + s.balanceDue,
            openingBalance: acc.openingBalance + s.openingBalance,
        }),
        {
            totalShifts: 0, wages: 0, incentive: 0, netWages: 0,
            totalAdvance: 0, netPayable: 0, totalPaid: 0, balanceDue: 0, openingBalance: 0,
        }
    );

    return (
        <div>
            <Header
                title="Attendance Management"
                subtitle="Mark daily attendance and manage payroll for all labours"
                action={
                    <Link href="/dashboard/labour/bulk-upload" className="btn btn-secondary">
                        + Bulk Upload Labours
                    </Link>
                }
            />

            <div className="p-6">
                {/* Site / Month / Year Selection */}
                <div className="card mb-6">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-sm font-medium text-gray-700 mb-1 block">
                                Site
                            </label>
                            <select
                                className="input"
                                value={selectedSite}
                                onChange={(e) => {
                                    setSelectedSite(e.target.value);
                                    setLoaded(false);
                                }}
                            >
                                <option value="">Select Site</option>
                                {sites.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="min-w-[150px]">
                            <label className="text-sm font-medium text-gray-700 mb-1 block">
                                Month
                            </label>
                            <select
                                className="input"
                                value={month}
                                onChange={(e) => {
                                    setMonth(parseInt(e.target.value));
                                    setLoaded(false);
                                }}
                            >
                                {MONTH_NAMES.map((name, i) => (
                                    <option key={i} value={i + 1}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="min-w-[100px]">
                            <label className="text-sm font-medium text-gray-700 mb-1 block">
                                Year
                            </label>
                            <select
                                className="input"
                                value={year}
                                onChange={(e) => {
                                    setYear(parseInt(e.target.value));
                                    setLoaded(false);
                                }}
                            >
                                {[2024, 2025, 2026, 2027].map((y) => (
                                    <option key={y} value={y}>
                                        {y}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={loadSheets}
                            disabled={!selectedSite || loading}
                            className="btn btn-primary"
                        >
                            {loading ? "Loading..." : "Load Attendance"}
                        </button>
                    </div>
                </div>

                {/* Attendance Grid */}
                {loaded && sheets.length > 0 && (
                    <>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-800">
                                {siteName} &mdash; {MONTH_NAMES[month - 1]} {year}
                                <span className="ml-3 text-sm font-normal text-gray-500">
                                    ({sheets.length} labours)
                                </span>
                            </h2>
                            <div className="text-xs text-gray-500">
                                Click any yellow/red/green cell to edit. Shifts: 0, 0.5, 1, 1.5, 2
                            </div>
                        </div>

                        <div className="overflow-x-auto border border-gray-300 rounded-lg">
                            <table className="min-w-full border-collapse text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="border border-gray-300 px-2 py-2 text-xs sticky left-0 bg-gray-100 z-10">
                                            S.N.
                                        </th>
                                        <th className="border border-gray-300 px-3 py-2 text-xs sticky left-10 bg-gray-100 z-10 text-left min-w-[150px]">
                                            Employee Name
                                        </th>
                                        {Array.from({ length: daysInMonth }, (_, i) => (
                                            <th
                                                key={i}
                                                className="border border-gray-300 px-1 py-2 text-xs w-10"
                                            >
                                                {i + 1}
                                            </th>
                                        ))}
                                        <th className="border border-gray-300 px-2 py-2 text-xs bg-orange-50">
                                            Total
                                        </th>
                                        <th className="border border-gray-300 px-2 py-2 text-xs">
                                            OP BAL
                                        </th>
                                        <th className="border border-gray-300 px-2 py-2 text-xs bg-gray-50">
                                            RATE
                                        </th>
                                        <th className="border border-gray-300 px-2 py-2 text-xs bg-green-50">
                                            WAGES
                                        </th>
                                        <th className="border border-gray-300 px-2 py-2 text-xs bg-yellow-50">
                                            INCENTIVE
                                        </th>
                                        <th className="border border-gray-300 px-2 py-2 text-xs bg-blue-50">
                                            NET WAGES
                                        </th>
                                        <th className="border border-gray-300 px-2 py-2 text-xs bg-red-50">
                                            ADVANCE
                                        </th>
                                        <th className="border border-gray-300 px-2 py-2 text-xs bg-purple-50">
                                            NET PAYABLE
                                        </th>
                                        <th className="border border-gray-300 px-2 py-2 text-xs bg-green-50">
                                            PAID
                                        </th>
                                        <th className="border border-gray-300 px-2 py-2 text-xs bg-red-50">
                                            BAL DUE
                                        </th>
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
                                            onFieldUpdate={handleFieldUpdate}
                                        />
                                    ))}
                                </tbody>
                                {/* Totals row */}
                                <tfoot className="bg-gray-100 font-bold text-sm">
                                    <tr>
                                        <td className="border border-gray-300 px-2 py-2 sticky left-0 bg-gray-100 z-10" />
                                        <td className="border border-gray-300 px-3 py-2 sticky left-10 bg-gray-100 z-10">
                                            TOTAL
                                        </td>
                                        {Array.from({ length: daysInMonth }, (_, i) => (
                                            <td key={i} className="border border-gray-300 px-1 py-2 text-center text-xs">
                                                {sheets.reduce((sum, s) => sum + (s.attendanceJson[i] || 0), 0).toFixed(0)}
                                            </td>
                                        ))}
                                        <td className="border border-gray-300 px-2 py-2 text-center bg-orange-50">
                                            {totals.totalShifts.toFixed(1)}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-2 text-right">
                                            {totals.openingBalance.toFixed(0)}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-2 bg-gray-50" />
                                        <td className="border border-gray-300 px-2 py-2 text-right bg-green-50">
                                            {totals.wages.toFixed(0)}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-2 text-right bg-yellow-50">
                                            {totals.incentive.toFixed(0)}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-2 text-right bg-blue-50">
                                            {totals.netWages.toFixed(0)}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-2 text-right bg-red-50">
                                            {totals.totalAdvance.toFixed(0)}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-2 text-right bg-purple-50">
                                            {totals.netPayable.toFixed(0)}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-2 text-right bg-green-50">
                                            {totals.totalPaid.toFixed(0)}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-2 text-right text-red-600 bg-red-50">
                                            {totals.balanceDue.toFixed(0)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </>
                )}

                {/* Empty states */}
                {loaded && sheets.length === 0 && (
                    <div className="card text-center py-12">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No Labours Found
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Add labours to this site first, then come back to mark attendance.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Link href="/dashboard/labour/new" className="btn btn-primary">
                                + Add Labour
                            </Link>
                            <Link href="/dashboard/labour/bulk-upload" className="btn btn-secondary">
                                Bulk Upload CSV
                            </Link>
                        </div>
                    </div>
                )}

                {!loaded && !loading && (
                    <div className="card text-center py-12">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Select a Site and Period
                        </h3>
                        <p className="text-gray-600">
                            Choose a site, month, and year above, then click &quot;Load Attendance&quot; to begin.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
