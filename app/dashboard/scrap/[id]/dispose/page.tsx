"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useToast } from "@/lib/hooks/useToast";

interface ScrapRecord {
  id: string;
  itemId: string;
  reason: string;
  valueRealized: string | null;
  createdAt: Date;
  disposalDate: Date | null;
  item: {
    name: string;
    category: { name: string };
  };
}

export default function DisposeScrapPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [scrapRecord, setScrapRecord] = useState<ScrapRecord | null>(null);
  const [formData, setFormData] = useState({
    disposalMethod: "",
    valueRealized: "",
    disposalNotes: "",
  });

  useEffect(() => {
    fetch(`/api/scrap/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setScrapRecord(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading scrap record:", err);
        error("Failed to load scrap record");
        setLoading(false);
      });
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`/api/scrap/${params.id}/dispose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        success("Scrap disposed successfully!");
        router.push(`/dashboard/scrap/${params.id}`);
        router.refresh();
      } else {
        const errorData = await response.json();
        error(errorData.error || "Failed to dispose scrap");
      }
    } catch (err) {
      console.error("Error disposing scrap:", err);
      error("An error occurred while disposing scrap");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading scrap record...</p>
        </div>
      </div>
    );
  }

  if (!scrapRecord) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-gray-600">Scrap record not found</p>
        </div>
      </div>
    );
  }

  if (scrapRecord.disposalDate) {
    return (
      <div>
        <Header title="Dispose Scrap" subtitle={scrapRecord.item.name} />
        <div className="p-8">
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Already Disposed
            </h3>
            <p className="text-gray-600 mb-6">
              This scrap has already been disposed on{" "}
              {new Date(scrapRecord.disposalDate).toLocaleDateString()}.
            </p>
            <button
              onClick={() => router.push(`/dashboard/scrap/${params.id}`)}
              className="btn btn-primary"
            >
              View Scrap Details
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Dispose Scrap"
        subtitle={`${scrapRecord.item.name}`}
      />

      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="card space-y-6">
            {/* Scrap Summary */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-orange-900 mb-2">
                Scrap Summary
              </h3>
              <p className="text-sm text-orange-700 mb-1">
                <strong>Item:</strong> {scrapRecord.item.name} (
                {scrapRecord.item.category.name})
              </p>
              <p className="text-sm text-orange-700 mb-1">
                <strong>Reason:</strong> {scrapRecord.reason}
              </p>
              <p className="text-sm text-orange-700 mb-1">
                <strong>Scrapped On:</strong>{" "}
                {new Date(scrapRecord.createdAt).toLocaleDateString()}
              </p>
              {scrapRecord.valueRealized && (
                <p className="text-sm text-orange-700">
                  <strong>Value Realized:</strong> ₹
                  {parseFloat(scrapRecord.valueRealized).toFixed(2)}
                </p>
              )}
            </div>

            {/* Disposal Method */}
            <div>
              <label className="label">
                Disposal Method <span className="text-red-500">*</span>
              </label>
              <select
                required
                className="input"
                value={formData.disposalMethod}
                onChange={(e) =>
                  setFormData({ ...formData, disposalMethod: e.target.value })
                }
              >
                <option value="">Select disposal method</option>
                <option value="SOLD_AS_SCRAP">Sold as Scrap</option>
                <option value="RECYCLED">Recycled</option>
                <option value="DUMPED">Dumped/Landfill</option>
                <option value="DONATED">Donated</option>
                <option value="DESTROYED">Destroyed</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Value Realized */}
            <div>
              <label className="label">Value Realized from Disposal</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={formData.valueRealized}
                onChange={(e) =>
                  setFormData({ ...formData, valueRealized: e.target.value })
                }
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional: Amount recovered from selling or recycling the scrap
              </p>
            </div>

            {/* Disposal Notes */}
            <div>
              <label className="label">Disposal Notes</label>
              <textarea
                className="input"
                rows={4}
                value={formData.disposalNotes}
                onChange={(e) =>
                  setFormData({ ...formData, disposalNotes: e.target.value })
                }
                placeholder="Any additional information about the disposal process..."
              />
            </div>

            {/* Disposal Notice */}
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex items-start gap-3">
                <div className="text-xl">♻️</div>
                <div>
                  <p className="text-sm font-medium text-green-900 mb-1">
                    What happens when you dispose this scrap:
                  </p>
                  <ul className="text-xs text-green-700 space-y-1">
                    <li>• Scrap status will be marked as "Disposed"</li>
                    <li>• Disposal date and method will be recorded</li>
                    <li>
                      • Stock movement will be created tracking final disposal
                    </li>
                    <li>
                      • Recovery amount (if any) will be added to financial
                      records
                    </li>
                    <li>
                      • This action is final and completes the scrap lifecycle
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                disabled={submitting}
                className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? "Processing..." : "Mark as Disposed"}
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
