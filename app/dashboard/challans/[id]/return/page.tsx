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

type ReturnData = {
    challanItemId: string;
    returnedQuantity: number;
    returnStatus: "RETURNED" | "REPAIR" | "SCRAP" | "TRANSFERRED";
    returnNotes: string;
};

export default function ReturnChallanPage() {
    const router = useRouter();
    const params = useParams();
    const challanId = params.id as string;
    const { success, error } = useToast();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [challan, setChallan] = useState<Challan | null>(null);
    const [returnData, setReturnData] = useState<ReturnData[]>([]);

    useEffect(() => {
        fetchChallan();
    }, [challanId]);

    const fetchChallan = async () => {
        try {
            const res = await fetch(`/api/challans/${challanId}`);
            if (res.ok) {
                const data = await res.json();
                setChallan(data);
                // Initialize return data
                setReturnData(
                    data.items.map((item: ChallanItem) => ({
                        challanItemId: item.id,
                        returnedQuantity: item.quantity - item.returnedQuantity,
                        returnStatus: "RETURNED" as const,
                        returnNotes: "",
                    }))
                );
            }
        } catch (error) {
            console.error("Error fetching challan:", error);
        } finally {
            setLoading(false);
        }
    };

    const updateReturnItem = (index: number, field: string, value: string | number) => {
        setReturnData((prev) =>
            prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
        );
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const res = await fetch(`/api/challans/${challanId}/return`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: returnData }),
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
                    </ul>
                </div>

                {/* Items Table */}
                <div className="card">
                    <h2 className="text-lg font-semibold mb-4">Items to Return</h2>
                    <div className="space-y-4">
                        {challan.items.map((item, index) => {
                            const remainingQty = item.quantity - item.returnedQuantity;
                            const isFullyReturned = remainingQty === 0;

                            return (
                                <div
                                    key={item.id}
                                    className={`border rounded-lg p-4 ${isFullyReturned ? "bg-gray-100 opacity-60" : ""}`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-semibold">{item.item.name}</h4>
                                            <p className="text-sm text-gray-600">{item.item.category.name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-600">Original Qty: <strong>{item.quantity}</strong></p>
                                            {item.returnedQuantity > 0 && (
                                                <p className="text-sm text-green-600">Already Returned: <strong>{item.returnedQuantity}</strong></p>
                                            )}
                                            <p className="text-sm text-orange-600">Remaining: <strong>{remainingQty}</strong></p>
                                        </div>
                                    </div>

                                    {!isFullyReturned && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="text-xs text-gray-600">Return Quantity</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={remainingQty}
                                                    className="input"
                                                    value={returnData[index]?.returnedQuantity || 0}
                                                    onChange={(e) =>
                                                        updateReturnItem(index, "returnedQuantity", parseInt(e.target.value) || 0)
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-600">Return Status</label>
                                                <select
                                                    className="input"
                                                    value={returnData[index]?.returnStatus || "RETURNED"}
                                                    onChange={(e) => updateReturnItem(index, "returnStatus", e.target.value)}
                                                >
                                                    <option value="RETURNED">✓ Returned to Stock</option>
                                                    <option value="REPAIR">🔧 Needs Repair</option>
                                                    <option value="SCRAP">🗑️ Mark as Scrap</option>
                                                    <option value="TRANSFERRED">↔️ Transferred</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-600">Notes</label>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    placeholder="Optional notes"
                                                    value={returnData[index]?.returnNotes || ""}
                                                    onChange={(e) => updateReturnItem(index, "returnNotes", e.target.value)}
                                                />
                                            </div>
                                        </div>
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
