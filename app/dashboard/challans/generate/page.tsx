"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import Link from "next/link";
import Header from "@/components/Header";
import { useToast } from "@/lib/hooks/useToast";
import { useSiteItems } from "./hooks/useSiteItems";
import { useProjects } from "./hooks/useProjects";
import { SiteItem, Truck, TruckItem } from "./types";
import DraggableItem from "./components/DraggableItem";
import TruckDropZone from "./components/TruckDropZone";
import AddTruckDialog from "./components/AddTruckDialog";

export default function GenerateChallansPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const siteId = searchParams.get("siteId");
    const { success, error } = useToast();

    // Fetch data
    const { items: siteItems, loading: itemsLoading } = useSiteItems(siteId);
    const { projects, loading: projectsLoading } = useProjects();

    // State
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [assignedItemIds, setAssignedItemIds] = useState<Set<string>>(new Set());
    const [showAddTruckDialog, setShowAddTruckDialog] = useState(false);
    const [creatingChallan, setCreatingChallan] = useState(false);
    const [creatingAll, setCreatingAll] = useState(false);

    // Calculate available items (not yet assigned to any truck)
    const availableItems = siteItems.filter((item) => !assignedItemIds.has(item.itemId));
    const unassignedCount = availableItems.length;

    // Handle adding new truck
    const handleAddTruck = (capacity: number) => {
        const newTruck: Truck = {
            id: `truck-${Date.now()}`,
            number: trucks.length + 1,
            capacity,
            items: [],
            totalWeight: 0,
        };
        setTrucks([...trucks, newTruck]);
    };

    // Handle drag end
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) return;

        const itemData = active.data.current as SiteItem;
        const truckId = over.id as string;

        const truck = trucks.find((t) => t.id === truckId);
        if (!truck) return;

        // Check if item already in this truck
        if (truck.items.some((i) => i.itemId === itemData.itemId)) {
            error("Item already in this truck");
            return;
        }

        // Add item to truck
        const truckItem: TruckItem = {
            itemId: itemData.itemId,
            itemName: itemData.itemName,
            categoryName: itemData.categoryName,
            quantity: itemData.quantity,
            weightPerUnit: itemData.weightPerUnit,
            totalWeight: itemData.totalWeight,
        };

        setTrucks(
            trucks.map((t) =>
                t.id === truckId
                    ? {
                        ...t,
                        items: [...t.items, truckItem],
                        totalWeight: t.totalWeight + itemData.totalWeight,
                    }
                    : t
            )
        );

        // Mark item as assigned
        setAssignedItemIds(new Set([...assignedItemIds, itemData.itemId]));
    };

    // Handle removing item from truck
    const handleRemoveItem = (truckId: string, itemId: string) => {
        const truck = trucks.find((t) => t.id === truckId);
        if (!truck) return;

        const item = truck.items.find((i) => i.itemId === itemId);
        if (!item) return;

        setTrucks(
            trucks.map((t) =>
                t.id === truckId
                    ? {
                        ...t,
                        items: t.items.filter((i) => i.itemId !== itemId),
                        totalWeight: t.totalWeight - item.totalWeight,
                    }
                    : t
            )
        );

        // Mark item as available again
        const newAssigned = new Set(assignedItemIds);
        newAssigned.delete(itemId);
        setAssignedItemIds(newAssigned);
    };

    // Handle removing truck
    const handleRemoveTruck = (truckId: string) => {
        const truck = trucks.find((t) => t.id === truckId);
        if (!truck) return;

        // Return all items to available
        const newAssigned = new Set(assignedItemIds);
        truck.items.forEach((item) => newAssigned.delete(item.itemId));
        setAssignedItemIds(newAssigned);

        // Remove truck and renumber
        const updatedTrucks = trucks
            .filter((t) => t.id !== truckId)
            .map((t, index) => ({ ...t, number: index + 1 }));

        setTrucks(updatedTrucks);
    };

    // Create challan for single truck
    const handleCreateChallan = async (truckId: string) => {
        if (!selectedProjectId) {
            error("Please select a project first");
            return;
        }

        const truck = trucks.find((t) => t.id === truckId);
        if (!truck || truck.items.length === 0) return;

        setCreatingChallan(true);

        try {
            const response = await fetch("/api/challans/create-single", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId: selectedProjectId,
                    siteId,
                    truck: {
                        capacity: truck.capacity,
                        items: truck.items.map((item) => ({
                            itemId: item.itemId,
                            quantity: item.quantity,
                        })),
                    },
                }),
            });

            if (response.ok) {
                const data = await response.json();
                success(`Challan ${data.challanNumber} created successfully!`);

                // Remove this truck
                handleRemoveTruck(truckId);

                // Navigate to challan detail
                router.push(`/dashboard/challans/${data.challanId}`);
            } else {
                const data = await response.json();
                error(data.error || "Failed to create challan");
            }
        } catch (err) {
            console.error("Error creating challan:", err);
            error("An error occurred while creating challan");
        } finally {
            setCreatingChallan(false);
        }
    };

    // Create all challans at once
    const handleCreateAllChallans = async () => {
        if (!selectedProjectId) {
            error("Please select a project first");
            return;
        }

        if (trucks.length === 0 || trucks.every((t) => t.items.length === 0)) {
            error("Please assign items to trucks first");
            return;
        }

        // Warn about unassigned items
        if (unassignedCount > 0) {
            const proceed = confirm(
                `⚠️ Warning: ${unassignedCount} item(s) are not assigned to any truck. Do you want to proceed anyway?`
            );
            if (!proceed) return;
        }

        setCreatingAll(true);

        try {
            const response = await fetch("/api/challans/bulk-create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId: selectedProjectId,
                    siteId,
                    challanType: "DELIVERY",
                    trucks: trucks
                        .filter((t) => t.items.length > 0)
                        .map((t) => ({
                            capacity: t.capacity,
                            items: t.items.map((item) => ({
                                itemId: item.itemId,
                                quantity: item.quantity,
                            })),
                        })),
                }),
            });

            if (response.ok) {
                const data = await response.json();
                success(data.message || "All challans created successfully!");
                router.push("/dashboard/challans");
                router.refresh();
            } else {
                const data = await response.json();
                error(data.error || "Failed to create challans");
            }
        } catch (err) {
            console.error("Error creating challans:", err);
            error("An error occurred while creating challans");
        } finally {
            setCreatingAll(false);
        }
    };

    if (itemsLoading || projectsLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="text-4xl mb-4">⏳</div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Header
                title="Generate Challans - Drag & Drop"
                subtitle={siteId ? "Assign items to trucks" : "Manual challan generation"}
                action={
                    <Link href="/dashboard/challans" className="btn btn-secondary">
                        ← Back to Challans
                    </Link>
                }
            />

            <div className="p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Project Selection */}
                    <div className="card">
                        <h2 className="text-lg font-semibold mb-4">1. Select Project</h2>
                        <select
                            className="input max-w-md"
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            required
                        >
                            <option value="">Select destination project...</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} - {p.location}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Main Layout - Items and Trucks */}
                    {siteItems.length === 0 ? (
                        <div className="card text-center py-12">
                            <div className="text-6xl mb-4">📦</div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                No Items Available
                            </h3>
                            <p className="text-gray-600">
                                There are no items deployed at this site.
                            </p>
                        </div>
                    ) : (
                        <DndContext onDragEnd={handleDragEnd}>
                            <div className="card">
                                <h2 className="text-lg font-semibold mb-4">
                                    2. Assign Items to Trucks
                                </h2>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Available Items */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-semibold text-gray-900">
                                                📦 Available Items ({availableItems.length})
                                            </h3>
                                        </div>
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 max-h-[600px] overflow-y-auto">
                                            {availableItems.length === 0 ? (
                                                <p className="text-center text-gray-500 text-sm py-8">
                                                    All items have been assigned to trucks
                                                </p>
                                            ) : (
                                                availableItems.map((item) => (
                                                    <DraggableItem key={item.itemId} item={item} />
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Trucks */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-semibold text-gray-900">
                                                🚛 Trucks ({trucks.length})
                                            </h3>
                                            <button
                                                onClick={() => setShowAddTruckDialog(true)}
                                                className="btn btn-primary btn-sm"
                                            >
                                                + Add Truck
                                            </button>
                                        </div>
                                        <div className="space-y-4 max-h-[600px] overflow-y-auto">
                                            {trucks.length === 0 ? (
                                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                                                    <p className="text-gray-500 text-sm mb-3">
                                                        No trucks added yet
                                                    </p>
                                                    <button
                                                        onClick={() => setShowAddTruckDialog(true)}
                                                        className="btn btn-primary"
                                                    >
                                                        + Add Your First Truck
                                                    </button>
                                                </div>
                                            ) : (
                                                trucks.map((truck) => (
                                                    <TruckDropZone
                                                        key={truck.id}
                                                        truck={truck}
                                                        onRemoveItem={handleRemoveItem}
                                                        onRemoveTruck={handleRemoveTruck}
                                                        onCreateChallan={handleCreateChallan}
                                                        isCreating={creatingChallan}
                                                    />
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </DndContext>
                    )}

                    {/* Bulk Actions */}
                    {trucks.length > 0 && trucks.some((t) => t.items.length > 0) && (
                        <div className="card">
                            <h2 className="text-lg font-semibold mb-4">3. Create Challans</h2>

                            {unassignedCount > 0 && (
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                                    <p className="text-orange-800 font-medium">
                                        ⚠️ Warning: {unassignedCount} item(s) not assigned to any truck
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={handleCreateAllChallans}
                                    disabled={creatingAll || !selectedProjectId}
                                    className="btn btn-primary disabled:opacity-50"
                                >
                                    {creatingAll
                                        ? "Creating..."
                                        : `📄 Create All Challans (${trucks.filter((t) => t.items.length > 0).length} trucks)`}
                                </button>
                                <button
                                    onClick={() => router.push("/dashboard/challans")}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Truck Dialog */}
            <AddTruckDialog
                isOpen={showAddTruckDialog}
                onClose={() => setShowAddTruckDialog(false)}
                onAdd={handleAddTruck}
            />
        </div>
    );
}
