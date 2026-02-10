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

export default function ManualTransactionPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [transactionType, setTransactionType] = useState<"PURCHASE" | "SALE">(
    "PURCHASE"
  );
  const [formData, setFormData] = useState({
    itemId: "",
    quantity: "",
    unitPrice: "",
    vendor: "",
    invoiceNumber: "",
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

  const selectedItem = items.find((i) => i.id === formData.itemId);

  const calculateTotal = () => {
    if (formData.quantity && formData.unitPrice) {
      return (
        parseFloat(formData.quantity) * parseFloat(formData.unitPrice)
      ).toFixed(2);
    }
    return "0.00";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/stock-movements/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          type: transactionType,
          quantity: parseInt(formData.quantity),
          unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : null,
        }),
      });

      if (response.ok) {
        success(
          `${transactionType === "PURCHASE" ? "Purchase" : "Sale"} recorded successfully`
        );
        router.push("/dashboard/stock-movements");
        router.refresh();
      } else {
        const errorData = await response.json();
        error(errorData.error || "Failed to record transaction");
      }
    } catch (err) {
      console.error("Error recording transaction:", err);
      error("An error occurred while recording transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header
        title="Manual Transaction"
        subtitle="Record manual purchases or sales"
      />

      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="card space-y-6">
            {/* Transaction Type */}
            <div>
              <label className="label">
                Transaction Type <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="transactionType"
                    value="PURCHASE"
                    checked={transactionType === "PURCHASE"}
                    onChange={() => setTransactionType("PURCHASE")}
                    className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${transactionType === "PURCHASE"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600"
                      }`}
                  >
                    📥 Purchase (Add Stock)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="transactionType"
                    value="SALE"
                    checked={transactionType === "SALE"}
                    onChange={() => setTransactionType("SALE")}
                    className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${transactionType === "SALE"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-600"
                      }`}
                  >
                    📤 Sale (Remove Stock)
                  </span>
                </label>
              </div>
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
                <option value="">Select an item</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} - {item.category.name} (Available:{" "}
                    {item.quantityAvailable})
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity and Unit Price */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={
                    transactionType === "SALE"
                      ? selectedItem?.quantityAvailable
                      : undefined
                  }
                  className="input"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  placeholder="Enter quantity"
                />
                {transactionType === "SALE" && selectedItem && (
                  <p className="text-xs text-gray-500 mt-1">
                    Max available: {selectedItem.quantityAvailable}
                  </p>
                )}
              </div>

              <div>
                <label className="label">Unit Price</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input"
                  value={formData.unitPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, unitPrice: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Total Amount Display */}
            {formData.unitPrice && (
              <div
                className={`${transactionType === "PURCHASE"
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
                  } border rounded-lg p-4`}
              >
                <div className="flex justify-between items-center">
                  <span
                    className={`text-sm font-medium ${transactionType === "PURCHASE"
                      ? "text-green-900"
                      : "text-red-900"
                      }`}
                  >
                    Total Amount:
                  </span>
                  <span
                    className={`text-2xl font-bold ${transactionType === "PURCHASE"
                      ? "text-green-700"
                      : "text-red-700"
                      }`}
                  >
                    ₹{calculateTotal()}
                  </span>
                </div>
                <p
                  className={`text-xs mt-1 ${transactionType === "PURCHASE"
                    ? "text-green-600"
                    : "text-red-600"
                    }`}
                >
                  {formData.quantity} units × ₹{formData.unitPrice}
                </p>
              </div>
            )}

            {/* Vendor/Party */}
            <div>
              <label className="label">
                {transactionType === "PURCHASE" ? "Vendor" : "Customer/Party"}
              </label>
              <input
                type="text"
                className="input"
                value={formData.vendor}
                onChange={(e) =>
                  setFormData({ ...formData, vendor: e.target.value })
                }
                placeholder={
                  transactionType === "PURCHASE"
                    ? "Vendor name"
                    : "Customer/party name"
                }
              />
            </div>

            {/* Invoice Number */}
            <div>
              <label className="label">Invoice/Bill Number</label>
              <input
                type="text"
                className="input"
                value={formData.invoiceNumber}
                onChange={(e) =>
                  setFormData({ ...formData, invoiceNumber: e.target.value })
                }
                placeholder="e.g., INV-2025-001"
              />
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
                placeholder="Any additional information about this transaction..."
              />
            </div>

            {/* Warning Box */}
            <div
              className={`${transactionType === "PURCHASE"
                ? "bg-green-50 border-green-200"
                : "bg-orange-50 border-orange-200"
                } border rounded-md p-4`}
            >
              <div className="flex items-start gap-3">
                <div className="text-xl">
                  {transactionType === "PURCHASE" ? "✅" : "⚠️"}
                </div>
                <div>
                  <p
                    className={`text-sm font-medium mb-1 ${transactionType === "PURCHASE"
                      ? "text-green-900"
                      : "text-orange-900"
                      }`}
                  >
                    {transactionType === "PURCHASE"
                      ? "This will:"
                      : "Important:"}
                  </p>
                  <ul
                    className={`text-xs space-y-1 ${transactionType === "PURCHASE"
                      ? "text-green-700"
                      : "text-orange-700"
                      }`}
                  >
                    {transactionType === "PURCHASE" ? (
                      <>
                        <li>
                          • Add {formData.quantity || "specified"} unit(s) to
                          inventory
                        </li>
                        <li>• Create a PURCHASE stock movement record</li>
                        <li>• Update item cost if unit price is provided</li>
                        <li>• Record vendor information for tracking</li>
                      </>
                    ) : (
                      <>
                        <li>
                          • Remove {formData.quantity || "specified"} unit(s)
                          from inventory
                        </li>
                        <li>• Create a SALE stock movement record</li>
                        <li>
                          • Cannot be undone (quantity will be permanently
                          reduced)
                        </li>
                        <li>• Ensure sufficient stock is available</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                disabled={loading}
                className={`btn disabled:opacity-50 ${transactionType === "PURCHASE"
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-red-600 text-white hover:bg-red-700"
                  }`}
              >
                {loading
                  ? "Processing..."
                  : `Record ${transactionType === "PURCHASE" ? "Purchase" : "Sale"}`}
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
