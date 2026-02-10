"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Header from "@/components/Header"
import CategoryItemDropdown from "@/components/CategoryItemDropdown"
import { useToast } from "@/lib/hooks/useToast"

interface Site {
    id: string
    name: string
    location: string
}

type Item = {
    id: string;
    name: string;
    quantityAvailable: number;
    category: {
        id: string;
        name: string;
    };
};

type DeployedItem = {
    itemId: string;
    itemName: string;
    quantityDeployed: number;
    availableQuantity: number;
    shiftType: "WAREHOUSE" | "SITE";
    expectedReturnDate?: string;
    notes?: string;
};

export default function NewProjectPage() {
    const router = useRouter()
    const { success, error } = useToast()
    const [loading, setLoading] = useState(false)
    const [sites, setSites] = useState<Site[]>([])
    const [items, setItems] = useState<Item[]>([])
    const [selectedItemId, setSelectedItemId] = useState("")
    const [deployedItems, setDeployedItems] = useState<DeployedItem[]>([])
    const [formData, setFormData] = useState({
        name: "",
        type: "CAMP",
        location: "",
        siteId: "",
        startDate: "",
        endDate: "",
        description: ""
    })

    useEffect(() => {
        // Fetch sites for dropdown
        fetch("/api/sites")
            .then((r) => r.json())
            .then((data) => setSites(Array.isArray(data) ? data : []))

        // Fetch items for deployment
        fetch("/api/deployable-items")
            .then((res) => res.json())
            .then((data) => {
                if (data.data) {
                    setItems(data.data)
                }
            })
            .catch((err) => console.error("Error fetching items:", err))
    }, [])

    const handleAddItem = () => {
        if (!selectedItemId) return

        const item = items.find((i) => i.id === selectedItemId)
        if (!item) return

        if (deployedItems.find((di) => di.itemId === selectedItemId)) {
            error("This item is already added")
            return
        }

        setDeployedItems([
            ...deployedItems,
            {
                itemId: item.id,
                itemName: item.name,
                quantityDeployed: 1,
                availableQuantity: item.quantityAvailable,
                shiftType: "SITE",
            },
        ])
        setSelectedItemId("")
    }

    const handleRemoveItem = (itemId: string) => {
        setDeployedItems(deployedItems.filter((item) => item.itemId !== itemId))
    }

    const updateDeployedItem = (
        itemId: string,
        field: keyof DeployedItem,
        value: string | number
    ) => {
        setDeployedItems(
            deployedItems.map((item) =>
                item.itemId === itemId ? { ...item, [field]: value } : item
            )
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Validate quantities for deployed items
            for (const item of deployedItems) {
                if (item.quantityDeployed <= 0) {
                    error(`Quantity for ${item.itemName} must be greater than 0`)
                    setLoading(false)
                    return
                }
                if (item.quantityDeployed > item.availableQuantity) {
                    error(
                        `Quantity for ${item.itemName} exceeds available stock (${item.availableQuantity})`
                    )
                    setLoading(false)
                    return
                }
            }

            const response = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    startDate: new Date(formData.startDate),
                    endDate: new Date(formData.endDate),
                    siteId: formData.siteId || null,
                    deployedItems: deployedItems.length > 0
                        ? deployedItems.map(({ itemId, quantityDeployed, shiftType, expectedReturnDate, notes }) => ({
                            itemId,
                            quantityDeployed,
                            shiftType,
                            expectedReturnDate: expectedReturnDate || null,
                            notes: notes || null,
                        }))
                        : undefined,
                }),
            })

            if (response.ok) {
                router.push("/dashboard/projects")
                router.refresh()
            } else {
                const errorData = await response.json()
                error(errorData.error || "Failed to create project")
            }
        } catch (err) {
            console.error("Error creating project:", err)
            error("Failed to create project")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <Header
                title="Create New Project"
                subtitle="Add a new event, camp, or rental project"
            />

            <div className="p-8">
                <div className="max-w-2xl mx-auto">
                    <form onSubmit={handleSubmit} className="card space-y-6">
                        {/* Project Details Section */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Project Details</h3>

                            {/* Project Name */}
                            <div className="mb-4">
                                <label className="label">
                                    Project Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Himalayan Adventure Camp 2025"
                                />
                            </div>

                            {/* Project Type */}
                            <div className="mb-4">
                                <label className="label">
                                    Project Type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    className="input"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="CAMP">Camp</option>
                                    <option value="FESTIVAL">Festival</option>
                                    <option value="CORPORATE_EVENT">Corporate Event</option>
                                    <option value="RETREAT">Retreat</option>
                                    <option value="RENTAL">Rental</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>

                            {/* Location */}
                            <div className="mb-4">
                                <label className="label">
                                    Location <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="input"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="e.g., Manali, Himachal Pradesh"
                                />
                            </div>

                            {/* Site (Optional) */}
                            <div>
                                <label className="label">Site (Optional)</label>
                                <select
                                    className="input"
                                    value={formData.siteId}
                                    onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                                >
                                    <option value="">-- No Site --</option>
                                    {sites.map((site) => (
                                        <option key={site.id} value={site.id}>
                                            {site.name} - {site.location}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Link this project to a specific site/venue
                                </p>
                            </div>
                        </div>

                        {/* Schedule Section */}
                        <div className="border-t pt-6">
                            <h3 className="text-lg font-semibold mb-4">Schedule</h3>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Start Date */}
                                <div>
                                    <label className="label">
                                        Start Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        className="input"
                                        value={formData.startDate || ""}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    />
                                </div>

                                {/* End Date */}
                                <div>
                                    <label className="label">
                                        End Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        className="input"
                                        value={formData.endDate || ""}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        min={formData.startDate || ""}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Items to Deploy Section */}
                        <div className="border-t pt-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Deploy Items to Project (Optional)
                            </h3>

                            <div className="space-y-4">
                                {/* Item Selection Dropdown */}
                                <div className="flex gap-3">
                                    <CategoryItemDropdown
                                        items={items}
                                        selectedItemId={selectedItemId}
                                        onSelectItem={setSelectedItemId}
                                        placeholder="Select an item to deploy..."
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddItem}
                                        disabled={!selectedItemId}
                                        className="btn btn-secondary disabled:opacity-50"
                                    >
                                        + Add Item
                                    </button>
                                </div>

                                {/* Deployed Items List */}
                                {deployedItems.length > 0 && (
                                    <div className="space-y-4 mt-6">
                                        <h4 className="font-medium text-gray-700">Selected Items:</h4>
                                        {deployedItems.map((item) => (
                                            <div key={item.itemId} className="border rounded-lg p-4 bg-gray-50">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="font-medium text-gray-900">{item.itemName}</div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(item.itemId)}
                                                        className="text-red-600 hover:text-red-800 text-sm"
                                                    >
                                                        ✕ Remove
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Quantity */}
                                                    <div>
                                                        <label className="text-sm text-gray-600">
                                                            Quantity to Deploy <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max={item.availableQuantity}
                                                            value={item.quantityDeployed}
                                                            onChange={(e) =>
                                                                updateDeployedItem(
                                                                    item.itemId,
                                                                    "quantityDeployed",
                                                                    parseInt(e.target.value) || 0
                                                                )
                                                            }
                                                            className="input mt-1"
                                                        />
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Available: {item.availableQuantity}
                                                        </p>
                                                    </div>

                                                    {/* Shift Type */}
                                                    <div>
                                                        <label className="text-sm text-gray-600">
                                                            Shift Type <span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="flex gap-4 mt-2">
                                                            <label className="flex items-center">
                                                                <input
                                                                    type="radio"
                                                                    checked={item.shiftType === "WAREHOUSE"}
                                                                    onChange={() =>
                                                                        updateDeployedItem(item.itemId, "shiftType", "WAREHOUSE")
                                                                    }
                                                                    className="mr-2"
                                                                />
                                                                <span className="text-sm">Warehouse</span>
                                                            </label>
                                                            <label className="flex items-center">
                                                                <input
                                                                    type="radio"
                                                                    checked={item.shiftType === "SITE"}
                                                                    onChange={() =>
                                                                        updateDeployedItem(item.itemId, "shiftType", "SITE")
                                                                    }
                                                                    className="mr-2"
                                                                />
                                                                <span className="text-sm">Site</span>
                                                            </label>
                                                        </div>
                                                    </div>

                                                    {/* Expected Return Date */}
                                                    <div>
                                                        <label className="text-sm text-gray-600">Expected Return Date</label>
                                                        <input
                                                            type="date"
                                                            value={item.expectedReturnDate || ""}
                                                            onChange={(e) =>
                                                                updateDeployedItem(
                                                                    item.itemId,
                                                                    "expectedReturnDate",
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="input mt-1"
                                                            min={new Date().toISOString().split("T")[0]}
                                                        />
                                                    </div>

                                                    {/* Notes */}
                                                    <div>
                                                        <label className="text-sm text-gray-600">Notes</label>
                                                        <input
                                                            type="text"
                                                            value={item.notes || ""}
                                                            onChange={(e) =>
                                                                updateDeployedItem(item.itemId, "notes", e.target.value)
                                                            }
                                                            placeholder="Optional notes"
                                                            className="input mt-1"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="border-t pt-6">
                            <label className="label">Description</label>
                            <textarea
                                className="input"
                                rows={4}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Additional details about this project..."
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-4 border-t">
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary disabled:opacity-50"
                            >
                                {loading ? "Creating..." : "Create Project"}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
