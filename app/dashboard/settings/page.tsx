"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { useToast } from "@/lib/hooks/useToast";

type CompanySettings = {
  id: string;
  companyName: string;
  tagline: string | null;
  registeredOffice: string | null;
  corporateOffice: string | null;
  godownAddress: string | null;
  gstin: string | null;
  pan: string | null;
  email: string | null;
  phone: string | null;
  logoUrl: string | null;
  sellerState: string | null;
  sellerStateCode: string | null;
};

export default function SettingsPage() {
  const { success, error } = useToast();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings/company");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setIsEditing(false);
        success("Settings saved successfully!");
      } else {
        const errorData = await res.json();
        error(errorData.error || "Failed to save settings");
      }
    } catch (err) {
      console.error("Error saving settings:", err);
      error("An error occurred while saving settings");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof CompanySettings, value: string) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value || null });
  };

  if (loading) {
    return (
      <div>
        <Header title="Settings" subtitle="System configuration and preferences" />
        <div className="p-8">
          <div className="text-center py-12">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Settings"
        subtitle="System configuration and preferences"
        action={
          !isEditing ? (
            <button onClick={() => setIsEditing(true)} className="btn btn-primary">
              ✏️ Edit Settings
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary disabled:opacity-50"
              >
                {saving ? "Saving..." : "💾 Save Changes"}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  fetchSettings(); // Reset to saved values
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          )
        }
      />

      <div className="p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Company Information */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Company Information</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Company Name *</label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="input"
                      value={settings?.companyName || ""}
                      onChange={(e) => updateField("companyName", e.target.value)}
                    />
                  ) : (
                    <p className="text-lg font-semibold">{settings?.companyName || "Not set"}</p>
                  )}
                </div>
                <div>
                  <label className="label">Tagline</label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="input"
                      value={settings?.tagline || ""}
                      onChange={(e) => updateField("tagline", e.target.value)}
                      placeholder="e.g., Event Management & Tent Rental Services"
                    />
                  ) : (
                    <p className="text-gray-700">{settings?.tagline || "Not set"}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="label">Registered Office Address</label>
                {isEditing ? (
                  <textarea
                    className="input"
                    rows={2}
                    value={settings?.registeredOffice || ""}
                    onChange={(e) => updateField("registeredOffice", e.target.value)}
                    placeholder="e.g., C-64, First Floor, Double Storey, Ramesh Nagar, New Delhi - 110015"
                  />
                ) : (
                  <p className="text-gray-700">{settings?.registeredOffice || "Not set"}</p>
                )}
              </div>

              <div>
                <label className="label">Corporate Office Address</label>
                {isEditing ? (
                  <textarea
                    className="input"
                    rows={2}
                    value={settings?.corporateOffice || ""}
                    onChange={(e) => updateField("corporateOffice", e.target.value)}
                    placeholder="e.g., E-3, Dhawandeep Building, 6 Jantar Mantar Road, New Delhi - 110001"
                  />
                ) : (
                  <p className="text-gray-700">{settings?.corporateOffice || "Not set"}</p>
                )}
              </div>

              <div>
                <label className="label">Godown/Warehouse Address</label>
                {isEditing ? (
                  <textarea
                    className="input"
                    rows={2}
                    value={settings?.godownAddress || ""}
                    onChange={(e) => updateField("godownAddress", e.target.value)}
                    placeholder="e.g., F-64, Radhey Mohan Drive, Vill. Jaunapur, Mehrauli, New Delhi"
                  />
                ) : (
                  <p className="text-gray-700">{settings?.godownAddress || "Not set"}</p>
                )}
              </div>
            </div>
          </div>

          {/* Tax Information */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Tax & Legal Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">GSTIN</label>
                {isEditing ? (
                  <input
                    type="text"
                    className="input font-mono"
                    value={settings?.gstin || ""}
                    onChange={(e) => updateField("gstin", e.target.value.toUpperCase())}
                    placeholder="e.g., 07ABTFS4753L1ZC"
                  />
                ) : (
                  <p className="font-mono text-lg font-semibold">{settings?.gstin || "Not set"}</p>
                )}
              </div>
              <div>
                <label className="label">PAN</label>
                {isEditing ? (
                  <input
                    type="text"
                    className="input font-mono"
                    value={settings?.pan || ""}
                    onChange={(e) => updateField("pan", e.target.value.toUpperCase())}
                    placeholder="e.g., ABTFS4753L"
                  />
                ) : (
                  <p className="font-mono text-lg">{settings?.pan || "Not set"}</p>
                )}
              </div>
              <div>
                <label className="label">Seller State</label>
                {isEditing ? (
                  <input
                    type="text"
                    className="input"
                    value={settings?.sellerState || ""}
                    onChange={(e) => updateField("sellerState", e.target.value)}
                    placeholder="e.g., DELHI"
                  />
                ) : (
                  <p>{settings?.sellerState || "Not set"}</p>
                )}
              </div>
              <div>
                <label className="label">State Code</label>
                {isEditing ? (
                  <input
                    type="text"
                    className="input"
                    value={settings?.sellerStateCode || ""}
                    onChange={(e) => updateField("sellerStateCode", e.target.value)}
                    placeholder="e.g., 07"
                  />
                ) : (
                  <p>{settings?.sellerStateCode || "Not set"}</p>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    className="input"
                    value={settings?.email || ""}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="e.g., info@company.com"
                  />
                ) : (
                  <p>{settings?.email || "Not set"}</p>
                )}
              </div>
              <div>
                <label className="label">Phone</label>
                {isEditing ? (
                  <input
                    type="text"
                    className="input"
                    value={settings?.phone || ""}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="e.g., +91-XXXXXXXXXX"
                  />
                ) : (
                  <p>{settings?.phone || "Not set"}</p>
                )}
              </div>
              <div className="col-span-2">
                <label className="label">Logo URL</label>
                {isEditing ? (
                  <input
                    type="url"
                    className="input"
                    value={settings?.logoUrl || ""}
                    onChange={(e) => updateField("logoUrl", e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                ) : (
                  settings?.logoUrl ? (
                    <img src={settings.logoUrl} alt="Company Logo" className="h-16 object-contain" />
                  ) : (
                    <p className="text-gray-500">Not set</p>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
            <div className="grid grid-cols-2 gap-3">
              <a
                href="/dashboard/users"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <p className="font-medium">User Management</p>
                <p className="text-xs text-gray-600 mt-1">Manage system users and roles</p>
              </a>
              <a
                href="/dashboard/reports"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <p className="font-medium">Reports</p>
                <p className="text-xs text-gray-600 mt-1">View analytics and exports</p>
              </a>
              <a
                href="/dashboard/challans"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <p className="font-medium">Challans</p>
                <p className="text-xs text-gray-600 mt-1">View all delivery challans</p>
              </a>
              <a
                href="/api/reports/export/stock?format=csv"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <p className="font-medium">Export Data</p>
                <p className="text-xs text-gray-600 mt-1">Export inventory to CSV</p>
              </a>
            </div>
          </div>

          {/* System Information */}
          <div className="card bg-gray-50">
            <h3 className="text-sm font-semibold mb-3 text-gray-700">System Information</h3>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <p className="font-medium text-gray-600">Frontend</p>
                <p className="text-gray-800">Next.js 14 + TypeScript</p>
              </div>
              <div>
                <p className="font-medium text-gray-600">Backend</p>
                <p className="text-gray-800">Next.js API Routes</p>
              </div>
              <div>
                <p className="font-medium text-gray-600">Database</p>
                <p className="text-gray-800">PostgreSQL + Prisma</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
