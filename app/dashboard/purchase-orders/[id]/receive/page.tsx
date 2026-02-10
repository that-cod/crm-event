"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";
import { useToast } from "@/lib/hooks/useToast";

interface POItem {
  id: string;
  itemId: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitCost: string | null;
  notes: string | null;
  item: {
    id: string;
    name: string;
    category: { name: string };
  };
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendor: string;
  status: string;
  items: POItem[];
}

export default function ReceiveDeliveryPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [receiveData, setReceiveData] = useState<
    Record<string, { quantity: string; notes: string }>
  >({});

  useEffect(() => {
    fetch(`/api/purchase-orders/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setPurchaseOrder(data);
        // Initialize receive data for items that still have pending quantities
        const initialData: Record<string, { quantity: string; notes: string }> = {};
        data.items.forEach((item: POItem) => {
          if (item.receivedQuantity < item.orderedQuantity) {
            initialData[item.id] = { quantity: "", notes: "" };
          }
        });
        setReceiveData(initialData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading PO:", err);
        error("Failed to load purchase order");
        setLoading(false);
      });
  }, [params.id]);

  const updateReceiveQuantity = (itemId: string, field: string, value: string) => {
    setReceiveData({
      ...receiveData,
      [itemId]: {
        ...receiveData[itemId],
        [field]: value,
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Filter items that have quantities to receive
    const itemsToReceive = Object.entries(receiveData)
      .filter(([_, data]) => data.quantity && parseInt(data.quantity) > 0)
      .map(([poItemId, data]) => ({
        poItemId,
        quantityReceived: parseInt(data.quantity),
        notes: data.notes,
      }));

    if (itemsToReceive.length === 0) {
      error("Please enter at least one quantity to receive");
      setSubmitting(false);
      return;
    }

    try {
      // Process each item separately
      for (const item of itemsToReceive) {
        const response = await fetch(
          `/api/purchase-orders/${params.id}/receive`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to receive item");
        }
      }

      success(`Successfully received ${itemsToReceive.length} item(s)`);
      router.push(`/dashboard/purchase-orders/${params.id}`);
      router.refresh();
    } catch (err) {
      console.error("Error receiving delivery:", err);
      error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading purchase order...</p>
        </div>
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-gray-600">Purchase order not found</p>
        </div>
      </div>
    );
  }

  const pendingItems = purchaseOrder.items.filter(
    (item) => item.receivedQuantity < item.orderedQuantity
  );

  if (pendingItems.length === 0) {
    return (
      <div>
        <Header
          title="Receive Delivery"
          subtitle={`PO: ${purchaseOrder.poNumber}`}
        />
        <div className="p-8">
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              All Items Received
            </h3>
            <p className="text-gray-600 mb-6">
              This purchase order has been fully received.
            </p>
            <Link
              href={`/dashboard/purchase-orders/${params.id}`}
              className="btn btn-primary"
            >
              View Purchase Order
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Receive Delivery"
        subtitle={`PO: ${purchaseOrder.poNumber} - ${purchaseOrder.vendor}`}
        action={
          <Link
            href={`/dashboard/purchase-orders/${params.id}`}
            className="btn btn-secondary"
          >
            ← Back to PO
          </Link>
        }
      />

      <div className="p-8">
        <div className="max-w-5xl mx-auto">
          <div className="card mb-6">
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-2xl">ℹ️</div>
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Partial Delivery Support
                </p>
                <p className="text-xs text-blue-700">
                  You can receive items partially. Enter the quantity received for
                  each item below. Leave blank if the item was not delivered in
                  this shipment.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="card">
            <h2 className="text-lg font-semibold mb-4">Items to Receive</h2>

            <div className="space-y-4">
              {pendingItems.map((poItem) => {
                const pending = poItem.orderedQuantity - poItem.receivedQuantity;

                return (
                  <div
                    key={poItem.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-4">
                        <label className="text-xs text-gray-600 font-medium">
                          Item Name
                        </label>
                        <p className="font-medium text-gray-900 mt-1">
                          {poItem.item.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {poItem.item.category.name}
                        </p>
                      </div>

                      <div className="col-span-2">
                        <label className="text-xs text-gray-600 font-medium">
                          Ordered
                        </label>
                        <p className="text-lg font-bold text-gray-900 mt-1">
                          {poItem.orderedQuantity}
                        </p>
                      </div>

                      <div className="col-span-2">
                        <label className="text-xs text-gray-600 font-medium">
                          Previously Received
                        </label>
                        <p className="text-lg font-bold text-orange-600 mt-1">
                          {poItem.receivedQuantity}
                        </p>
                      </div>

                      <div className="col-span-2">
                        <label className="text-xs text-gray-600 font-medium">
                          Pending
                        </label>
                        <p className="text-lg font-bold text-red-600 mt-1">
                          {pending}
                        </p>
                      </div>

                      <div className="col-span-2">
                        <label className="text-xs text-gray-600 font-medium">
                          Receive Now <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={pending}
                          className="input mt-1"
                          value={receiveData[poItem.id]?.quantity || ""}
                          onChange={(e) =>
                            updateReceiveQuantity(
                              poItem.id,
                              "quantity",
                              e.target.value
                            )
                          }
                          placeholder="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Max: {pending}
                        </p>
                      </div>

                      <div className="col-span-12">
                        <label className="text-xs text-gray-600 font-medium">
                          Delivery Notes (Optional)
                        </label>
                        <input
                          type="text"
                          className="input mt-1"
                          value={receiveData[poItem.id]?.notes || ""}
                          onChange={(e) =>
                            updateReceiveQuantity(
                              poItem.id,
                              "notes",
                              e.target.value
                            )
                          }
                          placeholder="Any notes about this delivery"
                        />
                      </div>

                      {poItem.notes && (
                        <div className="col-span-12">
                          <label className="text-xs text-gray-600 font-medium">
                            PO Item Notes
                          </label>
                          <p className="text-sm text-gray-700 mt-1">
                            {poItem.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 pt-6 border-t mt-6">
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary disabled:opacity-50"
              >
                {submitting ? "Processing..." : "Confirm Receipt"}
              </button>
              <Link
                href={`/dashboard/purchase-orders/${params.id}`}
                className="btn btn-secondary"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
