"use client";

import { useDroppable } from "@dnd-kit/core";
import { Truck, TruckItem } from "../types";

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

    const capacityPercent = (truck.totalWeight / truck.capacity) * 100;
    const isOverCapacity = capacityPercent > 100;
    const isNearCapacity = capacityPercent > 80 && capacityPercent <= 100;

    const getCapacityColor = () => {
        if (isOverCapacity) return "bg-red-500";
        if (isNearCapacity) return "bg-orange-500";
        return "bg-green-500";
    };

    const getBorderColor = () => {
        if (isOver) return "border-primary-500 bg-primary-50";
        if (isOverCapacity) return "border-red-300";
        if (isNearCapacity) return "border-orange-300";
        return "border-gray-300";
    };

    return (
        <div
            ref={setNodeRef}
            className={`
        card p-4 border-2 transition-all
        ${getBorderColor()}
      `}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">
                        🚛 Truck {truck.number}
                    </h3>
                    <p className="text-sm text-gray-600">
                        Capacity: {truck.capacity.toLocaleString()} kg
                    </p>
                </div>
                <button
                    onClick={() => onRemoveTruck(truck.id)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                    title="Remove truck"
                >
                    ✕ Remove
                </button>
            </div>

            {/* Weight Progress */}
            <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Weight: {truck.totalWeight.toFixed(0)} kg</span>
                    <span className={isOverCapacity ? "text-red-600 font-bold" : ""}>
                        {capacityPercent.toFixed(0)}%
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                        className={`h-3 transition-all duration-300 ${getCapacityColor()}`}
                        style={{ width: `${Math.min(capacityPercent, 100)}%` }}
                    />
                </div>
                {isOverCapacity && (
                    <p className="text-xs text-red-600 mt-1 font-medium">
                        ⚠️ Over capacity by {(truck.totalWeight - truck.capacity).toFixed(0)} kg
                    </p>
                )}
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
                                        {item.quantity}
                                    </p>
                                    {item.totalWeight > 0 && (
                                        <p className="text-xs text-gray-500">
                                            {item.totalWeight.toFixed(0)} kg
                                        </p>
                                    )}
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
