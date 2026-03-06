"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import { useToast } from "@/lib/hooks/useToast";
import DeleteTentKitButton from "./DeleteTentKitButton";

type ComponentItem = {
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
    description: string | null;
    code: string | null;
    category: string | null;
    subcategory: string | null;
    availableKits: number;
    isBalanced: boolean;
    components: ComponentItem[];
};

type Category = {
    id: string;
    name: string;
    subcategories: { id: string; name: string }[];
};

type AvailableItem = {
    id: string;
    name: string;
    quantityAvailable: number;
    isKitComponent: boolean;
};

export default function TentKitsPage() {
    const { success, error } = useToast();
    const [kits, setKits] = useState<TentKit[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"kits" | "components">("kits");
    const [selectedKit, setSelectedKit] = useState<TentKit | null>(null);

    // Add stock modal
    const [showAddStockModal, setShowAddStockModal] = useState(false);
    const [addStockQty, setAddStockQty] = useState(1);
    const [addingStock, setAddingStock] = useState(false);

    // Create kit modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [availableItems, setAvailableItems] = useState<AvailableItem[]>([]);
    const [newKit, setNewKit] = useState({
        kitName: "",
        description: "",
        categoryId: "",
        subcategoryId: "",
    });
    const [selectedComponents, setSelectedComponents] = useState<{ itemId: string; quantityPerKit: number }[]>([]);
    const [creatingKit, setCreatingKit] = useState(false);
    const [itemSearchQuery, setItemSearchQuery] = useState("");

    // Migration
    const [runningMigration, setRunningMigration] = useState(false);
    const [migrationResult, setMigrationResult] = useState<null | {
        summary: { created: number; skipped: number; partial: number };
        details: { kitName: string; status: string; componentsFound: number; componentsMissing: string[] }[];
    }>(null);

    const fetchKits = useCallback(async () => {
        try {
            const res = await fetch("/api/tent-kits");
            const data = await res.json();
            setKits(data.kits || []);
        } catch (err) {
            console.error("Error fetching kits:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchCreateModalData = async () => {
        try {
            const [catRes, itemsRes] = await Promise.all([
                fetch("/api/inventory/categories"),
                fetch("/api/inventory/items?limit=500&showKitComponents=true"),
            ]);
            const catData = await catRes.json();
            const itemsData = await itemsRes.json();
            setCategories(catData || []);
            setAvailableItems(itemsData.data || []);
        } catch (err) {
            console.error("Error fetching modal data:", err);
        }
    };

    useEffect(() => {
        fetchKits();
    }, [fetchKits]);

    const handleAddStock = async () => {
        if (!selectedKit || addStockQty <= 0) return;
        setAddingStock(true);
        try {
            const res = await fetch(`/api/tent-kits/${selectedKit.id}/add-stock`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quantity: addStockQty }),
            });
            if (res.ok) {
                success(`Added ${addStockQty} ${selectedKit.name}(s) to inventory`);
                setShowAddStockModal(false);
                setAddStockQty(1);
                fetchKits();
            } else {
                const err = await res.json();
                error(err.error || "Failed to add stock");
            }
        } catch (err) {
            console.error(err);
            error("An error occurred while adding stock");
        } finally {
            setAddingStock(false);
        }
    };

    const handleRunMigration = async () => {
        setRunningMigration(true);
        setMigrationResult(null);
        try {
            const res = await fetch("/api/tent-kits/setup-migration", { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                setMigrationResult(data);
                success(`Migration done! Created: ${data.summary.created}, Skipped: ${data.summary.skipped}`);
                fetchKits();
            } else {
                error(data.error || "Migration failed");
            }
        } catch (err) {
            console.error(err);
            error("Migration failed");
        } finally {
            setRunningMigration(false);
        }
    };

    const openCreateModal = () => {
        setShowCreateModal(true);
        setNewKit({ kitName: "", description: "", categoryId: "", subcategoryId: "" });
        setSelectedComponents([]);
        setItemSearchQuery("");
        fetchCreateModalData();
    };

    const addComponent = (itemId: string) => {
        if (selectedComponents.find((c) => c.itemId === itemId)) return;
        setSelectedComponents([...selectedComponents, { itemId, quantityPerKit: 1 }]);
    };

    const removeComponent = (itemId: string) => {
        setSelectedComponents(selectedComponents.filter((c) => c.itemId !== itemId));
    };

    const updateComponentQty = (itemId: string, qty: number) => {
        setSelectedComponents(selectedComponents.map((c) => (c.itemId === itemId ? { ...c, quantityPerKit: qty } : c)));
    };

    const handleCreateKit = async () => {
        if (!newKit.kitName || !newKit.categoryId || selectedComponents.length === 0) {
            error("Kit name, category, and at least one component are required");
            return;
        }
        setCreatingKit(true);
        try {
            const res = await fetch("/api/tent-kits", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    kitName: newKit.kitName,
                    description: newKit.description,
                    categoryId: newKit.categoryId,
                    subcategoryId: newKit.subcategoryId || null,
                    componentItems: selectedComponents,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                success(`Tent kit "${newKit.kitName}" created successfully!`);
                setShowCreateModal(false);
                fetchKits();
            } else {
                error(data.error || "Failed to create kit");
            }
        } catch (err) {
            console.error(err);
            error("An error occurred while creating the kit");
        } finally {
            setCreatingKit(false);
        }
    };

    const selectedCategoryObj = categories.find((c) => c.id === newKit.categoryId);

    const filteredItems = availableItems.filter(
        (item) =>
            !selectedComponents.find((c) => c.itemId === item.id) &&
            item.name.toLowerCase().includes(itemSearchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div>
                <Header title="Tent Kits" subtitle="Manage tent inventory" />
                <div className="p-8 text-center text-gray-500">Loading tent kits...</div>
            </div>
        );
    }

    return (
        <div>
            <Header title="Tent Kits" subtitle="Complete tent inventory management" />

            <div className="p-8">
                {/* Top Controls */}
                <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
                    <div className="inline-flex rounded-lg border border-gray-200 p-1">
                        <button
                            onClick={() => setViewMode("kits")}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition ${viewMode === "kits" ? "bg-primary-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}
                        >
                            Tent Kits ({kits.length})
                        </button>
                        <button
                            onClick={() => setViewMode("components")}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition ${viewMode === "components" ? "bg-primary-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}
                        >
                            Component Details
                        </button>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        {/* Run Setup/Migration button */}
                        <button
                            onClick={handleRunMigration}
                            disabled={runningMigration}
                            className="btn btn-secondary disabled:opacity-50 flex items-center gap-2"
                            title="Creates BundleTemplates for all tent types from existing inventory items"
                        >
                            {runningMigration ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Running Setup...
                                </>
                            ) : (
                                <>⚙️ Run Setup</>
                            )}
                        </button>

                        <button onClick={openCreateModal} className="btn btn-primary">
                            + Create New Kit
                        </button>
                    </div>
                </div>

                {/* Migration Result Banner */}
                {migrationResult && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="font-semibold text-blue-900 mb-2">
                            ✅ Setup Complete — Created: {migrationResult.summary.created}, Skipped (already existed): {migrationResult.summary.skipped}, Partial (missing components): {migrationResult.summary.partial}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {migrationResult.details.map((d) => (
                                <div key={d.kitName} className={`text-sm px-3 py-2 rounded ${d.status === "created" ? "bg-green-100 text-green-800" : d.status === "skipped" ? "bg-gray-100 text-gray-700" : "bg-yellow-100 text-yellow-800"}`}>
                                    <span className="font-medium">{d.kitName}</span>: {d.status}
                                    {d.componentsMissing.length > 0 && (
                                        <div className="text-xs mt-1">Missing: {d.componentsMissing.join(", ")}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* No kits prompt */}
                {kits.length === 0 && (
                    <div className="card text-center py-12">
                        <div className="text-4xl mb-3">⛺</div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">No Tent Kits Found</h3>
                        <p className="text-gray-500 mb-4">
                            Click <strong>"Run Setup"</strong> to automatically create tent kits from your existing inventory items,
                            or create a new kit manually.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={handleRunMigration} disabled={runningMigration} className="btn btn-primary disabled:opacity-50">
                                ⚙️ Run Setup Now
                            </button>
                            <button onClick={openCreateModal} className="btn btn-secondary">
                                + Create Manually
                            </button>
                        </div>
                    </div>
                )}

                {/* Kit Cards */}
                {viewMode === "kits" && kits.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {kits.map((kit) => (
                            <div key={kit.id} className="card hover:shadow-lg transition">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">{kit.name}</h3>
                                        {kit.subcategory && <p className="text-sm text-gray-500">{kit.subcategory}</p>}
                                    </div>
                                    <span className={`text-sm font-medium px-2 py-1 rounded-full ${kit.isBalanced ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                        {kit.isBalanced ? "✓ Balanced" : "⚠ Imbalanced"}
                                    </span>
                                </div>

                                <div className="mb-4">
                                    <div className="text-4xl font-bold text-primary-600">{kit.availableKits}</div>
                                    <div className="text-sm text-gray-500">complete tents available</div>
                                </div>

                                <div className="mb-4 text-sm text-gray-600">
                                    <div className="font-medium mb-1">Components ({kit.components.length}):</div>
                                    <ul className="space-y-1">
                                        {kit.components.slice(0, 4).map((comp) => (
                                            <li key={comp.id} className="text-xs flex justify-between">
                                                <span>• {comp.name} (×{comp.quantityPerKit})</span>
                                                <span className={`font-medium ${comp.availableKits < 5 ? "text-red-600" : "text-green-600"}`}>
                                                    {comp.availableKits} sets
                                                </span>
                                            </li>
                                        ))}
                                        {kit.components.length > 4 && (
                                            <li className="text-xs text-gray-400">+{kit.components.length - 4} more...</li>
                                        )}
                                    </ul>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setSelectedKit(kit); setShowAddStockModal(true); }}
                                        className="btn btn-secondary flex-1 text-sm"
                                    >
                                        Add Stock
                                    </button>
                                    <button
                                        onClick={() => { setSelectedKit(kit); setViewMode("components"); }}
                                        className="btn btn-outline flex-1 text-sm"
                                    >
                                        Details
                                    </button>
                                    <DeleteTentKitButton kitId={kit.id} kitName={kit.name} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Component Details View */}
                {viewMode === "components" && kits.length > 0 && (
                    <div className="space-y-6">
                        {/* Kit selector tabs */}
                        {kits.length > 1 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                <button
                                    onClick={() => setSelectedKit(null)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${!selectedKit ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                                >
                                    All Kits
                                </button>
                                {kits.map((kit) => (
                                    <button
                                        key={kit.id}
                                        onClick={() => setSelectedKit(kit)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${selectedKit?.id === kit.id ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                                    >
                                        {kit.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        {(selectedKit ? [selectedKit] : kits).map((kit) => (
                            <div key={kit.id} className="card">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">{kit.name}</h3>
                                        <p className="text-sm text-gray-500">
                                            {kit.availableKits} complete tents available
                                            {kit.subcategory && ` · ${kit.subcategory}`}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => { setSelectedKit(kit); setShowAddStockModal(true); }}
                                        className="btn btn-primary"
                                    >
                                        Add Stock
                                    </button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Component</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty/Tent</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">In Stock</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Complete Sets</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {kit.components.map((comp) => (
                                                <tr key={comp.id}>
                                                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{comp.name}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-500">{comp.componentType || "—"}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{comp.quantityPerKit}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{comp.availableQuantity}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className={`text-sm font-semibold ${comp.availableKits < 5 ? "text-red-600" : comp.availableKits < 20 ? "text-yellow-600" : "text-green-600"}`}>
                                                            {comp.availableKits}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-4 p-3 bg-primary-50 rounded-lg flex justify-between items-center">
                                    <span className="text-sm font-medium text-primary-800">Available Complete Tents:</span>
                                    <span className="text-2xl font-bold text-primary-700">{kit.availableKits}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Stock Modal */}
            {showAddStockModal && selectedKit && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold mb-4">Add {selectedKit.name} Stock</h3>
                        <div className="mb-4">
                            <label className="label">Quantity (Complete Tents)</label>
                            <input
                                type="number" min="1" value={addStockQty}
                                onChange={(e) => setAddStockQty(parseInt(e.target.value) || 1)}
                                className="input"
                            />
                        </div>
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                            <div className="text-sm font-medium text-blue-900 mb-2">This will add:</div>
                            <ul className="text-sm text-blue-800 space-y-1">
                                {selectedKit.components.map((comp) => (
                                    <li key={comp.id}>• {addStockQty * comp.quantityPerKit}× {comp.name}</li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleAddStock} disabled={addingStock || addStockQty <= 0} className="btn btn-primary flex-1 disabled:opacity-50">
                                {addingStock ? "Adding..." : "Add Stock"}
                            </button>
                            <button onClick={() => { setShowAddStockModal(false); setAddStockQty(1); }} className="btn btn-secondary flex-1">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create New Kit Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                            <h3 className="text-xl font-bold text-gray-900">Create New Tent Kit</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Kit Name */}
                            <div>
                                <label className="label">Kit Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text" className="input" placeholder="e.g., Full Frame Tent"
                                    value={newKit.kitName}
                                    onChange={(e) => setNewKit({ ...newKit, kitName: e.target.value })}
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="label">Description</label>
                                <input
                                    type="text" className="input" placeholder="Optional description"
                                    value={newKit.description}
                                    onChange={(e) => setNewKit({ ...newKit, description: e.target.value })}
                                />
                            </div>

                            {/* Category */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Category <span className="text-red-500">*</span></label>
                                    <select
                                        className="input"
                                        value={newKit.categoryId}
                                        onChange={(e) => setNewKit({ ...newKit, categoryId: e.target.value, subcategoryId: "" })}
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Subcategory</label>
                                    <select
                                        className="input"
                                        value={newKit.subcategoryId}
                                        onChange={(e) => setNewKit({ ...newKit, subcategoryId: e.target.value })}
                                        disabled={!selectedCategoryObj || selectedCategoryObj.subcategories.length === 0}
                                    >
                                        <option value="">None</option>
                                        {selectedCategoryObj?.subcategories.map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Component Items */}
                            <div>
                                <label className="label">Component Items <span className="text-red-500">*</span></label>

                                {/* Selected Components */}
                                {selectedComponents.length > 0 && (
                                    <div className="mb-3 space-y-2">
                                        {selectedComponents.map((comp) => {
                                            const item = availableItems.find((i) => i.id === comp.itemId);
                                            return (
                                                <div key={comp.itemId} className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg border border-primary-200">
                                                    <span className="flex-1 text-sm font-medium text-gray-900">{item?.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-xs text-gray-500">Qty/Kit:</label>
                                                        <input
                                                            type="number" min="1" max="100"
                                                            value={comp.quantityPerKit}
                                                            onChange={(e) => updateComponentQty(comp.itemId, parseInt(e.target.value) || 1)}
                                                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                                                        />
                                                    </div>
                                                    <button onClick={() => removeComponent(comp.itemId)} className="text-red-500 hover:text-red-700 text-sm">✕</button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Item Search & Add */}
                                <div className="border rounded-lg">
                                    <div className="p-2 border-b bg-gray-50">
                                        <input
                                            type="text" placeholder="Search items to add as component..."
                                            value={itemSearchQuery}
                                            onChange={(e) => setItemSearchQuery(e.target.value)}
                                            className="input text-sm"
                                        />
                                    </div>
                                    <div className="max-h-48 overflow-y-auto divide-y">
                                        {filteredItems.slice(0, 30).map((item) => (
                                            <button
                                                key={item.id} type="button"
                                                onClick={() => addComponent(item.id)}
                                                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex justify-between items-center group"
                                            >
                                                <span className="text-sm text-gray-800">{item.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-400">{item.quantityAvailable} in stock</span>
                                                    <span className="text-primary-600 text-xs font-medium opacity-0 group-hover:opacity-100">+ Add</span>
                                                </div>
                                            </button>
                                        ))}
                                        {filteredItems.length === 0 && (
                                            <div className="px-4 py-4 text-sm text-gray-400 text-center">No items found</div>
                                        )}
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">{selectedComponents.length} component(s) selected</p>
                            </div>
                        </div>

                        <div className="p-6 border-t flex gap-3 sticky bottom-0 bg-white">
                            <button
                                onClick={handleCreateKit}
                                disabled={creatingKit || !newKit.kitName || !newKit.categoryId || selectedComponents.length === 0}
                                className="btn btn-primary flex-1 disabled:opacity-50"
                            >
                                {creatingKit ? "Creating..." : "Create Tent Kit"}
                            </button>
                            <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary flex-1">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
