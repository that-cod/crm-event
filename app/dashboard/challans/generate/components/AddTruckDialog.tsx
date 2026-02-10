"use client";

import { useState } from "react";

type AddTruckDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (capacity: number) => void;
};

export default function AddTruckDialog({
    isOpen,
    onClose,
    onAdd,
}: AddTruckDialogProps) {
    const [capacity, setCapacity] = useState(5000);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd(capacity);
        setCapacity(5000); // Reset
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                    🚛 Add New Truck
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">
                            Truck Capacity (kg) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            min="100"
                            step="100"
                            className="input"
                            value={capacity}
                            onChange={(e) => setCapacity(parseInt(e.target.value) || 1000)}
                            required
                            autoFocus
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Maximum weight this truck can carry
                        </p>
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary"
                        >
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            Add Truck
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
