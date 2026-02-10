"use client";

import { useState, useEffect } from "react";
import { getTodayString } from "@/lib/date-utils";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useToast } from "@/lib/hooks/useToast";

interface Item {
  id: string;
  name: string;
  category: { name: string };
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [formData, setFormData] = useState({
    poNumber: "",
    vendor: "",
    orderDate: getTodayString(),
    expectedDate: "",
    totalAmount: "",
    pdfUrl: "",
    excelUrl: "",
    notes: "",
  });
  const [poItems, setPoItems] = useState<
    Array<{
      itemId: string;
      orderedQuantity: string;
      unitCost: string;
      notes: string;
    }>
  >([{ itemId: "", orderedQuantity: "", unitCost: "", notes: "" }]);

  useEffect(() => {
    fetch("/api/inventory/items")
      .then((r) => r.json())
      .then((data) => {
        // Items API returns paginated response with { data: [], pagination: {} }
        setItems(Array.isArray(data) ? data : data.data || []);
      });
  }, []);

  const addItem = () => {
    setPoItems([
      ...poItems,
      { itemId: "", orderedQuantity: "", unitCost: "", notes: "" },
    ]);
  };

  const removeItem = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string) => {
    const updated = [...poItems];
    updated[index] = { ...updated[index], [field]: value };
    setPoItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          items: poItems.filter((item) => item.itemId && item.orderedQuantity),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/dashboard/purchase-orders/${data.id}`);
        router.refresh();
      } else {
        const errorData = await response.json();
        error(errorData.error || "Failed to create purchase order");
      }
    } catch (err) {
      console.error("Error creating purchase order:", err);
      error("An error occurred while creating purchase order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header
        title="Create Purchase Order"
        subtitle="Add a new purchase order"
      />

      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="card space-y-6">
            {/* PO Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">
                  PO Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  value={formData.poNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, poNumber: e.target.value })
                  }
                  placeholder="e.g., PO-2025-001"
                />
              </div>

              <div>
                <label className="label">
                  Vendor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  value={formData.vendor}
                  onChange={(e) =>
                    setFormData({ ...formData, vendor: e.target.value })
                  }
                  placeholder="Vendor name"
                />
              </div>

              <div>
                <label className="label">
                  Order Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  className="input"
                  value={formData.orderDate || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, orderDate: e.target.value })
                  }
                  max={getTodayString()}
                />
              </div>

              <div>
                <label className="label">Expected Delivery Date</label>
                <input
                  type="date"
                  className="input"
                  value={formData.expectedDate || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, expectedDate: e.target.value })
                  }
                  min={getTodayString()}
                />
              </div>

              <div>
                <label className="label">Total Amount</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.totalAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, totalAmount: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* File Upload URLs (Placeholder) */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-900 font-medium mb-2">
                📎 File Upload (Optional)
              </p>
              <p className="text-xs text-blue-700 mb-3">
                Note: File upload functionality will be added in Part 7. For now,
                you can paste public URLs to PDF/Excel files.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-blue-800">PDF URL</label>
                  <input
                    type="url"
                    className="input text-sm"
                    value={formData.pdfUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, pdfUrl: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="text-xs text-blue-800">Excel URL</label>
                  <input
                    type="url"
                    className="input text-sm"
                    value={formData.excelUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, excelUrl: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            {/* PO Items */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="label mb-0">
                  Items <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className="btn btn-secondary text-sm"
                >
                  + Add Item
                </button>
              </div>

              <div className="space-y-3">
                {poItems.map((poItem, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-md p-4"
                  >
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-4">
                        <label className="text-xs text-gray-600">Item</label>
                        <select
                          className="input mt-1"
                          value={poItem.itemId}
                          onChange={(e) =>
                            updateItem(index, "itemId", e.target.value)
                          }
                        >
                          <option value="">Select Item</option>
                          {items.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} - {item.category.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="text-xs text-gray-600">
                          Ordered Qty
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="input mt-1"
                          value={poItem.orderedQuantity}
                          onChange={(e) =>
                            updateItem(index, "orderedQuantity", e.target.value)
                          }
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-xs text-gray-600">
                          Unit Cost
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="input mt-1"
                          value={poItem.unitCost}
                          onChange={(e) =>
                            updateItem(index, "unitCost", e.target.value)
                          }
                          placeholder="0.00"
                        />
                      </div>

                      <div className="col-span-3">
                        <label className="text-xs text-gray-600">Notes</label>
                        <input
                          type="text"
                          className="input mt-1"
                          value={poItem.notes}
                          onChange={(e) =>
                            updateItem(index, "notes", e.target.value)
                          }
                          placeholder="Optional"
                        />
                      </div>

                      <div className="col-span-1 flex items-end">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="btn btn-danger text-sm w-full"
                          disabled={poItems.length === 1}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
                placeholder="Additional notes about this purchase order"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Purchase Order"}
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
