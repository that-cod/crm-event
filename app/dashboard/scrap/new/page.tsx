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
  condition: string;
}

export default function NewScrapPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState({
    itemId: "",
    quantity: "",
    reason: "",
    estimatedValue: "",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/inventory/items")
      .then((r) => r.json())
      .then((data) => {
        // Items API returns paginated response with { data: [], pagination: {} }
        setItems(Array.isArray(data) ? data : data.data || []);
      });
  }, []);

  const handleItemSelect = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    setSelectedItem(item || null);
    setFormData({ ...formData, itemId });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/scrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        success("Item marked as scrap successfully");
        router.push(`/dashboard/scrap/${data.id}`);
        router.refresh();
      } else {
        const errorData = await response.json();
        error(errorData.error || "Failed to mark item as scrap");
      }
    } catch (err) {
      console.error("Error creating scrap record:", err);
      error("An error occurred while marking item as scrap");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header
        title="Mark Item as Scrap"
        subtitle="Record damaged or unusable items"
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
                onChange={(e) => handleItemSelect(e.target.value)}
              >
                <option value="">Select an item</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} - {item.category.name} (Available:{" "}
                    {item.quantityAvailable}) - {item.condition}
                  </option>
                ))}
              </select>
            </div>

            {/* Item Info Display */}
            {selectedItem && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">
                  Selected Item Details
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm text-blue-700">
                  <div>
                    <strong>Item:</strong> {selectedItem.name}
                  </div>
                  <div>
                    <strong>Category:</strong> {selectedItem.category.name}
                  </div>
                  <div>
                    <strong>Available Qty:</strong>{" "}
                    {selectedItem.quantityAvailable}
                  </div>
                  <div>
                    <strong>Condition:</strong> {selectedItem.condition}
                  </div>
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="label">
                Quantity to Scrap <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                max={selectedItem?.quantityAvailable || 999}
                className="input"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                placeholder="1"
              />
              {selectedItem && (
                <p className="text-xs text-gray-500 mt-1">
                  Maximum: {selectedItem.quantityAvailable} available
                </p>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="label">
                Reason for Scrapping <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                className="input"
                rows={4}
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                placeholder="Describe why this item is being scrapped (e.g., beyond repair, damaged in transit, obsolete...)"
              />
            </div>

            {/* Estimated Value */}
            <div>
              <label className="label">Estimated Value Loss</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={formData.estimatedValue}
                onChange={(e) =>
                  setFormData({ ...formData, estimatedValue: e.target.value })
                }
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional: Estimated financial value of the scrapped items
              </p>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="label">Additional Notes</label>
              <textarea
                className="input"
                rows={3}
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Any additional information about this scrap..."
              />
            </div>

            {/* Warning Box */}
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-start gap-3">
                <div className="text-xl">⚠️</div>
                <div>
                  <p className="text-sm font-medium text-red-900 mb-1">
                    Important - This Action Will:
                  </p>
                  <ul className="text-xs text-red-700 space-y-1">
                    <li>• Mark the item condition as "SCRAP"</li>
                    <li>
                      • Deduct {formData.quantity || "specified"} unit(s) from
                      available inventory
                    </li>
                    <li>• Move item(s) to "SCRAP_YARD" location</li>
                    <li>
                      • Create a stock movement record for tracking
                    </li>
                    <li>
                      • Item can be disposed later via the disposal workflow
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                disabled={loading}
                className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Processing..." : "Mark as Scrap"}
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
