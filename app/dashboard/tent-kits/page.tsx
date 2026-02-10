"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/hooks/useToast";

type TentKit = {
    id: string;
    name: string;
    description: string;
    code: string;
    category: string;
    subcategory: string;
    availableKits: number;
    isBalanced: boolean;
    components: {
        id: string;
        name: string;
        componentType: string;
        quantityPerKit: number;
        availableQuantity: number;
        availableKits: number;
    }[];
};

export default function TentKitsPage() {
    const router = useRouter();
    const { success, error } = useToast();
    const [kits, setKits] = useState<TentKit[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"kits" | "components">("kits");
    const [selectedKit, setSelectedKit] = useState<TentKit | null>(null);
    const [showAddStockModal, setShowAddStockModal] = useState(false);
    const [showDeployModal, setShowDeployModal] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [deploying, setDeploying] = useState(false);

    useEffect(() => {
        fetchKits();
    }, []);

    const fetchKits = async () => {
        try {
            const res = await fetch("/api/tent-kits");
            const data = await res.json();
            setKits(data.kits || []);
        } catch (error) {
            console.error("Error fetching kits:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddStock = async () => {
        if (!selectedKit || quantity <= 0) return;

        setDeploying(true);
        try {
            const res = await fetch(`/api/tent-kits/${selectedKit.id}/add-stock`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quantity }),
            });

            if (res.ok) {
                success(`Added ${quantity} ${selectedKit.name}(s) to inventory`);
                setShowAddStockModal(false);
                setQuantity(1);
                fetchKits();
            } else {
                const errorData = await res.json();
                error(errorData.error || "Failed to add stock");
            }
        } catch (err) {
            console.error("Error adding stock:", err);
            error("An error occurred while adding stock");
        } finally {
            setDeploying(false);
        }
    };

    if (loading) {
        return (
            <div>
                <Header title="Tent Kits" subtitle="Manage tent inventory" />
                <div className="p-8 text-center">Loading...</div>
            </div>
        );
    }

    return (
        <div>
            <Header title="Tent Kits" subtitle="Complete tent inventory management" />

            <div className="p-8">
                {/* View Toggle */}
                <div className="flex justify-between items-center mb-6">
                    <div className="inline-flex rounded-lg border border-gray-200 p-1">
                        <button
                            onClick={() => setViewMode("kits")}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition ${viewMode === "kits"
                                ? "bg-primary-600 text-white"
                                : "text-gray-700 hover:bg-gray-100"
                                }`}
                        >
                            Tent Kits
                        </button>
                        <button
                            onClick={() => setViewMode("components")}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition ${viewMode === "components"
                                ? "bg-primary-600 text-white"
                                : "text-gray-700 hover:bg-gray-100"
                                }`}
                        >
                            Component Details
                        </button>
                    </div>

                    <div className="text-sm text-gray-600">
                        Total Kits: {kits.length}
                    </div>
                </div>

                {/* Kit List View */}
                {viewMode === "kits" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {kits.map((kit) => (
                            <div key={kit.id} className="card hover:shadow-lg transition">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {kit.name}
                                        </h3>
                                        <p className="text-sm text-gray-600">{kit.subcategory}</p>
                                    </div>
                                    {kit.isBalanced ? (
                                        <span className="text-green-600 text-sm">✓ Balanced</span>
                                    ) : (
                                        <span className="text-yellow-600 text-sm">⚠️ Imbalanced</span>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <div className="text-3xl font-bold text-primary-600">
                                        {kit.availableKits}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        complete tents available
                                    </div>
                                </div>

                                <div className="mb-4 text-sm text-gray-600">
                                    <div className="font-medium mb-1">Components:</div>
                                    <ul className="space-y-1">
                                        {kit.components.slice(0, 3).map((comp) => (
                                            <li key={comp.id} className="text-xs">
                                                • {comp.name} ({comp.quantityPerKit}×)
                                            </li>
                                        ))}
                                        {kit.components.length > 3 && (
                                            <li className="text-xs text-gray-400">
                                                +{kit.components.length - 3} more...
                                            </li>
                                        )}
                                    </ul>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setSelectedKit(kit);
                                            setShowAddStockModal(true);
                                        }}
                                        className="btn btn-secondary flex-1 text-sm"
                                    >
                                        Add Stock
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedKit(kit);
                                            setViewMode("components");
                                        }}
                                        className="btn btn-outline flex-1 text-sm"
                                    >
                                        Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Component Details View */}
                {viewMode === "components" && (
                    <div className="space-y-6">
                        {kits.map((kit) => (
                            <div key={kit.id} className="card">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">
                                            {kit.name}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {kit.availableKits} complete tents available
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedKit(kit);
                                            setShowAddStockModal(true);
                                        }}
                                        className="btn btn-primary"
                                    >
                                        Add Stock
                                    </button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                    Component
                                                </th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                                    Qty/Tent
                                                </th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                                    In Stock
                                                </th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                                    Complete Tents
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {kit.components.map((comp) => (
                                                <tr key={comp.id}>
                                                    <td className="px-4 py-3 text-sm text-gray-900">
                                                        {comp.name}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                                        {comp.quantityPerKit}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                                        {comp.availableQuantity}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-medium text-right">
                                                        {comp.availableKits}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-4 p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700">
                                        Available Complete Tents:
                                    </span>
                                    <span className="text-2xl font-bold text-primary-600">
                                        {kit.availableKits}
                                    </span>
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
                        <h3 className="text-xl font-bold mb-4">
                            Add {selectedKit.name} Stock
                        </h3>

                        <div className="mb-4">
                            <label className="label">Quantity (Complete Tents)</label>
                            <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                className="input"
                            />
                        </div>

                        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                            <div className="text-sm font-medium text-blue-900 mb-2">
                                This will add:
                            </div>
                            <ul className="text-sm text-blue-800 space-y-1">
                                {selectedKit.components.map((comp) => (
                                    <li key={comp.id}>
                                        • {quantity * comp.quantityPerKit}× {comp.name}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleAddStock}
                                disabled={deploying || quantity <= 0}
                                className="btn btn-primary flex-1 disabled:opacity-50"
                            >
                                {deploying ? "Adding..." : "Add Stock"}
                            </button>
                            <button
                                onClick={() => {
                                    setShowAddStockModal(false);
                                    setQuantity(1);
                                }}
                                className="btn btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
