"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/hooks/useToast";

interface ChallanItem {
    id: string;
    itemId: string;
    quantity: number;
    notes: string | null;
    item: {
        id: string;
        name: string;
        category: {
            name: string;
        };
        quantityAvailable: number;
        imageUrl1: string | null;
    };
}

interface AvailableItem {
    id: string;
    name: string;
    category: {
        name: string;
    };
    quantityAvailable: number;
}

interface ChallanItemsEditProps {
    challanId: string;
    projectId: string;
    initialItems: ChallanItem[];
}

export default function ChallanItemsEdit({ challanId, projectId, initialItems }: ChallanItemsEditProps) {
    const router = useRouter();
    const { success, error } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [items, setItems] = useState(initialItems);
    const [availableItems, setAvailableItems] = useState<AvailableItem[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [showAddItem, setShowAddItem] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState("");
    const [selectedQuantity, setSelectedQuantity] = useState(1);

    useEffect(() => {
        if (isEditing && availableItems.length === 0) {
            fetchAvailableItems();
        }
    }, [isEditing]);

    const fetchAvailableItems = async () => {
        setLoadingItems(true);
        try {
            const response = await fetch("/api/inventory/items");
            if (response.ok) {
                const data = await response.json();
                setAvailableItems(Array.isArray(data) ? data : data.data || []);
            }
        } catch (err) {
            console.error("Error fetching items:", err);
            error("Failed to load available items");
        } finally {
            setLoadingItems(false);
        }
    };

    const handleQuantityChange = (itemId: string, newQuantity: number) => {
        if (newQuantity < 1) return;
        setItems(items.map(item => 
            item.id === itemId ? { ...item, quantity: newQuantity } : item
        ));
    };

    const handleNotesChange = (itemId: string, newNotes: string) => {
        setItems(items.map(item => 
            item.id === itemId ? { ...item, notes: newNotes } : item
        ));
    };

    const handleRemoveItem = (itemId: string) => {
        if (items.length === 1) {
            error("Cannot remove the last item. Challan must have at least one item.");
            return;
        }
        setItems(items.filter(item => item.id !== itemId));
    };

    const handleAddItem = () => {
        if (!selectedItemId) {
            error("Please select an item");
            return;
        }

        const selectedItem = availableItems.find(i => i.id === selectedItemId);
        if (!selectedItem) return;

        if (items.some(i => i.itemId === selectedItemId)) {
            error("This item is already in the challan");
            return;
        }

        if (selectedItem.quantityAvailable < selectedQuantity) {
            error(`Only ${selectedItem.quantityAvailable} units available`);
            return;
        }

        const newItem: ChallanItem = {
            id: `new-${Date.now()}`,
            itemId: selectedItemId,
            quantity: selectedQuantity,
            notes: null,
            item: {
                id: selectedItem.id,
                name: selectedItem.name,
                category: selectedItem.category,
                quantityAvailable: selectedItem.quantityAvailable,
                imageUrl1: null,
            },
        };

        setItems([...items, newItem]);
        setSelectedItemId("");
        setSelectedQuantity(1);
        setShowAddItem(false);
        success("Item added to challan");
    };

    const handleSave = async () => {
        if (items.length === 0) {
            error("Challan must have at least one item");
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch(`/api/challans/${challanId}/items`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: items.map(item => ({
                        itemId: item.itemId,
                        quantity: item.quantity,
                        notes: item.notes || null,
                    })),
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to update items");
            }

            success("Items updated successfully");
            setIsEditing(false);
            router.refresh();
        } catch (err) {
            console.error("Error updating items:", err);
            error(err instanceof Error ? err.message : "Failed to update items");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setItems(initialItems);
        setIsEditing(false);
        setShowAddItem(false);
        setSelectedItemId("");
        setSelectedQuantity(1);
    };

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    if (!isEditing) {
        return (
            <div className="card">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">📦 Items in Challan</h2>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm text-gray-600">Total Items</p>
                            <p className="text-2xl font-bold">{items.length}</p>
                        </div>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="btn btn-primary"
                        >
                            ✏️ Edit Items
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="table">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="table-header">S.No</th>
                                <th className="table-header">Image</th>
                                <th className="table-header">Item Name</th>
                                <th className="table-header">Category</th>
                                <th className="table-header">Quantity</th>
                                <th className="table-header">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {items.map((item, index) => (
                                <tr key={item.id}>
                                    <td className="table-cell">{index + 1}</td>
                                    <td className="table-cell">
                                        {item.item.imageUrl1 ? (
                                            <img
                                                src={item.item.imageUrl1}
                                                alt={item.item.name}
                                                className="w-16 h-16 object-cover rounded border border-gray-200"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                                                <span className="text-2xl">📦</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="table-cell font-medium">{item.item.name}</td>
                                    <td className="table-cell">{item.item.category.name}</td>
                                    <td className="table-cell">
                                        <span className="font-semibold text-lg">{item.quantity}</span>
                                    </td>
                                    <td className="table-cell text-gray-600">{item.notes || "—"}</td>
                                </tr>
                            ))}
                            <tr className="bg-gray-50 font-semibold">
                                <td colSpan={4} className="table-cell text-right">Total</td>
                                <td className="table-cell">
                                    <span className="text-xl">{totalQuantity}</span>
                                </td>
                                <td className="table-cell"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="card border-2 border-primary-300">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">✏️ Edit Items in Challan</h2>
                <div className="flex gap-2">
                    <button
                        onClick={handleCancel}
                        className="btn btn-secondary btn-sm"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="btn btn-primary btn-sm"
                        disabled={isSaving}
                    >
                        {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>

            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
                ℹ️ You can add or remove items, adjust quantities, and add notes. Stock will be adjusted accordingly.
            </div>

            <div className="space-y-4">
                {items.map((item, index) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-semibold">
                                    {index + 1}
                                </span>
                            </div>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Item</label>
                                    <p className="text-base font-semibold text-gray-900 mt-1">{item.item.name}</p>
                                    <p className="text-xs text-gray-500">{item.item.category.name}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Available: {item.item.quantityAvailable} units
                                    </p>
                                </div>
                                <div>
                                    <label htmlFor={`quantity-${item.id}`} className="text-sm font-medium text-gray-700">
                                        Quantity
                                    </label>
                                    <input
                                        type="number"
                                        id={`quantity-${item.id}`}
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                                        className="input mt-1"
                                    />
                                </div>
                                <div>
                                    <label htmlFor={`notes-${item.id}`} className="text-sm font-medium text-gray-700">
                                        Notes
                                    </label>
                                    <input
                                        type="text"
                                        id={`notes-${item.id}`}
                                        value={item.notes || ""}
                                        onChange={(e) => handleNotesChange(item.id, e.target.value)}
                                        placeholder="Optional notes"
                                        className="input mt-1"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-red-600 hover:text-red-700 font-medium text-sm"
                                disabled={items.length === 1}
                                title={items.length === 1 ? "Cannot remove the last item" : "Remove item"}
                            >
                                ✕ Remove
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 pt-4 border-t">
                {!showAddItem ? (
                    <button
                        onClick={() => setShowAddItem(true)}
                        className="btn btn-secondary w-full"
                        disabled={loadingItems}
                    >
                        + Add Item
                    </button>
                ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h3 className="font-semibold text-green-900 mb-3">Add New Item</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <label htmlFor="add-item-select" className="label">
                                    Select Item
                                </label>
                                <select
                                    id="add-item-select"
                                    value={selectedItemId}
                                    onChange={(e) => setSelectedItemId(e.target.value)}
                                    className="input"
                                >
                                    <option value="">Choose an item...</option>
                                    {availableItems
                                        .filter(ai => !items.some(i => i.itemId === ai.id))
                                        .map(item => (
                                            <option key={item.id} value={item.id}>
                                                {item.name} - {item.category.name} (Available: {item.quantityAvailable})
                                            </option>
                                        ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="add-item-quantity" className="label">
                                    Quantity
                                </label>
                                <input
                                    type="number"
                                    id="add-item-quantity"
                                    min="1"
                                    value={selectedQuantity}
                                    onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 1)}
                                    className="input"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={handleAddItem}
                                className="btn btn-primary"
                                disabled={!selectedItemId}
                            >
                                Add Item
                            </button>
                            <button
                                onClick={() => {
                                    setShowAddItem(false);
                                    setSelectedItemId("");
                                    setSelectedQuantity(1);
                                }}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-4 p-3 bg-gray-100 rounded-md">
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Total Items:</span>
                    <span className="text-xl font-bold text-gray-900">{items.length}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                    <span className="font-semibold text-gray-700">Total Quantity:</span>
                    <span className="text-xl font-bold text-gray-900">{totalQuantity}</span>
                </div>
            </div>
        </div>
    );
}
