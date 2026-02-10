import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const purchaseOrder = await prisma.purchaseOrder.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: {
          item: {
            include: {
              category: true,
            },
          },
        },
      },
      stockMovements: {
        where: {
          movementType: "PURCHASE",
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!purchaseOrder) {
    notFound();
  }

  const summary = {
    totalItems: purchaseOrder.items.length,
    totalOrdered: purchaseOrder.items.reduce(
      (sum, item) => sum + item.orderedQuantity,
      0
    ),
    totalReceived: purchaseOrder.items.reduce(
      (sum, item) => sum + item.receivedQuantity,
      0
    ),
    itemsFullyReceived: purchaseOrder.items.filter(
      (item) => item.receivedQuantity >= item.orderedQuantity
    ).length,
    itemsPending: purchaseOrder.items.filter(
      (item) => item.receivedQuantity < item.orderedQuantity
    ).length,
  };

  const progressPercentage =
    summary.totalOrdered > 0
      ? Math.round((summary.totalReceived / summary.totalOrdered) * 100)
      : 0;

  return (
    <div>
      <Header
        title={`PO: ${purchaseOrder.poNumber}`}
        subtitle={`Vendor: ${purchaseOrder.vendor}`}
        action={
          <div className="flex gap-2">
            <Link
              href={`/dashboard/purchase-orders/${purchaseOrder.id}/print`}
              target="_blank"
              className="btn btn-secondary"
            >
              🖨️ Print / Download PDF
            </Link>
            {purchaseOrder.status !== "FULLY_RECEIVED" && (
              <Link
                href={`/dashboard/purchase-orders/${purchaseOrder.id}/receive`}
                className="btn btn-primary"
              >
                📦 Receive Delivery
              </Link>
            )}
            <Link
              href="/dashboard/purchase-orders"
              className="btn btn-secondary"
            >
              ← Back to POs
            </Link>
          </div>
        }
      />

      <div className="p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* PO Information */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Purchase Order Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  PO Number
                </label>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {purchaseOrder.poNumber}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Vendor
                </label>
                <p className="text-lg text-gray-900 mt-1">
                  {purchaseOrder.vendor}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Order Date
                </label>
                <p className="text-lg text-gray-900 mt-1">
                  {new Date(purchaseOrder.orderDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Expected Delivery
                </label>
                <p className="text-lg text-gray-900 mt-1">
                  {purchaseOrder.expectedDate
                    ? new Date(purchaseOrder.expectedDate).toLocaleDateString()
                    : "—"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Total Amount
                </label>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {purchaseOrder.totalAmount
                    ? `₹${parseFloat(purchaseOrder.totalAmount.toString()).toLocaleString()}`
                    : "—"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Status
                </label>
                <p className="mt-1">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${purchaseOrder.status === "FULLY_RECEIVED"
                      ? "bg-green-100 text-green-800"
                      : purchaseOrder.status === "PARTIALLY_RECEIVED"
                        ? "bg-orange-100 text-orange-800"
                        : purchaseOrder.status === "CANCELLED"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                  >
                    {purchaseOrder.status.replace("_", " ")}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Created At
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {new Date(purchaseOrder.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {purchaseOrder.notes && (
              <div className="mt-4 pt-4 border-t">
                <label className="text-sm font-medium text-gray-600">Notes</label>
                <p className="text-gray-900 mt-1">{purchaseOrder.notes}</p>
              </div>
            )}

            {(purchaseOrder.pdfUrl || purchaseOrder.excelUrl) && (
              <div className="mt-4 pt-4 border-t">
                <label className="text-sm font-medium text-gray-600 block mb-2">
                  Attachments
                </label>
                <div className="flex gap-3">
                  {purchaseOrder.pdfUrl && (
                    <a
                      href={purchaseOrder.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      📄 View PDF
                    </a>
                  )}
                  {purchaseOrder.excelUrl && (
                    <a
                      href={purchaseOrder.excelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      📊 View Excel
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Progress Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card">
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold">{summary.totalItems}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-600">Total Ordered</p>
              <p className="text-2xl font-bold">{summary.totalOrdered}</p>
            </div>
            <div className="card border-orange-200 bg-orange-50">
              <p className="text-sm text-orange-600">Total Received</p>
              <p className="text-2xl font-bold text-orange-700">
                {summary.totalReceived}
              </p>
            </div>
            <div className="card border-green-200 bg-green-50">
              <p className="text-sm text-green-600">Progress</p>
              <p className="text-2xl font-bold text-green-700">
                {progressPercentage}%
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          {purchaseOrder.status !== "FULLY_RECEIVED" && (
            <div className="card">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Delivery Progress
                </span>
                <span className="text-sm text-gray-600">
                  {summary.totalReceived} / {summary.totalOrdered} items
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-primary-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Items Table */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Ordered Items</h2>
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Item Name</th>
                    <th className="table-header">Category</th>
                    <th className="table-header">Ordered Qty</th>
                    <th className="table-header">Received Qty</th>
                    <th className="table-header">Pending</th>
                    <th className="table-header">Unit Cost</th>
                    <th className="table-header">Total Cost</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {purchaseOrder.items.map((poItem) => {
                    const pending = poItem.orderedQuantity - poItem.receivedQuantity;
                    const isComplete = poItem.receivedQuantity >= poItem.orderedQuantity;
                    const totalCost = poItem.unitCost
                      ? parseFloat(poItem.unitCost.toString()) * poItem.orderedQuantity
                      : null;

                    return (
                      <tr
                        key={poItem.id}
                        className={isComplete ? "bg-green-50" : ""}
                      >
                        <td className="table-cell">
                          <Link
                            href={`/dashboard/inventory/${poItem.item.id}`}
                            className="text-primary-600 hover:text-primary-700 font-medium"
                          >
                            {poItem.item.name}
                          </Link>
                        </td>
                        <td className="table-cell text-sm">
                          {poItem.item.category.name}
                        </td>
                        <td className="table-cell">
                          <span className="font-semibold text-lg">
                            {poItem.orderedQuantity}
                          </span>
                        </td>
                        <td className="table-cell">
                          <span className="font-semibold text-lg text-orange-600">
                            {poItem.receivedQuantity}
                          </span>
                        </td>
                        <td className="table-cell">
                          <span
                            className={`font-semibold text-lg ${pending > 0 ? "text-red-600" : "text-green-600"
                              }`}
                          >
                            {pending}
                          </span>
                        </td>
                        <td className="table-cell text-sm">
                          {poItem.unitCost
                            ? `₹${parseFloat(poItem.unitCost.toString()).toFixed(2)}`
                            : "—"}
                        </td>
                        <td className="table-cell text-sm font-medium">
                          {totalCost ? `₹${totalCost.toFixed(2)}` : "—"}
                        </td>
                        <td className="table-cell">
                          {isComplete ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                              Complete
                            </span>
                          ) : poItem.receivedQuantity > 0 ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">
                              Partial
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="table-cell text-xs text-gray-600 max-w-xs truncate">
                          {poItem.notes || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Delivery History */}
          {purchaseOrder.stockMovements.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Delivery History</h2>
              <div className="space-y-3">
                {purchaseOrder.stockMovements.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {movement.itemId
                          ? purchaseOrder.items.find(
                            (i) => i.itemId === movement.itemId
                          )?.item.name || "Unknown Item"
                          : "Multiple Items"}
                      </p>
                      <p className="text-sm text-gray-600">
                        Received: {movement.quantity} units
                      </p>
                      {movement.notes && (
                        <p className="text-xs text-gray-500 mt-1">
                          {movement.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(movement.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-600">
                        {new Date(movement.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
