"use client";

import { useState, useEffect } from "react";
import CategoryItemDropdown from "@/components/CategoryItemDropdown";
import TentKitSelector from "@/components/TentKitSelector";
import { useToast } from "@/lib/hooks/useToast";

type InventoryItem = {
    id: string;
    name: string;
    quantityAvailable: number;
    category: { id: string; name: string };
    subcategory: { id: string; name: string } | null;
};

type DeployedItem = {
    itemId: string;
    itemName: string;
    quantityDeployed: number;
    availableQuantity: number;
    shiftType: "WAREHOUSE" | "SITE";
    expectedReturnDate?: string;
    notes?: string;
    fromKitName?: string;
};

interface DeployItemsModalProps {
    siteId: string;
    siteName: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function DeployItemsModal({
    siteId,
    siteName,
    onClose,
    onSuccess,
}: DeployItemsModalProps) {
    const { success, error } = useToast();
    const [allItems, setAllItems] = useState<InventoryItem[]>([]);
    const [loadingItems, setLoadingItems] = useState(true);
    const [deployedItems, setDeployedItems] = useState<DeployedItem[]>([]);
    const [selectedItemId, setSelectedItemId] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetch("/api/inventory/items?all=true&showKitComponents=true")
            .then((r) => r.json())
            .then((data) => setAllItems(data.data || []))
            .catch(console.error)
            .finally(() => setLoadingItems(false));
    }, []);

    // Add all tent kit components (merges with existing)
    const handleAddKitComponents = (kitItems: DeployedItem[]) => {
        setDeployedItems((prev) => {
            const updated = [...prev];
            for (const kitItem of kitItems) {
                const idx = updated.findIndex((di) => di.itemId === kitItem.itemId);
                if (idx >= 0) {
                    updated[idx] = { ...updated[idx], quantityDeployed: kitItem.quantityDeployed };
                } else {
                    updated.push(kitItem);
                }
            }
            return updated;
        });
    };

    // Add individual item
    const handleAddItem = () => {
        if (!selectedItemId) return;
        if (deployedItems.find((d) => d.itemId === selectedItemId)) {
            error("This item is already in the list");
            setSelectedItemId("");
            return;
        }
        const item = allItems.find((i) => i.id === selectedItemId);
        if (!item) return;
        setDeployedItems((prev) => [
            ...prev,
            {
                itemId: item.id,
                itemName: item.name,
                quantityDeployed: 1,
                availableQuantity: item.quantityAvailable,
                shiftType: "SITE",
            },
        ]);
        setSelectedItemId("");
    };

    const handleRemoveItem = (itemId: string) => {
        setDeployedItems((prev) => prev.filter((d) => d.itemId !== itemId));
    };

    const updateField = <K extends keyof DeployedItem>(
        itemId: string,
        field: K,
        value: DeployedItem[K]
    ) => {
        setDeployedItems((prev) =>
            prev.map((d) => (d.itemId === itemId ? { ...d, [field]: value } : d))
        );
    };

    const handleSubmit = async () => {
        if (deployedItems.length === 0) {
            error("Add at least one item to deploy");
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`/api/sites/${siteId}/deploy`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deployedItems }),
            });
            const data = await res.json();
            if (res.ok) {
                success(data.message || "Items deployed successfully!");
                onSuccess();
                onClose();
            } else {
                error(data.error || "Failed to deploy items");
            }
        } catch (err) {
            console.error(err);
            error("An error occurred while deploying items");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Deploy Items to Site</h2>
                        <p className="text-sm text-gray-500 mt-0.5">{siteName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                    {/* Tent Kit Selector */}
                    <TentKitSelector
                        onAddKitComponents={handleAddKitComponents}
                        existingItemIds={deployedItems.map((d) => d.itemId)}
                    />

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 border-t border-gray-200" />
                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                            or add individual item
                        </span>
                        <div className="flex-1 border-t border-gray-200" />
                    </div>

                    {/* Individual Item Selector */}
                    {loadingItems ? (
                        <div className="text-sm text-gray-400 text-center py-2">Loading items...</div>
                    ) : (
                        <div className="flex gap-3">
                            <CategoryItemDropdown
                                items={allItems}
                                selectedItemId={selectedItemId}
                                onSelectItem={setSelectedItemId}
                                placeholder="Select an item to deploy..."
                            />
                            <button
                                type="button"
                                onClick={handleAddItem}
                                disabled={!selectedItemId}
                                className="btn btn-secondary disabled:opacity-50 whitespace-nowrap"
                            >
                                + Add Item
                            </button>
                        </div>
                    )}

                    {/* Deployed Items List */}
                    {deployedItems.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                                Items to Deploy
                                <span className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full font-bold">
                                    {deployedItems.length}
                                </span>
                            </h4>
                            {deployedItems.map((item) => (
                                <div key={item.itemId} className="border rounded-xl p-4 bg-gray-50 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-gray-900 text-sm">{item.itemName}</p>
                                            {item.fromKitName && (
                                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full mt-1 inline-block">
                                                    ⛺ {item.fromKitName}
                                                </span>
                                            )}
                                            <p className="text-xs text-gray-500 mt-1">
                                                {item.availableQuantity} available in stock
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveItem(item.itemId)}
                                            className="text-red-500 hover:text-red-700 text-sm p-1 rounded hover:bg-red-50 transition"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 block mb-1">
                                                Quantity <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={item.availableQuantity}
                                                value={item.quantityDeployed}
                                                onChange={(e) =>
                                                    updateField(item.itemId, "quantityDeployed", Math.max(1, parseInt(e.target.value) || 1))
                                                }
                                                className={`input text-sm ${item.quantityDeployed > item.availableQuantity
                                                    ? "border-red-400 ring-1 ring-red-400"
                                                    : ""
                                                    }`}
                                            />
                                            {item.quantityDeployed > item.availableQuantity && (
                                                <p className="text-xs text-red-600 mt-1">Exceeds available stock!</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 block mb-1">
                                                Expected Return
                                            </label>
                                            <input
                                                type="date"
                                                value={item.expectedReturnDate || ""}
                                                onChange={(e) => updateField(item.itemId, "expectedReturnDate", e.target.value)}
                                                className="input text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-gray-600 block mb-1">Notes</label>
                                        <input
                                            type="text"
                                            placeholder="Optional notes for this item"
                                            value={item.notes || ""}
                                            onChange={(e) => updateField(item.itemId, "notes", e.target.value)}
                                            className="input text-sm"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {deployedItems.length === 0 && !loadingItems && (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            Select a tent kit above or add individual items to deploy
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t flex gap-3 bg-white rounded-b-2xl">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || deployedItems.length === 0}
                        className="btn btn-primary flex-1 disabled:opacity-50"
                    >
                        {submitting
                            ? "Deploying..."
                            : `Deploy ${deployedItems.length > 0 ? `${deployedItems.length} Item${deployedItems.length > 1 ? "s" : ""}` : "Items"}`}
                    </button>
                    <button onClick={onClose} className="btn btn-secondary flex-1">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
