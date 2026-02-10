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

interface Project {
  id: string;
  name: string;
}

export default function NewStockMovementPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState({
    itemId: "",
    projectId: "",
    movementType: "INWARD",
    quantity: "",
    conditionAfter: "",
    notes: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/inventory/items").then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
    ]).then(([itemsData, projectsData]) => {
      // Items API returns paginated response with { data: [], pagination: {} }
      setItems(Array.isArray(itemsData) ? itemsData : itemsData.data || []);
      setProjects(projectsData);
    });
  }, []);

  const selectedItem = items.find((item) => item.id === formData.itemId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/stock-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
          projectId: formData.projectId || null,
          conditionAfter: formData.conditionAfter || null,
        }),
      });

      if (response.ok) {
        router.push("/dashboard/stock-movements");
        router.refresh();
      } else {
        const errorData = await response.json();
        error(errorData.error || "Failed to create stock movement");
      }
    } catch (err) {
      console.error("Error creating stock movement:", err);
      error("An error occurred while creating stock movement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header
        title="New Stock Movement"
        subtitle="Record inward, outward, or return movement"
      />

      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="card space-y-6">
            {/* Movement Type */}
            <div>
              <label className="label">
                Movement Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                className="input"
                value={formData.movementType}
                onChange={(e) =>
                  setFormData({ ...formData, movementType: e.target.value })
                }
              >
                <option value="INWARD">Inward (Add Stock)</option>
                <option value="OUTWARD">Outward (Allocate to Project)</option>
                <option value="RETURN">Return (From Project)</option>
              </select>
              <p className="text-xs text-gray-600 mt-1">
                {formData.movementType === "INWARD" &&
                  "Add new stock from purchase or supplier"}
                {formData.movementType === "OUTWARD" &&
                  "Allocate stock to a project (deducts from available)"}
                {formData.movementType === "RETURN" &&
                  "Return items from a project (adds to available)"}
              </p>
            </div>

            {/* Item Selection */}
            <div>
              <label className="label">
                Item <span className="text-red-500">*</span>
              </label>
              <select
                required
                className="input"
                value={formData.itemId}
                onChange={(e) =>
                  setFormData({ ...formData, itemId: e.target.value })
                }
              >
                <option value="">Select Item</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} - {item.category.name} (Available:{" "}
                    {item.quantityAvailable})
                  </option>
                ))}
              </select>
            </div>

            {/* Project Selection (for OUTWARD and RETURN) */}
            {(formData.movementType === "OUTWARD" ||
              formData.movementType === "RETURN") && (
                <div>
                  <label className="label">
                    Project <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    className="input"
                    value={formData.projectId}
                    onChange={(e) =>
                      setFormData({ ...formData, projectId: e.target.value })
                    }
                  >
                    <option value="">Select Project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

            {/* Quantity */}
            <div>
              <label className="label">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                max={
                  formData.movementType === "OUTWARD" && selectedItem
                    ? selectedItem.quantityAvailable
                    : undefined
                }
                className="input"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                placeholder="Enter quantity"
              />
              {selectedItem && formData.movementType === "OUTWARD" && (
                <p className="text-xs text-gray-600 mt-1">
                  Available: {selectedItem.quantityAvailable}
                </p>
              )}
            </div>

            {/* Condition After (for RETURN only) */}
            {formData.movementType === "RETURN" && (
              <div>
                <label className="label">
                  Condition After Return{" "}
                  <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  className="input"
                  value={formData.conditionAfter}
                  onChange={(e) =>
                    setFormData({ ...formData, conditionAfter: e.target.value })
                  }
                >
                  <option value="">Select Condition</option>
                  <option value="GOOD">Good</option>
                  <option value="REPAIR_NEEDED">Repair Needed</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="REPLACED">Replaced</option>
                </select>
                <p className="text-xs text-gray-600 mt-1">
                  If REPAIR_NEEDED or DAMAGED, a maintenance record will be
                  created automatically
                </p>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="label">Notes</label>
              <textarea
                className="input"
                rows={3}
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Any additional notes about this movement"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary disabled:opacity-50"
              >
                {loading ? "Processing..." : "Record Movement"}
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
  );
}
