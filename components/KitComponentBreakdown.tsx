"use client";

import { useState } from "react";

interface KitComponent {
    id: string;
    name: string;
    componentType: string | null;
    quantityPerKit: number;
    availableQuantity: number;
}

interface KitComponentBreakdownProps {
    kitName: string;
    kitQuantity: number;
    components: KitComponent[];
    mode: "editable" | "readonly";
    collapsible?: boolean;
    onComponentUpdate?: (componentId: string, newQuantity: number) => void;
    onSave?: () => void;
}

export default function KitComponentBreakdown({
    kitName,
    kitQuantity,
    components,
    mode,
    collapsible = false,
    onComponentUpdate,
    onSave,
}: KitComponentBreakdownProps) {
    const [isExpanded, setIsExpanded] = useState(!collapsible);
    const [editedQuantities, setEditedQuantities] = useState<Record<string, number>>({});

    const handleQuantityChange = (componentId: string, newQuantity: number) => {
        setEditedQuantities({ ...editedQuantities, [componentId]: newQuantity });
        if (onComponentUpdate) {
            onComponentUpdate(componentId, newQuantity);
        }
    };

    const calculateTotalQuantity = (component: KitComponent) => {
        if (editedQuantities[component.id] !== undefined) {
            return editedQuantities[component.id];
        }
        // Handle cases where quantityPerKit might be null or undefined
        const perKit = component.quantityPerKit ?? 0;
        return kitQuantity * perKit;
    };

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Kit Header */}
            <div
                className={`bg-blue-50 border-b border-blue-200 p-3 ${collapsible ? "cursor-pointer hover:bg-blue-100" : ""
                    }`}
                onClick={() => collapsible && setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {collapsible && (
                            <span className="text-blue-600 font-bold">
                                {isExpanded ? "▼" : "▶"}
                            </span>
                        )}
                        <span className="font-semibold text-blue-900">
                            {kitName}
                            <span className="text-blue-700 ml-2">(×{kitQuantity})</span>
                        </span>
                    </div>
                    <span className="text-sm text-blue-600">
                        {components.length} component{components.length !== 1 ? "s" : ""}
                    </span>
                </div>
            </div>

            {/* Component List */}
            {isExpanded && (
                <div className="bg-white">
                    <div className="p-4 space-y-2">
                        {components.map((component) => {
                            const totalQty = calculateTotalQuantity(component);

                            return (
                                <div
                                    key={component.id}
                                    className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded border border-gray-200"
                                >
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900">
                                            {component.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {component.quantityPerKit ?? 0} per kit
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {mode === "editable" ? (
                                            <>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={totalQty}
                                                    onChange={(e) =>
                                                        handleQuantityChange(
                                                            component.id,
                                                            parseInt(e.target.value) || 0
                                                        )
                                                    }
                                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                                />
                                                <span className="text-xs text-gray-500 w-24">
                                                    Available: {component.availableQuantity}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="font-semibold text-gray-900 text-lg">
                                                {totalQty}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {mode === "editable" && onSave && Object.keys(editedQuantities).length > 0 && (
                        <div className="px-4 pb-4">
                            <button
                                onClick={onSave}
                                className="btn btn-primary w-full text-sm"
                            >
                                💾 Save Changes
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
