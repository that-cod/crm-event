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
  estimatedCost: string | null;
  item: {
    name: string;
    category: { name: string };
  };
}

export default function CompleteRepairPage({
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
    actualCost: "",
    repairDetails: "",
    itemCondition: "GOOD",
  });

  useEffect(() => {
    fetch(`/api/repairs/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setRepair(data);
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
      const response = await fetch(`/api/repairs/${params.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        success("Repair completed successfully! Item restored to inventory.");
        router.push(`/dashboard/repairs/${params.id}`);
        router.refresh();
      } else {
        const errorData = await response.json();
        error(errorData.error || "Failed to complete repair");
      }
    } catch (err) {
      console.error("Error completing repair:", err);
      error("An error occurred while completing repair");
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

  if (repair.status === "COMPLETED") {
    return (
      <div>
        <Header title="Complete Repair" subtitle={repair.item.name} />
        <div className="p-8">
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Repair Already Completed
            </h3>
            <p className="text-gray-600 mb-6">
              This repair has already been marked as completed.
            </p>
            <button
              onClick={() => router.push(`/dashboard/repairs/${params.id}`)}
              className="btn btn-primary"
            >
              View Repair Details
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Complete Repair"
        subtitle={`${repair.item.name} - Finalize and restore item`}
      />

      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="card space-y-6">
            {/* Repair Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                Repair Summary
              </h3>
              <p className="text-sm text-blue-700 mb-1">
                <strong>Item:</strong> {repair.item.name}
              </p>
              <p className="text-sm text-blue-700 mb-1">
                <strong>Issue:</strong> {repair.notes || 'No notes'}
              </p>
              {repair.estimatedCost && (
                <p className="text-sm text-blue-700">
                  <strong>Estimated Cost:</strong> ₹
                  {parseFloat(repair.estimatedCost).toFixed(2)}
                </p>
              )}
            </div>

            {/* Actual Cost */}
            <div>
              <label className="label">Actual Repair Cost</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={formData.actualCost}
                onChange={(e) =>
                  setFormData({ ...formData, actualCost: e.target.value })
                }
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Total cost including parts and labor
              </p>
            </div>

            {/* Repair Details */}
            <div>
              <label className="label">
                Repair Details <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                className="input"
                rows={4}
                value={formData.repairDetails}
                onChange={(e) =>
                  setFormData({ ...formData, repairDetails: e.target.value })
                }
                placeholder="Describe what was done to fix the item..."
              />
            </div>

            {/* Item Condition After Repair */}
            <div>
              <label className="label">
                Item Condition After Repair{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {[
                  {
                    value: "GOOD",
                    label: "Good",
                    description: "Fully repaired and working properly",
                  },
                  {
                    value: "REPAIR_NEEDED",
                    label: "Still Needs Repair",
                    description: "Additional work required",
                  },
                  {
                    value: "DAMAGED",
                    label: "Damaged",
                    description: "Repaired but with limitations",
                  },
                  {
                    value: "REPLACED",
                    label: "Replaced",
                    description: "Parts were replaced",
                  },
                ].map((condition) => (
                  <label
                    key={condition.value}
                    className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name="itemCondition"
                      value={condition.value}
                      checked={formData.itemCondition === condition.value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          itemCondition: e.target.value,
                        })
                      }
                      className="mt-1 w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900">
                        {condition.label}
                      </p>
                      <p className="text-sm text-gray-600">
                        {condition.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Completion Notice */}
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex items-start gap-3">
                <div className="text-xl">✅</div>
                <div>
                  <p className="text-sm font-medium text-green-900 mb-1">
                    What happens when you complete this repair:
                  </p>
                  <ul className="text-xs text-green-700 space-y-1">
                    <li>• Repair status will be marked as COMPLETED</li>
                    <li>
                      • Item will be restored to inventory (+1 available
                      quantity)
                    </li>
                    <li>
                      • Item condition will be updated to selected status
                    </li>
                    <li>• Stock movement will be created for tracking</li>
                    <li>• Completion date will be recorded</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                disabled={submitting}
                className="btn bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? "Completing..." : "Complete Repair"}
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
