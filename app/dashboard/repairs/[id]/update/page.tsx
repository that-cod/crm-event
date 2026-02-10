"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useToast } from "@/lib/hooks/useToast";

interface Repair {
  id: string;
  itemId: string;
  notes: string | null;
  priority: string;
  status: string;
  assignedTo: string | null;
  estimatedCost: string | null;
  reportedDate: Date;
  startedDate: Date | null;
  item: {
    name: string;
    category: { name: string };
  };
}

export default function UpdateRepairPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [repair, setRepair] = useState<Repair | null>(null);
  const [formData, setFormData] = useState({
    status: "",
    assignedTo: "",
    startedDate: "",
    notes: "",
  });

  useEffect(() => {
    fetch(`/api/repairs/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setRepair(data);
        setFormData({
          status: data.status,
          assignedTo: data.technicianName || data.vendorName || "",
          startedDate: data.startDate
            ? new Date(data.startDate).toISOString().split("T")[0]
            : "",
          notes: data.notes || "",
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading repair:", err);
        error("Failed to load repair");
        setLoading(false);
      });
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`/api/repairs/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: formData.status,
          technicianName: formData.assignedTo || null,
          startDate: formData.startedDate || null,
          notes: formData.notes || null,
        }),
      });

      if (response.ok) {
        success("Repair updated successfully");
        router.push(`/dashboard/repairs/${params.id}`);
        router.refresh();
      } else {
        const errorData = await response.json();
        error(errorData.error || "Failed to update repair");
      }
    } catch (err) {
      console.error("Error updating repair:", err);
      error("An error occurred while updating repair");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading repair...</p>
        </div>
      </div>
    );
  }

  if (!repair) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-gray-600">Repair not found</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Update Repair Status"
        subtitle={`${repair.item.name} - ${repair.notes?.substring(0, 50) || 'No notes'}...`}
      />

      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="card space-y-6">
            {/* Current Status Display */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Current Status
              </h3>
              <p className="text-lg font-semibold text-gray-900">
                {repair.status.replace("_", " ")}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Reported: {new Date(repair.reportedDate).toLocaleDateString()}
              </p>
            </div>

            {/* Status Update */}
            <div>
              <label className="label">
                Update Status <span className="text-red-500">*</span>
              </label>
              <select
                required
                className="input"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Note: Use "Complete Repair" button to properly complete and
                restore item
              </p>
            </div>

            {/* Assigned To */}
            <div>
              <label className="label">Assigned To (Technician/Vendor)</label>
              <input
                type="text"
                className="input"
                value={formData.assignedTo}
                onChange={(e) =>
                  setFormData({ ...formData, assignedTo: e.target.value })
                }
                placeholder="e.g., John Doe, ABC Repair Shop"
              />
            </div>

            {/* Started Date */}
            <div>
              <label className="label">Started Date</label>
              <input
                type="date"
                className="input"
                value={formData.startedDate || ""}
                onChange={(e) =>
                  setFormData({ ...formData, startedDate: e.target.value })
                }
                max={new Date().toISOString().split("T")[0]}
              />
              <p className="text-xs text-gray-500 mt-1">
                When did the repair work begin?
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="label">Update Notes</label>
              <textarea
                className="input"
                rows={3}
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Any updates or progress notes..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary disabled:opacity-50"
              >
                {submitting ? "Updating..." : "Update Repair"}
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
