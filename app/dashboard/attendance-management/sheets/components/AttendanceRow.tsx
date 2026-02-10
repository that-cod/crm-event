"use client";

import { useState } from "react";
import ShiftInput from "./ShiftInput";

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

export interface AttendanceRowProps {
    serialNo: number;
    sheet: AttendanceSheet;
    daysInMonth: number;
    onShiftChange: (sheetId: string, dayIndex: number, shifts: number) => void;
    onIncentiveChange: (sheetId: string, incentive: number) => void;
    onAddTransaction: (
        sheetId: string,
        type: "advance" | "payment",
        amount: number
    ) => void;
    onOpenTransactions: () => void;
}

export default function AttendanceRow({
    serialNo,
    sheet,
    daysInMonth,
    onShiftChange,
    onIncentiveChange,
    onOpenTransactions,
}: AttendanceRowProps) {
    const [editingIncentive, setEditingIncentive] = useState(false);
    const [incentiveValue, setIncentiveValue] = useState(sheet.incentive);

    const handleIncentiveBlur = () => {
        setEditingIncentive(false);
        if (incentiveValue !== sheet.incentive) {
            onIncentiveChange(sheet.id, incentiveValue);
        }
    };

    return (
        <tr className="hover:bg-gray-50">
            <td className="border border-gray-300 px-2 py-2 text-center sticky left-0 bg-white">
                {serialNo}
            </td>
            <td className="border border-gray-300 px-4 py-2 font-medium sticky left-12 bg-white">
                {sheet.labour.name}
            </td>
            {Array.from({ length: daysInMonth }, (_, i) => (
                <td key={i} className="border border-gray-300 px-1 py-1">
                    <ShiftInput
                        value={sheet.attendanceJson[i] || 0}
                        onChange={(value) => onShiftChange(sheet.id, i, value)}
                    />
                </td>
            ))}
            <td className="border border-gray-300 px-2 py-2 text-center font-bold text-orange-600 bg-orange-50">
                {sheet.totalShifts.toFixed(1)}
            </td>
            <td className="border border-gray-300 px-2 py-2 text-right">
                ₹{sheet.openingBalance.toFixed(0)}
            </td>
            <td className="border border-gray-300 px-2 py-2 text-right">
                ₹{sheet.dailyRate}
            </td>
            <td className="border border-gray-300 px-2 py-2 text-right font-semibold bg-green-50">
                ₹{sheet.wages.toFixed(0)}
            </td>
            <td className="border border-gray-300 px-1 py-1">
                {editingIncentive ? (
                    <input
                        type="number"
                        value={incentiveValue}
                        onChange={(e) => setIncentiveValue(parseFloat(e.target.value) || 0)}
                        onBlur={handleIncentiveBlur}
                        onKeyDown={(e) => e.key === "Enter" && handleIncentiveBlur()}
                        className="w-full px-1 py-1 border rounded text-right"
                        autoFocus
                    />
                ) : (
                    <div
                        onClick={() => setEditingIncentive(true)}
                        className="cursor-pointer hover:bg-gray-100 px-1 py-1 text-right"
                        title="Click to edit"
                    >
                        ₹{sheet.incentive.toFixed(0)}
                    </div>
                )}
            </td>
            <td className="border border-gray-300 px-2 py-2 text-right font-bold bg-blue-50">
                ₹{sheet.netWages.toFixed(0)}
            </td>
            <td className="border border-gray-300 px-2 py-2 text-right">
                ₹{sheet.totalAdvance.toFixed(0)}
            </td>
            <td className="border border-gray-300 px-2 py-2 text-right">
                ₹{sheet.totalPaid.toFixed(0)}
            </td>
            <td className="border border-gray-300 px-2 py-2 text-right font-bold bg-purple-50">
                ₹{sheet.netPayable.toFixed(0)}
            </td>
            <td className="border border-gray-300 px-2 py-2 text-right font-bold text-red-600 bg-red-50">
                ₹{sheet.balanceDue.toFixed(0)}
            </td>
            <td className="border border-gray-300 px-2 py-2 text-center">
                <button
                    onClick={onOpenTransactions}
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                    title="Manage advances and payments"
                >
                    💳
                </button>
            </td>
        </tr>
    );
}
