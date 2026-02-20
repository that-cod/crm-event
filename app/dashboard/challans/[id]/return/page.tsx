"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";
import { useToast } from "@/lib/hooks/useToast";

type ChallanItem = {
    id: string;
    itemId: string;
    quantity: number;
    notes: string | null;
    returnedQuantity: number;
    returnStatus: string | null;
    returnNotes: string | null;
    item: {
        id: string;
        name: string;
        category: { name: string };
    };
};

type Challan = {
    id: string;
    challanNumber: string;
    status: string;
    project: { name: string };
    items: ChallanItem[];
};

type StatusEntry = {
    id: string;
    returnedQuantity: number;
    returnStatus: "RETURNED" | "REPAIR" | "SCRAP" | "TRANSFERRED";
    returnNotes: string;
};

type ItemReturnData = {
    challanItemId: string;
    originalQuantity: number;
    remainingQuantity: number;
    statusEntries: StatusEntry[];
};

export default function ReturnChallanPage() {
    const router = useRouter();
    const params = useParams();
    const challanId = params.id as string;
    const { success, error } = useToast();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [challan, setChallan] = useState<Challan | null>(null);
    const [returnData, setReturnData] = useState<ItemReturnData[]>([]);

    useEffect(() => {
        fetchChallan();
    }, [challanId]);

    const fetchChallan = async () => {
        try {
            const res = await fetch(`/api/challans/${challanId}`);
            if (res.ok) {
                const data = await res.json();
                setChallan(data);
                // Initialize return data with one status entry per item
                setReturnData(
                    data.items.map((item: ChallanItem) => {
                        const remaining = item.quantity - item.returnedQuantity;
                        return {
                            challanItemId: item.id,
                            originalQuantity: item.quantity,
                            remainingQuantity: remaining,
                            statusEntries: [
                                {
                                    id: `${item.id}-0`,
                                    returnedQuantity: remaining,
                                    returnStatus: "RETURNED" as const,
                                    returnNotes: "",
                                },
                            ],
                        };
                    })
                );
            }
        } catch (error) {
            console.error("Error fetching challan:", error);
        } finally {
            setLoading(false);
        }
    };

    const addStatusEntry = (itemIndex: number) => {
        setReturnData((prev) =>
            prev.map((item, i) =>
                i === itemIndex
                    ? {
                        ...item,
                        statusEntries: [
                            ...item.statusEntries,
                            {
                                id: `${item.challanItemId}-${item.statusEntries.length}`,
                                returnedQuantity: 0,
                                returnStatus: "RETURNED" as const,
                                returnNotes: "",
                            },
                        ],
                    }
                    : item
            )
        );
    };

    const removeStatusEntry = (itemIndex: number, entryId: string) => {
        setReturnData((prev) =>
            prev.map((item, i) =>
                i === itemIndex
                    ? {
                        ...item,
                        statusEntries: item.statusEntries.filter((e) => e.id !== entryId),
                    }
                    : item
            )
        );
    };

    const updateStatusEntry = (
        itemIndex: number,
        entryId: string,
        field: keyof StatusEntry,
        value: string | number
    ) => {
        setReturnData((prev) =>
            prev.map((item, i) =>
                i === itemIndex
                    ? {
                        ...item,
                        statusEntries: item.statusEntries.map((entry) =>
                            entry.id === entryId ? { ...entry, [field]: value } : entry
                        ),
                    }
                    : item
            )
        );
    };

    const calculateAccountedQuantity = (itemIndex: number): number => {
        return returnData[itemIndex].statusEntries.reduce(
            (sum, entry) => sum + (entry.returnedQuantity || 0),
            0
        );
    };

    const calculateRemainingQuantity = (itemIndex: number): number => {
        const accounted = calculateAccountedQuantity(itemIndex);
        return returnData[itemIndex].remainingQuantity - accounted;
    };

    const validateQuantities = (): { valid: boolean; message?: string } => {
        for (let i = 0; i < returnData.length; i++) {
            const item = returnData[i];
            const challanItem = challan?.items[i];
            const total = calculateAccountedQuantity(i);

            if (total !== item.remainingQuantity) {
                return {
                    valid: false,
                    message: `${challanItem?.item.name}: Total accounted (${total}) doesn't match remaining quantity (${item.remainingQuantity})`,
                };
            }

            // Check for zero quantities
            const hasZeroQuantity = item.statusEntries.some((e) => e.returnedQuantity <= 0);
            if (hasZeroQuantity) {
                return {
                    valid: false,
                    message: `${challanItem?.item.name}: All status entries must have quantity greater than 0`,
                };
            }
        }
        return { valid: true };
    };

    const handleSubmit = async () => {
        // Validate quantities
        const validation = validateQuantities();
        if (!validation.valid) {
            error(validation.message || "Validation failed");
            return;
        }

        setSubmitting(true);
        try {
            // Transform data to API format
            const apiData = {
                items: returnData.map((item) => ({
                    challanItemId: item.challanItemId,
                    statusEntries: item.statusEntries.map((entry) => ({
                        returnedQuantity: entry.returnedQuantity,
                        returnStatus: entry.returnStatus,
                        returnNotes: entry.returnNotes || null,
                    })),
                })),
            };

            const res = await fetch(`/api/challans/${challanId}/return`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(apiData),
            });

            if (res.ok) {
                const data = await res.json();
                success(data.message);
                router.push(`/dashboard/challans/${challanId}`);
            } else {
                const errorData = await res.json();
                error(errorData.error || "Failed to process return");
            }
        } catch (err) {
            console.error("Error processing return:", err);
            error("An error occurred while processing return");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div>
                <Header title="Process Return" subtitle="Loading..." />
                <div className="p-8 text-center">Loading challan data...</div>
            </div>
        );
    }

    if (!challan) {
        return (
            <div>
                <Header title="Process Return" subtitle="Error" />
                <div className="p-8 text-center text-red-600">Challan not found</div>
            </div>
        );
    }

    if (challan.status === "RETURNED") {
        return (
            <div>
                <Header title="Process Return" subtitle={challan.challanNumber} />
                <div className="p-8 max-w-4xl mx-auto">
                    <div className="card bg-green-50 border-green-200 text-center">
                        <p className="text-green-800 text-lg">✓ This challan is already fully returned</p>
                        <Link href={`/dashboard/challans/${challanId}`} className="btn btn-primary mt-4">
                            View Challan
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Header
                title="Process Return"
                subtitle={`Challan: ${challan.challanNumber} | Project: ${challan.project.name}`}
                action={
                    <Link href={`/dashboard/challans/${challanId}`} className="btn btn-secondary">
                        ← Back to Challan
                    </Link>
                }
            />

            <div className="p-8 max-w-5xl mx-auto space-y-6">
                {/* Status Banner */}
                {challan.status === "PARTIALLY_RETURNED" && (
                    <div className="card bg-yellow-50 border-yellow-200">
                        <p className="text-yellow-800">⚠️ This challan has been partially returned. You can continue processing remaining items.</p>
                    </div>
                )}

                {/* Instructions */}
                <div className="card bg-blue-50 border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-2">Return Instructions</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• <strong>RETURNED:</strong> Items returned in good condition - added back to stock</li>
                        <li>• <strong>REPAIR:</strong> Items need repair - sent to repair queue</li>
                        <li>• <strong>SCRAP:</strong> Items damaged beyond repair - marked as scrap</li>
                        <li>• <strong>TRANSFERRED:</strong> Items transferred to another site/project</li>
                        <li className="mt-2 text-blue-900 font-medium">⚠️ You must account for ALL items before submitting!</li>
                    </ul>
                </div>

                {/* Items */}
                <div className="card">
                    <h2 className="text-lg font-semibold mb-4">Items to Return</h2>
                    <div className="space-y-6">
                        {challan.items.map((item, itemIndex) => {
                            const isFullyReturned = item.quantity === item.returnedQuantity;
                            const remaining = calculateRemainingQuantity(itemIndex);
                            const accounted = calculateAccountedQuantity(itemIndex);
                            const isValid = remaining === 0 && accounted === returnData[itemIndex].remainingQuantity;

                            return (
                                <div
                                    key={item.id}
                                    className={`border-2 rounded-lg p-4 ${isFullyReturned
                                            ? "bg-gray-100 opacity-60 border-gray-300"
                                            : isValid
                                                ? "border-green-300 bg-green-50"
                                                : remaining < 0
                                                    ? "border-red-300 bg-red-50"
                                                    : "border-orange-300 bg-orange-50"
                                        }`}
                                >
                                    {/* Item Header */}
                                    <div className="flex justify-between items-start mb-3 pb-3 border-b">
                                        <div>
                                            <h4 className="font-semibold text-lg">{item.item.name}</h4>
                                            <p className="text-sm text-gray-600">{item.item.category.name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-600">
                                                Original Qty: <strong>{item.quantity}</strong>
                                            </p>
                                            {item.returnedQuantity > 0 && (
                                                <p className="text-sm text-green-600">
                                                    Already Returned: <strong>{item.returnedQuantity}</strong>
                                                </p>
                                            )}
                                            <p className="text-sm font-semibold text-orange-600">
                                                Remaining: <strong>{returnData[itemIndex].remainingQuantity}</strong>
                                            </p>
                                        </div>
                                    </div>

                                    {!isFullyReturned && (
                                        <>
                                            {/* Status Entries */}
                                            <div className="space-y-3 mb-3">
                                                {returnData[itemIndex].statusEntries.map((entry, entryIndex) => (
                                                    <div
                                                        key={entry.id}
                                                        className="bg-white border border-gray-200 rounded-lg p-3"
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs font-semibold text-gray-500">
                                                                Status Entry {entryIndex + 1}
                                                            </span>
                                                            {returnData[itemIndex].statusEntries.length > 1 && (
                                                                <button
                                                                    onClick={() => removeStatusEntry(itemIndex, entry.id)}
                                                                    className="text-red-500 hover:text-red-700 text-xs"
                                                                >
                                                                    ✕ Remove
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                            <div>
                                                                <label className="text-xs text-gray-600 block mb-1">
                                                                    Quantity
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    className="input"
                                                                    value={entry.returnedQuantity || ""}
                                                                    onChange={(e) =>
                                                                        updateStatusEntry(
                                                                            itemIndex,
                                                                            entry.id,
                                                                            "returnedQuantity",
                                                                            parseInt(e.target.value) || 0
                                                                        )
                                                                    }
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs text-gray-600 block mb-1">
                                                                    Status
                                                                </label>
                                                                <select
                                                                    className="input"
                                                                    value={entry.returnStatus}
                                                                    onChange={(e) =>
                                                                        updateStatusEntry(
                                                                            itemIndex,
                                                                            entry.id,
                                                                            "returnStatus",
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                >
                                                                    <option value="RETURNED">✓ Returned to Stock</option>
                                                                    <option value="REPAIR">🔧 Needs Repair</option>
                                                                    <option value="SCRAP">🗑️ Mark as Scrap</option>
                                                                    <option value="TRANSFERRED">↔️ Transferred</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="text-xs text-gray-600 block mb-1">
                                                                    Notes
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    className="input"
                                                                    placeholder="Optional notes"
                                                                    value={entry.returnNotes}
                                                                    onChange={(e) =>
                                                                        updateStatusEntry(
                                                                            itemIndex,
                                                                            entry.id,
                                                                            "returnNotes",
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Add Status Button */}
                                            <button
                                                onClick={() => addStatusEntry(itemIndex)}
                                                className="btn btn-sm btn-secondary w-full"
                                            >
                                                + Add Another Status
                                            </button>

                                            {/* Quantity Summary */}
                                            <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                                                <div className="flex justify-between">
                                                    <span>Total Accounted:</span>
                                                    <span className="font-semibold">{accounted}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Remaining Unaccounted:</span>
                                                    <span
                                                        className={`font-semibold ${remaining === 0
                                                                ? "text-green-600"
                                                                : remaining < 0
                                                                    ? "text-red-600"
                                                                    : "text-orange-600"
                                                            }`}
                                                    >
                                                        {remaining} {isValid && "✓"}
                                                    </span>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {isFullyReturned && (
                                        <div className="text-center text-green-600 text-sm">
                                            ✓ Fully returned ({item.returnStatus})
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Submit Button */}
                <div className="card bg-green-50 border-green-200">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-semibold text-green-900">Process Return</h3>
                            <p className="text-sm text-green-700">
                                This will update stock and create appropriate records
                            </p>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="btn btn-primary bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                            {submitting ? "Processing..." : "✓ Submit Return"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
