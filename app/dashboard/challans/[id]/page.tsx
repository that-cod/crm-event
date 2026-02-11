import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";
import ChallanEditForm from "./ChallanEditForm";
import ChallanItemsEdit from "./ChallanItemsEdit";
import CancelChallanButton from "./CancelChallanButton";


export default async function ChallanDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const challan = await prisma.challan.findUnique({
    where: { id: params.id },
    include: {
      project: true,
      createdBy: true,
      items: {
        include: {
          item: {
            include: {
              category: true,
            },
          },
        },
      },
    },
  });

  if (!challan) {
    notFound();
  }

  const totalItems = challan.items.length;
  const totalQuantity = challan.items.reduce((sum, item) => sum + item.quantity, 0);

  // Status badge styles
  const statusStyles = {
    SENT: "bg-orange-100 text-orange-800 border-orange-300",
    RETURNED: "bg-green-100 text-green-800 border-green-300",
    PARTIALLY_RETURNED: "bg-yellow-100 text-yellow-800 border-yellow-300",
  };

  const statusLabels = {
    SENT: "📦 Sent",
    RETURNED: "✓ Returned",
    PARTIALLY_RETURNED: "⚠️ Partially Returned",
  };

  return (
    <div>
      <Header
        title={`Challan ${challan.challanNumber}`}
        subtitle={`Status: ${challan.status === "SENT" ? "Sent" : challan.status === "RETURNED" ? "Returned" : "Partially Returned"}`}
        action={
          <div className="flex gap-2 flex-wrap">
            <CancelChallanButton
              challanId={challan.id}
              challanNumber={challan.challanNumber}
              status={challan.status}
            />
            {challan.status !== "RETURNED" && challan.status !== "CANCELLED" && (
              <Link
                href={`/dashboard/challans/${challan.id}/return`}
                className="btn bg-green-600 text-white hover:bg-green-700"
              >
                📥 Process Return
              </Link>
            )}
            <Link
              href={`/dashboard/challans/${challan.id}/packing-list`}
              target="_blank"
              className="btn btn-secondary"
            >
              📋 Packing List
            </Link>
            <Link
              href={`/dashboard/challans/${challan.id}/print`}
              target="_blank"
              className="btn btn-primary"
            >
              🖨️ Delivery Challan
            </Link>
            <Link href="/dashboard/challans" className="btn btn-secondary">
              ← Back
            </Link>
          </div>
        }
      />

      <div className="p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Status Badge */}
          {challan.status === "DRAFT" && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">⚠️</span>
                <div>
                  <h3 className="font-bold text-yellow-900">Draft Challan</h3>
                  <p className="text-sm text-yellow-800">
                    This challan is in draft mode. Edit the details below and save to mark it as sent.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Challan Information */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">📋 Challan Information</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Challan Number
                </label>
                <p className="text-lg font-mono font-bold text-gray-900 mt-1">
                  {challan.challanNumber}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Issue Date
                </label>
                <p className="text-lg text-gray-900 mt-1">
                  {new Date(challan.issueDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Created By
                </label>
                <p className="text-lg text-gray-900 mt-1">
                  {challan.createdBy.name}
                </p>
                <p className="text-xs text-gray-500">{challan.createdBy.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Status
                </label>
                <p className="mt-1">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusStyles[challan.status as keyof typeof statusStyles]}`}>
                    {statusLabels[challan.status as keyof typeof statusLabels]}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Editable Challan Details - Moved up for prominence */}
          <ChallanEditForm
            challanId={challan.id}
            initialData={{
              truckNumber: challan.truckNumber,
              driverName: challan.driverName,
              driverPhone: challan.driverPhone,
              transporterName: challan.transporterName,
              lrBiltyNo: challan.lrBiltyNo,
              contactPersonName: challan.contactPersonName,
              contactPersonNumber: challan.contactPersonNumber,
              dispatchFrom: challan.dispatchFrom,
              dispatchTo: challan.dispatchTo,
              amount: challan.amount,
              expectedReturnDate: challan.expectedReturnDate,
              remarks: challan.remarks,
              status: challan.status,
            }}
            isDraft={challan.status === "DRAFT"}
          />


          {/* Project Information */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Project Details</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Project Name
                </label>
                <p className="text-lg text-gray-900 mt-1">
                  <Link
                    href={`/dashboard/projects/${challan.project.id}`}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    {challan.project.name}
                  </Link>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Type</label>
                <p className="text-lg text-gray-900 mt-1">
                  {challan.project.type.replace("_", " ")}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Location
                </label>
                <p className="text-lg text-gray-900 mt-1">
                  {challan.project.location}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <p className="mt-1">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${challan.project.status === "ACTIVE"
                      ? "bg-green-100 text-green-800"
                      : challan.project.status === "COMPLETED"
                        ? "bg-gray-100 text-gray-800"
                        : "bg-blue-100 text-blue-800"
                      }`}
                  >
                    {challan.project.status}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Items - Editable */}
          <ChallanItemsEdit
            challanId={challan.id}
            projectId={challan.projectId}
            initialItems={challan.items}
          />

          {/* Actions */}
          <div className="card bg-gray-50">
            <h3 className="font-semibold mb-3">Actions</h3>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/dashboard/challans/${challan.id}/print`}
                target="_blank"
                className="btn btn-primary"
              >
                🖨️ Print Challan
              </Link>
              <Link
                href={`/dashboard/projects/${challan.project.id}`}
                className="btn btn-secondary"
              >
                View Project
              </Link>
              <Link
                href="/dashboard/stock-movements"
                className="btn btn-secondary"
              >
                View Stock Movements
              </Link>
            </div>
          </div>

          {/* Metadata */}
          <div className="card bg-gray-50 text-xs text-gray-600">
            <div className="flex justify-between">
              <div>
                <strong>Created:</strong>{" "}
                {new Date(challan.createdAt).toLocaleString()}
              </div>
              <div>
                <strong>Challan ID:</strong> {challan.id}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
