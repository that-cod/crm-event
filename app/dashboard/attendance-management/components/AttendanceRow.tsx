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

interface AttendanceRowProps {
    serialNo: number;
    sheet: AttendanceSheet;
    daysInMonth: number;
    onShiftChange: (sheetId: string, dayIndex: number, shifts: number) => void;
    onFieldUpdate: (sheetId: string, field: string, value: number) => void;
}

function EditableCell({
    value,
    field,
    sheetId,
    onSave,
    prefix = "",
}: {
    value: number;
    field: string;
    sheetId: string;
    onSave: (sheetId: string, field: string, value: number) => void;
    prefix?: string;
}) {
    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);

    const handleBlur = () => {
        setEditing(false);
        if (editValue !== value) {
            onSave(sheetId, field, editValue);
        }
    };

    if (editing) {
        return (
            <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(parseFloat(e.target.value) || 0)}
                onBlur={handleBlur}
                onKeyDown={(e) => e.key === "Enter" && handleBlur()}
                className="w-full px-1 py-1 border rounded text-right text-sm"
                autoFocus
            />
        );
    }

    return (
        <div
            onClick={() => {
                setEditValue(value);
                setEditing(true);
            }}
            className="cursor-pointer hover:bg-yellow-50 px-1 py-1 text-right text-sm"
            title="Click to edit"
        >
            {prefix}{value.toFixed(0)}
        </div>
    );
}

export default function AttendanceRow({
    serialNo,
    sheet,
    daysInMonth,
    onShiftChange,
    onFieldUpdate,
}: AttendanceRowProps) {
    return (
        <tr className="hover:bg-gray-50">
            {/* S.N. */}
            <td className="border border-gray-300 px-2 py-1 text-center text-sm sticky left-0 bg-white z-10">
                {serialNo}
            </td>
            {/* Employee Name */}
            <td className="border border-gray-300 px-3 py-1 font-medium text-sm sticky left-10 bg-white z-10 whitespace-nowrap">
                {sheet.labour.name}
            </td>
            {/* Day columns */}
            {Array.from({ length: daysInMonth }, (_, i) => (
                <td key={i} className="border border-gray-300 px-0 py-0">
                    <ShiftInput
                        value={sheet.attendanceJson[i] || 0}
                        onChange={(value) => onShiftChange(sheet.id, i, value)}
                    />
                </td>
            ))}
            {/* Total Shifts */}
            <td className="border border-gray-300 px-2 py-1 text-center text-sm font-bold text-orange-700 bg-orange-50">
                {sheet.totalShifts.toFixed(1)}
            </td>
            {/* OP BAL */}
            <td className="border border-gray-300 px-2 py-1 text-right text-sm">
                {sheet.openingBalance.toFixed(0)}
            </td>
            {/* RATE - editable */}
            <td className="border border-gray-300 px-1 py-0 bg-gray-50">
                <EditableCell
                    value={sheet.dailyRate}
                    field="dailyRate"
                    sheetId={sheet.id}
                    onSave={onFieldUpdate}
                />
            </td>
            {/* WAGES - auto */}
            <td className="border border-gray-300 px-2 py-1 text-right text-sm font-semibold bg-green-50">
                {sheet.wages.toFixed(0)}
            </td>
            {/* INCENTIVE - editable */}
            <td className="border border-gray-300 px-1 py-0 bg-yellow-50">
                <EditableCell
                    value={sheet.incentive}
                    field="incentive"
                    sheetId={sheet.id}
                    onSave={onFieldUpdate}
                />
            </td>
            {/* NET WAGES - auto */}
            <td className="border border-gray-300 px-2 py-1 text-right text-sm font-bold bg-blue-50">
                {sheet.netWages.toFixed(0)}
            </td>
            {/* ADVANCE - editable */}
            <td className="border border-gray-300 px-1 py-0 bg-red-50">
                <EditableCell
                    value={sheet.totalAdvance}
                    field="totalAdvance"
                    sheetId={sheet.id}
                    onSave={onFieldUpdate}
                />
            </td>
            {/* NET PAYABLE - auto */}
            <td className="border border-gray-300 px-2 py-1 text-right text-sm font-bold bg-purple-50">
                {sheet.netPayable.toFixed(0)}
            </td>
            {/* PAID - editable */}
            <td className="border border-gray-300 px-1 py-0 bg-green-50">
                <EditableCell
                    value={sheet.totalPaid}
                    field="totalPaid"
                    sheetId={sheet.id}
                    onSave={onFieldUpdate}
                />
            </td>
            {/* BAL DUE - auto */}
            <td className="border border-gray-300 px-2 py-1 text-right text-sm font-bold text-red-600 bg-red-50">
                {sheet.balanceDue.toFixed(0)}
            </td>
        </tr>
    );
}
