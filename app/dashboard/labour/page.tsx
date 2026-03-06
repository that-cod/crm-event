"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { useToast } from "@/lib/hooks/useToast";

interface Site {
  id: string;
  name: string;
}

interface Labour {
  id: string;
  name: string;
  defaultDailyRate: number;
  siteId: string;
}

export default function LabourPage() {
  const { success, error: showError } = useToast();

  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [labours, setLabours] = useState<Labour[]>([]);
  const [loading, setLoading] = useState(false);

  // Add labour form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRate, setNewRate] = useState("500");
  const [adding, setAdding] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sites")
      .then((r) => r.json())
      .then((data) => setSites(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  const fetchLabours = useCallback(async (siteId: string) => {
    if (!siteId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/labours?siteId=${siteId}`);
      const data = await res.json();
      setLabours(data.labours || data || []);
    } catch {
      showError("Failed to fetch labours");
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const handleSiteChange = (siteId: string) => {
    setSelectedSite(siteId);
    setLabours([]);
    if (siteId) fetchLabours(siteId);
  };

  const handleAddLabour = async () => {
    if (!newName.trim() || !selectedSite) {
      showError("Name and site are required");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/labours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          siteId: selectedSite,
          defaultDailyRate: parseFloat(newRate) || 500,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        success(`Labour "${newName.trim()}" added`);
        setNewName("");
        setNewRate("500");
        setShowAddForm(false);
        fetchLabours(selectedSite);
      } else {
        showError(data.error || "Failed to add labour");
      }
    } catch {
      showError("Failed to add labour");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (labour: Labour) => {
    if (!confirm(`Delete "${labour.name}"? This will remove all their attendance records.`)) return;
    setDeletingId(labour.id);
    try {
      const res = await fetch(`/api/labours/${labour.id}`, { method: "DELETE" });
      if (res.ok) {
        success(`"${labour.name}" deleted`);
        setLabours((prev) => prev.filter((l) => l.id !== labour.id));
      } else {
        const data = await res.json();
        showError(data.error || "Failed to delete");
      }
    } catch {
      showError("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <Header
        title="Labour Management"
        subtitle="Manage labours per site — add individually or via bulk CSV upload"
        action={
          <Link href="/dashboard/labour/bulk-upload" className="btn btn-secondary">
            Bulk Upload CSV
          </Link>
        }
      />

      <div className="p-8 max-w-4xl mx-auto">
        {/* Site selector */}
        <div className="card mb-6">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Select Site
          </label>
          <select
            className="input"
            value={selectedSite}
            onChange={(e) => handleSiteChange(e.target.value)}
          >
            <option value="">Select a site to view labours</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {selectedSite && (
          <>
            {/* Add labour form */}
            {showAddForm ? (
              <div className="card mb-6 border-primary-200 bg-primary-50">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Add New Labour</h3>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Name
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Ramesh Kumar"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddLabour()}
                      autoFocus
                    />
                  </div>
                  <div className="w-32">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Daily Rate (₹)
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={newRate}
                      onChange={(e) => setNewRate(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={handleAddLabour}
                    disabled={adding}
                    className="btn btn-primary"
                  >
                    {adding ? "Adding..." : "Add"}
                  </button>
                  <button
                    onClick={() => { setShowAddForm(false); setNewName(""); setNewRate("500"); }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-4 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {loading ? "Loading..." : `${labours.length} labour${labours.length !== 1 ? "s" : ""} at this site`}
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="btn btn-primary"
                >
                  + Add Labour
                </button>
              </div>
            )}

            {/* Labour list */}
            <div className="card">
              {loading ? (
                <div className="text-center py-10 text-gray-500">Loading labours...</div>
              ) : labours.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-600 mb-4">No labours added for this site yet.</p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="btn btn-primary"
                    >
                      + Add Labour
                    </button>
                    <Link href="/dashboard/labour/bulk-upload" className="btn btn-secondary">
                      Bulk Upload CSV
                    </Link>
                  </div>
                </div>
              ) : (
                <table className="table">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-header">S.N.</th>
                      <th className="table-header">Name</th>
                      <th className="table-header">Daily Rate (₹)</th>
                      <th className="table-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {labours.map((labour, i) => (
                      <tr key={labour.id}>
                        <td className="table-cell text-gray-500">{i + 1}</td>
                        <td className="table-cell font-medium">{labour.name}</td>
                        <td className="table-cell">₹{labour.defaultDailyRate}</td>
                        <td className="table-cell">
                          <button
                            onClick={() => handleDelete(labour)}
                            disabled={deletingId === labour.id}
                            className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                          >
                            {deletingId === labour.id ? "Deleting..." : "Delete"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {labours.length > 0 && (
              <div className="mt-4 text-center">
                <Link
                  href="/dashboard/attendance-management"
                  className="btn btn-primary"
                >
                  Go to Attendance Management →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
