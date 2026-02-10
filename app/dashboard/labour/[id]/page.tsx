"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useToast } from "@/lib/hooks/useToast";

interface Site {
  id: string;
  name: string;
  location: string;
}

interface AttendanceRecord {
  id: string;
  labourName: string;
  date: Date;
  locationType: string;
  siteId: string | null;
  shiftsWorked: string;
  wagePerShift: string | null;
  totalWage: string | null;
  notes: string | null;
  site: {
    name: string;
    location: string;
  } | null;
}

export default function EditAttendancePage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [formData, setFormData] = useState({
    shiftsWorked: "",
    wagePerShift: "",
    notes: "",
  });

  useEffect(() => {
    fetch(`/api/labour-attendance/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setAttendance(data);
        setFormData({
          shiftsWorked: parseFloat(data.shiftsWorked).toString(),
          wagePerShift: data.wagePerShift
            ? parseFloat(data.wagePerShift).toString()
            : "",
          notes: data.notes || "",
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading attendance:", err);
        error("Failed to load attendance record");
        setLoading(false);
      });
  }, [params.id]);

  const calculateTotalWage = () => {
    if (formData.shiftsWorked && formData.wagePerShift) {
      return (
        parseFloat(formData.shiftsWorked) * parseFloat(formData.wagePerShift)
      ).toFixed(2);
    }
    return "0.00";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`/api/labour-attendance/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        success("Attendance updated successfully");
        router.push("/labour");
        router.refresh();
      } else {
        const errorData = await response.json();
        error(errorData.error || "Failed to update attendance");
      }
    } catch (err) {
      console.error("Error updating attendance:", err);
      error("An error occurred while updating attendance");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this attendance record?")) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/labour-attendance/${params.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        success("Attendance record deleted");
        router.push("/labour");
        router.refresh();
      } else {
        const errorData = await response.json();
        error(errorData.error || "Failed to delete attendance");
      }
    } catch (err) {
      console.error("Error deleting attendance:", err);
      error("An error occurred while deleting attendance");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading attendance record...</p>
        </div>
      </div>
    );
  }

  if (!attendance) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-gray-600">Attendance record not found</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Edit Attendance"
        subtitle={`${attendance.labourName} - ${new Date(
          attendance.date
        ).toLocaleDateString()}`}
      />

      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="card space-y-6">
            {/* Current Record Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Attendance Record Details
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                <div>
                  <strong>Labour:</strong> {attendance.labourName}
                </div>
                <div>
                  <strong>Date:</strong>{" "}
                  {new Date(attendance.date).toLocaleDateString()}
                </div>
                <div>
                  <strong>Type:</strong>{" "}
                  <span
                    className={`px-2 py-1 text-xs rounded-full font-medium ${attendance.locationType === "WAREHOUSE"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                      }`}
                  >
                    {attendance.locationType}
                  </span>
                </div>
                <div>
                  <strong>Location:</strong>{" "}
                  {attendance.locationType === "SITE"
                    ? attendance.site?.name
                    : "Main Warehouse"}
                </div>
              </div>
            </div>

            {/* Shifts Worked */}
            <div>
              <label className="label">
                Shifts Worked <span className="text-red-500">*</span>
              </label>
              <select
                required
                className="input"
                value={formData.shiftsWorked}
                onChange={(e) =>
                  setFormData({ ...formData, shiftsWorked: e.target.value })
                }
              >
                <option value="0.5">0.5 (Half shift)</option>
                <option value="1">1 (Full shift)</option>
                <option value="1.5">1.5 (One and half shifts)</option>
                <option value="2">2 (Two shifts)</option>
                <option value="2.5">2.5 (Two and half shifts)</option>
                <option value="3">3 (Three shifts)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Shifts can be marked in increments of 0.5
              </p>
            </div>

            {/* Wage Per Shift */}
            <div>
              <label className="label">Wage Per Shift</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={formData.wagePerShift}
                onChange={(e) =>
                  setFormData({ ...formData, wagePerShift: e.target.value })
                }
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Amount paid per shift
              </p>
            </div>

            {/* Total Wage Display */}
            {formData.wagePerShift && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-green-900">
                    Total Wage Calculation:
                  </span>
                  <span className="text-2xl font-bold text-green-700">
                    ₹{calculateTotalWage()}
                  </span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  {formData.shiftsWorked} shifts × ₹{formData.wagePerShift}
                </p>
              </div>
            )}

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
                placeholder="Any additional notes about this attendance..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary disabled:opacity-50"
              >
                {submitting ? "Updating..." : "Update Attendance"}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="btn btn-danger disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
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
