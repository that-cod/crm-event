"use client";

import { useDroppable } from "@dnd-kit/core";
import { Truck } from "../types";

type TruckDropZoneProps = {
    truck: Truck;
    onRemoveItem: (truckId: string, itemId: string) => void;
    onRemoveTruck: (truckId: string) => void;
    onCreateChallan: (truckId: string) => void;
    isCreating: boolean;
};

export default function TruckDropZone({
    truck,
    onRemoveItem,
    onRemoveTruck,
    onCreateChallan,
    isCreating,
}: TruckDropZoneProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: truck.id,
    });

    return (
        <div
            ref={setNodeRef}
            className={`
        card p-4 border-2 transition-all
        ${isOver ? "border-primary-500 bg-primary-50" : "border-gray-300"}
      `}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b">
                <h3 className="text-lg font-bold text-gray-900">
                    🚛 Truck {truck.number}
                </h3>
                <button
                    onClick={() => onRemoveTruck(truck.id)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                    title="Remove truck"
                >
                    ✕ Remove
                </button>
            </div>

            {/* Drop Zone */}
            <div
                className={`
          min-h-[200px] border-2 border-dashed rounded-lg p-3
          ${isOver ? "border-primary-400 bg-primary-100" : "border-gray-300"}
          ${truck.items.length === 0 ? "flex items-center justify-center" : ""}
        `}
            >
                {truck.items.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center">
                        Drop items here
                    </p>
                ) : (
                    <div className="space-y-2">
                        {truck.items.map((item) => (
                            <div
                                key={item.itemId}
                                className="bg-gray-50 border border-gray-200 rounded p-2 flex items-center justify-between"
                            >
                                <div className="flex-1">
                                    <p className="font-medium text-sm text-gray-900">
                                        {item.itemName}
                                    </p>
                                    <p className="text-xs text-gray-600">{item.categoryName}</p>
                                </div>
                                <div className="text-right mr-3">
                                    <p className="text-sm font-bold text-primary-600">
                                        Qty: {item.quantity}
                                    </p>
                                </div>
                                <button
                                    onClick={() => onRemoveItem(truck.id, item.itemId)}
                                    className="text-red-500 hover:text-red-700 text-sm"
                                    title="Remove item"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Challan Button */}
            {truck.items.length > 0 && (
                <button
                    onClick={() => onCreateChallan(truck.id)}
                    disabled={isCreating}
                    className="btn btn-primary w-full mt-4 disabled:opacity-50"
                >
                    {isCreating ? "Creating..." : "📄 Create Challan for this Truck"}
                </button>
            )}
        </div>
    );
}
