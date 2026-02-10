"use client";

import { useState } from "react";
import Link from "next/link";
import KitComponentBreakdown from "@/components/KitComponentBreakdown";
import { useToast } from "@/lib/hooks/useToast";

type SiteInventoryItem = {
    id: string;
    quantityDeployed: number;
    deployedDate: Date;
    expectedReturnDate: Date | null;
    actualReturnDate: Date | null;
    notes: string | null;
    shiftType: string;
    item: {
        id: string;
        name: string;
        category: { name: string };
        subcategory: { name: string } | null;
        bundleTemplates?: {
            items: {
                quantityPerBaseUnit: number;
                item: {
                    id: string;
                    name: string;
                    componentType: string | null;
                    quantityAvailable: number;
                };
            }[];
        }[];
    };
};

export default function SiteInventoryClient({
    siteInventory,
}: {
    siteInventory: SiteInventoryItem[];
}) {
    const { success, error } = useToast();
    const [expandedKits, setExpandedKits] = useState<Set<string>>(new Set());

    const toggleKitExpansion = (inventoryId: string) => {
        const newExpanded = new Set(expandedKits);
        if (newExpanded.has(inventoryId)) {
            newExpanded.delete(inventoryId);
        } else {
            newExpanded.add(inventoryId);
        }
        setExpandedKits(newExpanded);
    };

    return (
        <div className="overflow-x-auto">
            <table className="table">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="table-header">Item Name</th>
                        <th className="table-header">Category</th>
                        <th className="table-header">Quantity</th>
                        <th className="table-header">Deployed Date</th>
                        <th className="table-header">Expected Return</th>
                        <th className="table-header">Actual Return</th>
                        <th className="table-header">Status</th>
                        <th className="table-header">Notes</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {siteInventory.map((inv) => {
                        const isOverdue =
                            !inv.actualReturnDate &&
                            inv.expectedReturnDate &&
                            new Date(inv.expectedReturnDate) < new Date();

                        const isTentKit =
                            inv.item.bundleTemplates &&
                            inv.item.bundleTemplates.length > 0;
                        const isExpanded = expandedKits.has(inv.id);

                        const kitComponents = isTentKit
                            ? inv.item.bundleTemplates![0].items.map((ti) => ({
                                id: ti.item.id,
                                name: ti.item.name,
                                componentType: ti.item.componentType,
                                quantityPerKit: ti.quantityPerBaseUnit,
                                availableQuantity: ti.item.quantityAvailable,
                            }))
                            : [];

                        return (
                            <>
                                <tr key={inv.id} className={isOverdue ? "bg-red-50" : ""}>
                                    <td className="table-cell">
                                        <div className="flex items-center gap-2">
                                            {isTentKit && (
                                                <button
                                                    onClick={() => toggleKitExpansion(inv.id)}
                                                    className="text-blue-600 hover:text-blue-800 font-bold"
                                                >
                                                    {isExpanded ? "▼" : "▶"}
                                                </button>
                                            )}
                                            <Link
                                                href={`/dashboard/inventory/${inv.item.id}`}
                                                className="text-primary-600 hover:text-primary-700 font-medium"
                                            >
                                                {inv.item.name}
                                            </Link>
                                            {isTentKit && (
                                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                                    🏕️ Kit
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="table-cell">
                                        <div>
                                            <p className="text-sm">{inv.item.category.name}</p>
                                            {inv.item.subcategory && (
                                                <p className="text-xs text-gray-500">
                                                    {inv.item.subcategory.name}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="table-cell">
                                        <span className="font-semibold text-lg">
                                            {inv.quantityDeployed}
                                        </span>
                                    </td>
                                    <td className="table-cell text-sm">
                                        {new Date(inv.deployedDate).toLocaleDateString()}
                                    </td>
                                    <td className="table-cell text-sm">
                                        {inv.expectedReturnDate
                                            ? new Date(inv.expectedReturnDate).toLocaleDateString()
                                            : "—"}
                                    </td>
                                    <td className="table-cell text-sm">
                                        {inv.actualReturnDate ? (
                                            <span className="text-green-600 font-medium">
                                                {new Date(inv.actualReturnDate).toLocaleDateString()}
                                            </span>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                    <td className="table-cell">
                                        {inv.actualReturnDate ? (
                                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                                Returned
                                            </span>
                                        ) : isOverdue ? (
                                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                                                Overdue
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">
                                                Deployed
                                            </span>
                                        )}
                                    </td>
                                    <td className="table-cell text-xs text-gray-600 max-w-xs truncate">
                                        {inv.notes || "—"}
                                    </td>
                                </tr>

                                {/* Kit Component Breakdown Row */}
                                {isTentKit && isExpanded && (
                                    <tr>
                                        <td colSpan={8} className="p-4 bg-gray-50">
                                            <KitComponentBreakdown
                                                kitName={inv.item.name}
                                                kitQuantity={inv.quantityDeployed}
                                                components={kitComponents}
                                                mode="editable"
                                                collapsible={false}
                                                onSave={() => {
                                                    // TODO: Implement save functionality
                                                    error("Save functionality to be implemented");
                                                }}
                                            />
                                        </td>
                                    </tr>
                                )}
                            </>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
