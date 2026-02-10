"use client";

import { useState, useEffect } from "react";
import { getTodayString } from "@/lib/date-utils";
import { sanitizeNumericInput } from "@/lib/validation-utils";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useToast } from "@/lib/hooks/useToast";

interface Site {
  id: string;
  name: string;
  location: string;
}

interface BulkRecord {
  id: number;
  labourName: string;
  shiftsWorked: string;
  wagePerShift: string;
  notes: string;
}

export default function NewAttendancePage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<"SINGLE" | "BULK">("SINGLE");
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);

  // Single Entry Form State
  const [formData, setFormData] = useState({
    labourName: "",
    attendanceDate: getTodayString(),
    shiftType: "WAREHOUSE",
    siteId: "",
    shiftsWorked: "1",
    wagePerShift: "",
    notes: "",
  });

  // Bulk Entry State
  const [bulkData, setBulkData] = useState<{
    records: BulkRecord[];
    date: string;
    shiftType: string;
    siteId: string;
  }>({
    records: [],
    date: getTodayString(),
    shiftType: "WAREHOUSE",
    siteId: "",
  });

  useEffect(() => {
    fetch("/api/sites")
      .then((r) => r.json())
      .then((data) => setSites(data));
  }, []);

  const calculateTotalWage = () => {
    if (formData.shiftsWorked && formData.wagePerShift) {
      return (
        parseFloat(formData.shiftsWorked) * parseFloat(formData.wagePerShift)
      ).toFixed(2);
    }
    return "0.00";
  };

  const calculateBulkTotal = () => {
    return bulkData.records.reduce((sum, record) => {
      const wage = parseFloat(record.wagePerShift) || 0;
      const shifts = parseFloat(record.shiftsWorked) || 0;
      return sum + (wage * shifts);
    }, 0).toFixed(2);
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/labour-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          attendanceDate: new Date(formData.attendanceDate).toISOString(),
        }),
      });

      if (response.ok) {
        success("Attendance marked successfully");
        router.push("/dashboard/labour");
        router.refresh();
      } else {
        const errorData = await response.json();
        error(errorData.error || "Failed to mark attendance");
      }
    } catch (err) {
      console.error("Error marking attendance:", err);
      error("An error occurred while marking attendance");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (bulkData.records.length === 0) {
      error("No records to submit");
      return;
    }

    if (bulkData.shiftType === "SITE" && !bulkData.siteId) {
      error("Please select a site");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        attendanceDate: new Date(bulkData.date).toISOString(),
        shiftType: bulkData.shiftType,
        siteId: bulkData.siteId || null,
        records: bulkData.records.map(r => ({
          labourName: r.labourName,
          shiftsWorked: parseFloat(r.shiftsWorked),
          wagePerShift: r.wagePerShift ? parseFloat(r.wagePerShift) : null,
          notes: r.notes || null
        }))
      };

      const response = await fetch("/api/labour-attendance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const res = await response.json();
        success(`Successfully marked attendance for ${res.count} labourers`);
        router.push("/dashboard/labour");
        router.refresh();
      } else {
        const errorData = await response.json();
        error(errorData.error || "Failed to submit bulk attendance");
      }
    } catch (err) {
      console.error("Error submitting bulk attendance:", err);
      error("An error occurred while submitting attendance");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
    // Reset input value to allow re-uploading same file if needed
    e.target.value = '';
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.split(/\r\n|\n/);
    const newRecords: BulkRecord[] = [];

    // Skip empty lines
    const dataLines = lines.filter(line => line.trim() !== "");

    // Assume first row is header if it contains "name" or similar logic?
    // Let's assume standard format: Name, Wage, Shifts, Notes
    // Or just try to parse all lines, skipping header if detection fails

    let startIndex = 0;
    const firstLineLower = dataLines[0]?.toLowerCase() || "";
    if (firstLineLower.includes("name") || firstLineLower.includes("labour")) {
      startIndex = 1; // Skip header
    }

    for (let i = startIndex; i < dataLines.length; i++) {
      const line = dataLines[i];
      // Simple CSV split (handling simple commas)
      const cols = line.split(",").map(c => c.trim());

      if (cols.length > 0 && cols[0]) {
        newRecords.push({
          id: Date.now() + i,
          labourName: cols[0],
          wagePerShift: cols[1] || "", // Optional
          shiftsWorked: cols[2] || "1", // Default to 1
          notes: cols[3] || "" // Optional
        });
      }
    }

    if (newRecords.length === 0) {
      error("No valid records found in CSV");
      return;
    }

    setBulkData(prev => ({
      ...prev,
      records: [...prev.records, ...newRecords]
    }));
  };

  const removeBulkRecord = (id: number) => {
    setBulkData(prev => ({
      ...prev,
      records: prev.records.filter(r => r.id !== id)
    }));
  };

  const updateBulkRecord = (id: number, field: keyof BulkRecord, value: string) => {
    setBulkData(prev => ({
      ...prev,
      records: prev.records.map(r =>
        r.id === id ? { ...r, [field]: value } : r
      )
    }));
  };

  return (
    <div>
      <Header
        title="Mark Attendance"
        subtitle="Record labour attendance for warehouse or site"
      />

      <div className="p-8">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6 w-full max-w-4xl mx-auto">
          <button
            className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === "SINGLE"
              ? "border-b-2 border-primary-600 text-primary-600"
              : "text-gray-500 hover:text-gray-700"
              }`}
            onClick={() => setActiveTab("SINGLE")}
          >
            Single Entry
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === "BULK"
              ? "border-b-2 border-primary-600 text-primary-600"
              : "text-gray-500 hover:text-gray-700"
              }`}
            onClick={() => setActiveTab("BULK")}
          >
            Bulk Upload (CSV)
          </button>
        </div>

        {activeTab === "SINGLE" ? (
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSingleSubmit} className="card space-y-6">
              {/* Existing Single Entry Form Content */}
              {/* Labour Name */}
              <div>
                <label className="label">
                  Labour Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  value={formData.labourName}
                  onChange={(e) =>
                    setFormData({ ...formData, labourName: e.target.value })
                  }
                  placeholder="Enter labourer's name"
                />
              </div>

              {/* Date */}
              <div>
                <label className="label">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  className="input"
                  value={formData.attendanceDate || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, attendanceDate: e.target.value })
                  }
                  max={getTodayString()}
                />
              </div>

              {/* Location Type */}
              <div>
                <label className="label">
                  Location Type <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="locationType"
                      value="WAREHOUSE"
                      checked={formData.shiftType === "WAREHOUSE"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          shiftType: e.target.value,
                          siteId: "",
                        })
                      }
                      className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${formData.shiftType === "WAREHOUSE"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-600"
                        }`}
                    >
                      Warehouse
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="locationType"
                      value="SITE"
                      checked={formData.shiftType === "SITE"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          shiftType: e.target.value,
                        })
                      }
                      className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${formData.shiftType === "SITE"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                        }`}
                    >
                      Site
                    </span>
                  </label>
                </div>
              </div>

              {/* Site Selection */}
              {formData.shiftType === "SITE" && (
                <div>
                  <label className="label">
                    Site <span className="text-red-500">*</span>
                  </label>
                  <select
                    required={formData.shiftType === "SITE"}
                    className="input"
                    value={formData.siteId}
                    onChange={(e) =>
                      setFormData({ ...formData, siteId: e.target.value })
                    }
                  >
                    <option value="">Select a site</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name} - {site.location}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
              </div>

              {/* Wage Per Shift */}
              <div>
                <label className="label">Wage Per Shift</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input"
                  value={formData.wagePerShift}
                  onChange={(e) => {
                    const sanitized = sanitizeNumericInput(e.target.value, {
                      allowNegative: false,
                      allowDecimal: true,
                      maxDecimals: 2
                    });
                    setFormData({ ...formData, wagePerShift: sanitized });
                  }}
                  placeholder="0.00"
                />
              </div>

              {/* Total Wage */}
              {formData.wagePerShift && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-900">
                      Total Wage:
                    </span>
                    <span className="text-2xl font-bold text-green-700">
                      ₹{calculateTotalWage()}
                    </span>
                  </div>
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
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full md:w-auto"
                >
                  {loading ? "Saving..." : "Mark Attendance"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Bulk Upload Header */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Attendance Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="label">Date</label>
                  <input
                    type="date"
                    className="input"
                    value={bulkData.date || ""}
                    onChange={(e) => setBulkData({ ...bulkData, date: e.target.value })}
                    max={getTodayString()}
                  />
                </div>
                <div>
                  <label className="label">Location Type</label>
                  <select
                    className="input"
                    value={bulkData.shiftType}
                    onChange={(e) => setBulkData({ ...bulkData, shiftType: e.target.value, siteId: "" })}
                  >
                    <option value="WAREHOUSE">Warehouse</option>
                    <option value="SITE">Site</option>
                  </select>
                </div>
                {bulkData.shiftType === "SITE" && (
                  <div>
                    <label className="label">Site</label>
                    <select
                      className="input"
                      value={bulkData.siteId}
                      onChange={(e) => setBulkData({ ...bulkData, siteId: e.target.value })}
                    >
                      <option value="">Select Site</option>
                      {sites.map(site => (
                        <option key={site.id} value={site.id}>{site.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload CSV File
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-md file:border-0
                                file:text-sm file:font-semibold
                                file:bg-primary-50 file:text-primary-700
                                hover:file:bg-primary-100"
                  />
                  <button
                    className="text-gray-500 text-sm hover:text-gray-700 underline"
                    onClick={() => {
                      const csvContent = "Current,500,1,Normal Shift\nSuraj,600,1.5,Overtime";
                      const blob = new Blob([csvContent], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'sample_attendance.csv';
                      a.click();
                    }}
                  >
                    Download Sample
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Format: Name, Wage Per Shift (optional), Shifts Worked (default 1), Notes (optional)
                </p>
              </div>
            </div>

            {/* Preview Table */}
            {bulkData.records.length > 0 && (
              <div className="card">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">
                    Preview Data ({bulkData.records.length} records)
                  </h3>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Total Est. Wage</div>
                    <div className="text-xl font-bold text-green-700">₹{calculateBulkTotal()}</div>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[500px] overflow-y-auto border rounded-lg">
                  <table className="table min-w-full relative">
                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Labour Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Wage/Shift</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Shifts</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {bulkData.records.map((record) => (
                        <tr key={record.id}>
                          <td className="p-2">
                            <input
                              type="text"
                              className="w-full border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                              value={record.labourName}
                              onChange={(e) => updateBulkRecord(record.id, 'labourName', e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              className="w-full border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                              value={record.wagePerShift}
                              placeholder="0.00"
                              onChange={(e) => updateBulkRecord(record.id, 'wagePerShift', e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <select
                              className="w-full border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                              value={record.shiftsWorked}
                              onChange={(e) => updateBulkRecord(record.id, 'shiftsWorked', e.target.value)}
                            >
                              <option value="0.5">0.5</option>
                              <option value="1">1</option>
                              <option value="1.5">1.5</option>
                              <option value="2">2</option>
                              <option value="2.5">2.5</option>
                              <option value="3">3</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              className="w-full border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                              value={record.notes}
                              onChange={(e) => updateBulkRecord(record.id, 'notes', e.target.value)}
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={() => removeBulkRecord(record.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Remove"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkSubmit}
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    {loading ? "Processing..." : `Mark Attendance for ${bulkData.records.length} Labourers`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

