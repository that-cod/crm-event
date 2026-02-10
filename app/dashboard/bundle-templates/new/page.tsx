"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useToast } from "@/lib/hooks/useToast";

interface Item {
    id: string;
    name: string;
    category: { name: string };
    quantityAvailable: number;
}

export default function NewBundleTemplatePage() {
    const router = useRouter();
    const { success, error } = useToast();
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<Item[]>([]);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        baseItemId: "",
    });
    const [bundleItems, setBundleItems] = useState<
        { itemId: string; quantityPerBaseUnit: number }[]
    >([]);

    useEffect(() => {
        fetch("/api/inventory/items")
            .then((r) => r.json())
            .then((data) => {
                setItems(Array.isArray(data) ? data : data.data || []);
            });
    }, []);

    const addBundleItem = () => {
        setBundleItems([...bundleItems, { itemId: "", quantityPerBaseUnit: 1 }]);
    };

    const removeBundleItem = (index: number) => {
        setBundleItems(bundleItems.filter((_, i) => i !== index));
    };

    const updateBundleItem = (
        index: number,
        field: string,
        value: string | number
    ) => {
        const updated = [...bundleItems];
        updated[index] = { ...updated[index], [field]: value };
        setBundleItems(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch("/api/bundle-templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    items: bundleItems,
                }),
            });

            if (response.ok) {
                router.push("/dashboard/bundle-templates");
                router.refresh();
            } else {
                const errorData = await response.json();
                error(errorData.error || "Failed to create bundle template");
            }
        } catch (err) {
            console.error("Error creating bundle template:", err);
            error("Failed to create bundle template");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8">
            <Header
                title="Create Bundle Template"
                subtitle="Define a package of items that are commonly used together"
            />

            <div className="mt-8 max-w-3xl">
                <form onSubmit={handleSubmit} className="card space-y-6">
                    {/* Template Name */}
                    <div>
                        <label className="label">
                            Template Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            className="input"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Complete Tent Setup, Event Lighting Package"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="label">Description</label>
                        <textarea
                            className="input"
                            rows={3}
                            value={formData.description}
                            onChange={(e) =>
                                setFormData({ ...formData, description: e.target.value })
                            }
                            placeholder="Brief description of this bundle..."
                        />
                    </div>

                    {/* Base Item */}
                    <div>
                        <label className="label">
                            Base Item <span className="text-red-500">*</span>
                        </label>
                        <select
                            required
                            className="input"
                            value={formData.baseItemId}
                            onChange={(e) =>
                                setFormData({ ...formData, baseItemId: e.target.value })
                            }
                        >
                            <option value="">Select base item</option>
                            {items.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name} - {item.category.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            The primary item that defines this bundle (e.g., the tent in a tent setup)
                        </p>
                    </div>

                    {/* Bundle Items */}
                    <div className="border-t pt-6">
                        <div className="flex justify-between items-center mb-4">
                            <label className="label mb-0">Bundled Items</label>
                            <button
                                type="button"
                                onClick={addBundleItem}
                                className="btn-secondary text-sm"
                            >
                                + Add Item
                            </button>
                        </div>

                        {bundleItems.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-md border border-dashed border-gray-300">
                                <p className="text-gray-500 text-sm">
                                    No items added yet. Click "Add Item" to include items in this bundle.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {bundleItems.map((bundleItem, index) => (
                                    <div
                                        key={index}
                                        className="flex gap-3 items-start p-4 bg-gray-50 rounded-md"
                                    >
                                        <div className="flex-1">
                                            <label className="text-xs text-gray-600 mb-1 block">
                                                Item
                                            </label>
                                            <select
                                                required
                                                className="input"
                                                value={bundleItem.itemId}
                                                onChange={(e) =>
                                                    updateBundleItem(index, "itemId", e.target.value)
                                                }
                                            >
                                                <option value="">Select item</option>
                                                {items.map((item) => (
                                                    <option key={item.id} value={item.id}>
                                                        {item.name} - {item.category.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="w-32">
                                            <label className="text-xs text-gray-600 mb-1 block">
                                                Quantity
                                            </label>
                                            <input
                                                type="number"
                                                required
                                                min="1"
                                                className="input"
                                                value={bundleItem.quantityPerBaseUnit}
                                                onChange={(e) =>
                                                    updateBundleItem(
                                                        index,
                                                        "quantityPerBaseUnit",
                                                        parseInt(e.target.value)
                                                    )
                                                }
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => removeBundleItem(index)}
                                            className="mt-6 text-red-600 hover:text-red-700 text-sm font-medium"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <div className="flex items-start gap-3">
                            <div className="text-xl">💡</div>
                            <div>
                                <p className="text-sm font-medium text-blue-900 mb-1">
                                    How Bundle Templates Work
                                </p>
                                <ul className="text-xs text-blue-700 space-y-1">
                                    <li>
                                        • Choose a base item that represents the bundle (e.g., a tent)
                                    </li>
                                    <li>
                                        • Add related items with their quantities per base unit
                                    </li>
                                    <li>
                                        • When allocating 5 tents, all related items will be allocated
                                        proportionally
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-4 pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary"
                        >
                            {loading ? "Creating..." : "Create Bundle Template"}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="btn-secondary"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
