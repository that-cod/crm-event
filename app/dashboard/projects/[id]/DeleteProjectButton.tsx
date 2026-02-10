"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/lib/hooks/useToast";

interface DeleteProjectButtonProps {
    projectId: string;
    projectName: string;
}

export default function DeleteProjectButton({ projectId, projectName }: DeleteProjectButtonProps) {
    const router = useRouter();
    const { success, error } = useToast();
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const response = await fetch(`/api/projects/${projectId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                success("Project deleted successfully");
                router.push("/dashboard/projects");
                router.refresh();
            } else {
                const data = await response.json();
                error(data.error || "Failed to delete project");
            }
        } catch (err) {
            console.error("Error deleting project:", err);
            error("An error occurred while deleting the project");
        } finally {
            setDeleting(false);
            setShowConfirm(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setShowConfirm(true)}
                className="btn bg-red-600 text-white hover:bg-red-700"
            >
                🗑️ Delete Project
            </button>

            {/* Delete Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
                        <h3 className="text-xl font-bold text-red-600 mb-4">
                            ⚠️ Confirm Deletion
                        </h3>
                        <p className="text-gray-700 mb-6">
                            Are you sure you want to delete <strong>&quot;{projectName}&quot;</strong>? This action cannot be undone.
                            <br />
                            <br />
                            <strong>Note:</strong> This will also delete all associated records including stock movements and challans.
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
