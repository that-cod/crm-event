"use client";

import { useState, useEffect } from "react";

type QuantityDialogProps = {
    isOpen: boolean;
    itemName: string;
    availableQuantity: number;
    onConfirm: (quantity: number) => void;
    onCancel: () => void;
};

export default function QuantityDialog({
    isOpen,
    itemName,
    availableQuantity,
    onConfirm,
    onCancel,
}: QuantityDialogProps) {
    const [quantity, setQuantity] = useState("");
    const [error, setError] = useState("");

    // Reset state when dialog opens
    useEffect(() => {
        if (isOpen) {
            setQuantity("");
            setError("");
        }
    }, [isOpen]);

    const handleConfirm = () => {
        const qty = parseInt(quantity);

        // Validation
        if (!quantity || isNaN(qty)) {
            setError("Please enter a valid quantity");
            return;
        }

        if (qty <= 0) {
            setError("Quantity must be greater than 0");
            return;
        }

        if (qty > availableQuantity) {
            setError(`Quantity cannot exceed ${availableQuantity}`);
            return;
        }

        onConfirm(qty);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleConfirm();
        } else if (e.key === "Escape") {
            onCancel();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={onCancel}
            />

            {/* Dialog */}
            <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Select Quantity to Drop
                </h3>

                <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Item:</span> {itemName}
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                        <span className="font-medium">Available:</span> {availableQuantity}
                    </p>

                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity to drop in truck:
                    </label>
                    <input
                        type="number"
                        min="1"
                        max={availableQuantity}
                        value={quantity}
                        onChange={(e) => {
                            setQuantity(e.target.value);
                            setError("");
                        }}
                        onKeyDown={handleKeyDown}
                        className="input w-full"
                        placeholder={`Enter quantity (max: ${availableQuantity})`}
                        autoFocus
                    />

                    {error && (
                        <p className="text-sm text-red-600 mt-2">{error}</p>
                    )}
                </div>

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="btn btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="btn btn-primary"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
}
