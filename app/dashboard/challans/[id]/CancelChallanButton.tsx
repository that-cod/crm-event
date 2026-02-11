"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/hooks/useToast";

interface CancelChallanButtonProps {
    challanId: string;
    challanNumber: string;
    status: string;
}

export default function CancelChallanButton({ challanId, challanNumber, status }: CancelChallanButtonProps) {
    const router = useRouter();
    const { success, error } = useToast();
    const [isCancelling, setIsCancelling] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Don't show cancel button for already cancelled, returned, or partially returned challans
    if (status === "CANCELLED" || status === "RETURNED" || status === "PARTIALLY_RETURNED") {
        return null;
    }

    const handleCancel = async () => {
        setIsCancelling(true);
        try {
            const response = await fetch(`/api/challans/${challanId}/cancel`, {
                method: "POST",
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to cancel challan");
            }

            const data = await response.json();
            success(data.message || "Challan cancelled successfully");
            setShowConfirm(false);
            router.refresh();
        } catch (err) {
            console.error("Error cancelling challan:", err);
            error(err instanceof Error ? err.message : "Failed to cancel challan");
        } finally {
            setIsCancelling(false);
        }
    };

    if (!showConfirm) {
        return (
            <button
                onClick={() => setShowConfirm(true)}
                className="btn bg-red-600 text-white hover:bg-red-700"
            >
                🚫 Cancel Challan
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                            Cancel Challan {challanNumber}?
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                            This action will:
                        </p>
                        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                            <li>Mark the challan as cancelled</li>
                            <li>Return all items to inventory</li>
                            <li>Create stock movement records</li>
                        </ul>
                        <p className="text-sm text-red-600 font-medium mt-3">
                            This action cannot be undone.
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={() => setShowConfirm(false)}
                        className="btn btn-secondary"
                        disabled={isCancelling}
                    >
                        No, Keep Challan
                    </button>
                    <button
                        onClick={handleCancel}
                        className="btn bg-red-600 text-white hover:bg-red-700"
                        disabled={isCancelling}
                    >
                        {isCancelling ? "Cancelling..." : "Yes, Cancel Challan"}
                    </button>
                </div>
            </div>
        </div>
    );
}
