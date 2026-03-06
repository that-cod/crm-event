"use client";

import { useState, useEffect } from "react";

type KitComponent = {
    id: string;
    name: string;
    componentType: string | null;
    quantityPerKit: number;
    availableQuantity: number;
    availableKits: number;
};

type TentKit = {
    id: string;
    name: string;
    subcategory: string | null;
    availableKits: number;
    isBalanced: boolean;
    components: KitComponent[];
};

type DeployedItem = {
    itemId: string;
    itemName: string;
    quantityDeployed: number;
    availableQuantity: number;
    shiftType: "WAREHOUSE" | "SITE";
    expectedReturnDate?: string;
    notes?: string;
    fromKitName?: string; // tracks which kit this came from
};

interface TentKitSelectorProps {
    /** Called with all expanded component items when a kit is confirmed */
    onAddKitComponents: (items: DeployedItem[]) => void;
    /** Already deployed item IDs — used to warn about duplicates */
    existingItemIds?: string[];
}

export default function TentKitSelector({
    onAddKitComponents,
    existingItemIds = [],
}: TentKitSelectorProps) {
    const [kits, setKits] = useState<TentKit[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedKit, setSelectedKit] = useState<TentKit | null>(null);
    const [kitQty, setKitQty] = useState(1);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        fetch("/api/tent-kits")
            .then((r) => r.json())
            .then((data) => setKits(data.kits || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleSelectKit = (kit: TentKit) => {
        setSelectedKit(kit);
        setKitQty(1);
    };

    const handleAddKit = () => {
        if (!selectedKit || kitQty < 1) return;

        const items: DeployedItem[] = selectedKit.components.map((comp) => ({
            itemId: comp.id,
            itemName: comp.name,
            quantityDeployed: comp.quantityPerKit * kitQty,
            availableQuantity: comp.availableQuantity,
            shiftType: "SITE",
            fromKitName: `${selectedKit.name} (×${kitQty})`,
        }));

        onAddKitComponents(items);
        setSelectedKit(null);
        setKitQty(1);
        setExpanded(false);
    };

    const maxKitsForSelected = selectedKit
        ? Math.min(selectedKit.availableKits, 999)
        : 0;

    return (
        <div className="border border-amber-200 rounded-xl bg-amber-50 overflow-hidden">
            {/* Header / Toggle */}
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-100 transition"
            >
                <div className="flex items-center gap-2">
                    <span className="text-xl">⛺</span>
                    <span className="font-semibold text-amber-900 text-sm">
                        Add Complete Tent Kit
                    </span>
                    <span className="text-xs text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full">
                        Auto-adds all components
                    </span>
                </div>
                <svg
                    className={`w-4 h-4 text-amber-700 transition-transform ${expanded ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Expanded Content */}
            {expanded && (
                <div className="px-4 pb-4 border-t border-amber-200">
                    {loading ? (
                        <div className="py-6 text-center text-sm text-amber-700">Loading tent kits...</div>
                    ) : kits.length === 0 ? (
                        <div className="py-6 text-center text-sm text-amber-700">
                            No tent kits found. Please set them up in{" "}
                            <a href="/dashboard/tent-kits" target="_blank" className="underline font-medium">
                                Tent Kits management
                            </a>
                            .
                        </div>
                    ) : (
                        <div className="mt-3 space-y-3">
                            {/* Kit Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {kits.map((kit) => {
                                    const isSelected = selectedKit?.id === kit.id;
                                    const hasStock = kit.availableKits > 0;
                                    return (
                                        <button
                                            key={kit.id}
                                            type="button"
                                            disabled={!hasStock}
                                            onClick={() => handleSelectKit(isSelected ? null! : kit)}
                                            className={`text-left p-3 rounded-lg border-2 transition-all ${isSelected
                                                ? "border-amber-500 bg-amber-100 shadow-md"
                                                : hasStock
                                                    ? "border-amber-200 bg-white hover:border-amber-400 hover:bg-amber-50"
                                                    : "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                                                }`}
                                        >
                                            <div className="flex justify-between items-start gap-1">
                                                <p className="font-semibold text-sm text-gray-900 leading-tight">{kit.name}</p>
                                                {isSelected && (
                                                    <span className="text-amber-600 text-lg leading-none">✓</span>
                                                )}
                                            </div>
                                            {kit.subcategory && (
                                                <p className="text-xs text-gray-500 mt-0.5">{kit.subcategory}</p>
                                            )}
                                            <div className="mt-2 flex items-center justify-between">
                                                <span className="text-xs text-gray-500">
                                                    {kit.components.length} components
                                                </span>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${hasStock
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-red-100 text-red-600"
                                                    }`}>
                                                    {kit.availableKits} avail
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Selected Kit: Qty + Components Preview */}
                            {selectedKit && (
                                <div className="mt-3 p-4 bg-white rounded-lg border border-amber-300 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-semibold text-gray-900 text-sm">
                                            {selectedKit.name}
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs text-gray-600">No. of tents:</label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={maxKitsForSelected}
                                                value={kitQty}
                                                onChange={(e) => setKitQty(Math.max(1, Math.min(maxKitsForSelected, parseInt(e.target.value) || 1)))}
                                                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center font-semibold focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                                            />
                                        </div>
                                    </div>

                                    {/* Component breakdown */}
                                    <div className="mb-3 bg-amber-50 rounded-lg p-3">
                                        <p className="text-xs font-medium text-amber-800 mb-2">
                                            Will add these {selectedKit.components.length} items:
                                        </p>
                                        <div className="space-y-1">
                                            {selectedKit.components.map((comp) => {
                                                const totalQty = comp.quantityPerKit * kitQty;
                                                const isAlreadyAdded = existingItemIds.includes(comp.id);
                                                const hasEnough = comp.availableQuantity >= totalQty;
                                                return (
                                                    <div
                                                        key={comp.id}
                                                        className={`flex justify-between items-center text-xs py-1 px-2 rounded ${isAlreadyAdded
                                                            ? "bg-yellow-100 text-yellow-800"
                                                            : !hasEnough
                                                                ? "bg-red-50 text-red-700"
                                                                : "text-gray-700"
                                                            }`}
                                                    >
                                                        <span className="flex-1">
                                                            {isAlreadyAdded && "⚠ "}
                                                            {comp.name}
                                                            {comp.componentType && (
                                                                <span className="text-gray-400 ml-1">({comp.componentType})</span>
                                                            )}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold">×{totalQty}</span>
                                                            {!hasEnough && (
                                                                <span className="text-red-600 font-medium">
                                                                    (only {comp.availableQuantity} in stock)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Warnings */}
                                    {existingItemIds.some((id) =>
                                        selectedKit.components.some((c) => c.id === id)
                                    ) && (
                                            <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 mb-3">
                                                ⚠️ Some components are already in your list — they will be updated with the new quantities.
                                            </p>
                                        )}

                                    <button
                                        type="button"
                                        onClick={handleAddKit}
                                        className="w-full btn btn-primary text-sm py-2"
                                    >
                                        ⛺ Add {kitQty} × {selectedKit.name} ({selectedKit.components.length} items)
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
