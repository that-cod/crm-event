"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/lib/hooks/useToast";

interface DeleteTentKitButtonProps {
    kitId: string;
    kitName: string;
}

export default function DeleteTentKitButton({ kitId, kitName }: DeleteTentKitButtonProps) {
    const router = useRouter();
    const { success, error } = useToast();
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const response = await fetch(`/api/tent-kits/${kitId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                success(`Tent Kit "${kitName}" deleted successfully`);
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            } else {
                const data = await response.json();
                error(data.error || "Failed to delete tent kit");
            }
        } catch (err) {
            console.error("Error deleting tent kit:", err);
            error("An error occurred while deleting the tent kit");
        } finally {
            setDeleting(false);
            setShowConfirm(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setShowConfirm(true)}
                className="btn btn-outline text-red-600 border-red-200 hover:bg-red-50 flex-1 text-sm"
            >
                Delete
            </button>

            {showConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
                        <h3 className="text-xl font-bold text-red-600 mb-4">
                            ⚠️ Confirm Deletion
                        </h3>
                        <p className="text-gray-700 mb-6">
                            Are you sure you want to delete <strong>&quot;{kitName}&quot;</strong>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowConfirm(false)}
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
