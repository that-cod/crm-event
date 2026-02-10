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

export default function NewRepairPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [formData, setFormData] = useState({
    itemId: "",
    notes: "",
    priority: "MEDIUM",
    estimatedCost: "",
    assignedTo: "",
  });

  useEffect(() => {
    fetch("/api/inventory/items")
      .then((r) => r.json())
      .then((data) => {
        // Items API returns paginated response with { data: [], pagination: {} }
        setItems(Array.isArray(data) ? data : data.data || []);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/dashboard/repairs/${data.id}`);
        router.refresh();
      } else {
        const errorData = await response.json();
        error(errorData.error || "Failed to create repair request");
      }
    } catch (err) {
      console.error("Error creating repair:", err);
      error("An error occurred while creating repair");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header
        title="New Repair Request"
        subtitle="Report an item for repair or maintenance"
      />

      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="card space-y-6">
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
                <option value="">Select an item</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} - {item.category.name} (Available:{" "}
                    {item.quantityAvailable})
                  </option>
                ))}
              </select>
            </div>

            {/* Issue Description / Notes */}
            <div>
              <label className="label">
                Issue Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                className="input"
                rows={4}
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Describe the issue or damage in detail..."
              />
            </div>

            {/* Priority */}
            <div>
              <label className="label">
                Priority <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                {["LOW", "MEDIUM", "HIGH"].map((priority) => (
                  <label
                    key={priority}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={priority}
                      checked={formData.priority === priority}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: e.target.value })
                      }
                      className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${priority === "HIGH"
                        ? "bg-red-100 text-red-800"
                        : priority === "MEDIUM"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-green-100 text-green-800"
                        }`}
                    >
                      {priority}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Estimated Cost */}
            <div>
              <label className="label">Estimated Repair Cost</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={formData.estimatedCost}
                onChange={(e) =>
                  setFormData({ ...formData, estimatedCost: e.target.value })
                }
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional: Estimated cost for parts and labor
              </p>
            </div>

            {/* Assigned To */}
            <div>
              <label className="label">Assign To (Technician/Vendor)</label>
              <input
                type="text"
                className="input"
                value={formData.assignedTo}
                onChange={(e) =>
                  setFormData({ ...formData, assignedTo: e.target.value })
                }
                placeholder="e.g., John Doe, ABC Repair Shop"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional: Leave blank to assign later
              </p>
            </div>



            {/* Warning Box */}
            <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
              <div className="flex items-start gap-3">
                <div className="text-xl">⚠️</div>
                <div>
                  <p className="text-sm font-medium text-orange-900 mb-1">
                    Important Notes
                  </p>
                  <ul className="text-xs text-orange-700 space-y-1">
                    <li>• The item will be marked as "REPAIR_NEEDED"</li>
                    <li>
                      • 1 unit will be deducted from available inventory during
                      repair
                    </li>
                    <li>
                      • The item will be restored when repair is completed
                    </li>
                    <li>• All changes are tracked in stock movements</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Repair Request"}
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
