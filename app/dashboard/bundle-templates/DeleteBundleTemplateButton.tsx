"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/lib/hooks/useToast";

interface DeleteBundleTemplateButtonProps {
    templateId: string;
    templateName: string;
}

export default function DeleteBundleTemplateButton({ templateId, templateName }: DeleteBundleTemplateButtonProps) {
    const router = useRouter();
    const { success, error } = useToast();
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const response = await fetch(`/api/bundle-templates/${templateId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                success(`Bundle Template "${templateName}" deleted successfully`);
                router.refresh();
            } else {
                const data = await response.json();
                error(data.error || "Failed to delete bundle template");
            }
        } catch (err) {
            console.error("Error deleting bundle template:", err);
            error("An error occurred while deleting the bundle template");
        } finally {
            setDeleting(false);
            setShowConfirm(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setShowConfirm(true)}
                className="text-red-600 hover:text-red-700 text-sm font-medium ml-2"
            >
                Delete
            </button>

            {showConfirm && mounted && createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
                        <h3 className="text-xl font-bold text-red-600 mb-4">
                            ⚠️ Confirm Deletion
                        </h3>
                        <p className="text-gray-700 mb-6 break-words">
                            Are you sure you want to delete <strong>&quot;{templateName}&quot;</strong>? This action cannot be undone.
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
                </div>,
                document.body
            )}
        </>
    );
}
