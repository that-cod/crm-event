"use client";

import { useState } from "react";

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

export interface TransactionModalProps {
    sheetId: string;
    sheet: AttendanceSheet;
    onClose: () => void;
    onAddTransaction: (
        sheetId: string,
        type: "advance" | "payment",
        amount: number
    ) => void;
}

export default function TransactionModal({
    sheetId,
    sheet,
    onClose,
    onAddTransaction,
}: TransactionModalProps) {
    const [type, setType] = useState<"advance" | "payment">("advance");
    const [amount, setAmount] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amountNum = parseFloat(amount);
        if (amountNum > 0) {
            onAddTransaction(sheetId, type, amountNum);
            setAmount("");
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-xl font-bold mb-4">
                    💳 Add Transaction - {sheet.labour.name}
                </h3>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Transaction Type
                        </label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setType("advance")}
                                className={`flex-1 px-4 py-2 rounded-md font-medium ${type === "advance"
                                    ? "bg-orange-600 text-white"
                                    : "bg-gray-100 text-gray-700"
                                    }`}
                            >
                                Advance
                            </button>
                            <button
                                type="button"
                                onClick={() => setType("payment")}
                                className={`flex-1 px-4 py-2 rounded-md font-medium ${type === "payment"
                                    ? "bg-green-600 text-white"
                                    : "bg-gray-100 text-gray-700"
                                    }`}
                            >
                                Payment
                            </button>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Amount (₹)
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="input"
                            placeholder="Enter amount"
                            required
                            min="1"
                            step="1"
                        />
                    </div>

                    <div className="mb-4 p-3 bg-gray-50 rounded">
                        <p className="text-sm text-gray-600 mb-1">
                            Current Total Advance: <span className="font-semibold">₹{sheet.totalAdvance}</span>
                        </p>
                        <p className="text-sm text-gray-600">
                            Current Total Paid: <span className="font-semibold">₹{sheet.totalPaid}</span>
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 btn btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 btn btn-primary"
                        >
                            Add {type === "advance" ? "Advance" : "Payment"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
