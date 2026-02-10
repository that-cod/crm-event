"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/lib/hooks/useToast";

type QuickActionsProps = {
    itemId: string;
};

export default function QuickActions({ itemId }: QuickActionsProps) {
    const router = useRouter();
    const { success, error } = useToast();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const response = await fetch(`/api/inventory/items/${itemId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                success("Item deleted successfully");
                router.push("/dashboard/inventory");
                router.refresh();
            } else {
                const data = await response.json();
                error(data.error || "Failed to delete item");
            }
        } catch (err) {
            console.error("Error deleting item:", err);
            error("An error occurred while deleting the item");
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    return (
        <>
            <div className="card bg-gray-50">
                <h3 className="font-semibold mb-3">Quick Actions</h3>
                <div className="flex flex-wrap gap-3">
                    <Link
                        href={`/dashboard/stock-movements/new?itemId=${itemId}`}
                        className="btn btn-primary"
                    >
                        Record Movement
                    </Link>
                    <Link
                        href={`/dashboard/repairs/new?itemId=${itemId}`}
                        className="btn btn-secondary"
                    >
                        Report Repair
                    </Link>
                    <Link
                        href={`/dashboard/scrap/new?itemId=${itemId}`}
                        className="btn bg-orange-600 text-white hover:bg-orange-700"
                    >
                        Mark as Scrap
                    </Link>
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="btn bg-red-600 text-white hover:bg-red-700"
                    >
                        🗑️ Delete Item
                    </button>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
                        <h3 className="text-xl font-bold text-red-600 mb-4">
                            ⚠️ Confirm Deletion
                        </h3>
                        <p className="text-gray-700 mb-6">
                            Are you sure you want to delete this item? This action cannot be undone.
                            <br />
                            <br />
                            <strong>Note:</strong> This will also delete all associated records including stock movements, maintenance records, and challan items.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="btn btn-secondary"
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {deleting ? "Deleting..." : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
