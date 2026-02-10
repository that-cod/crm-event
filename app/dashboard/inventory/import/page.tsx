"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useToast } from "@/lib/hooks/useToast";

export default function ImportInventoryPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [importing, setImporting] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [results, setResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
    };
    reader.readAsText(file);
  };

  const parseCsv = (csv: string) => {
    const lines = csv.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim());
    const items = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      if (values.length < 2) continue; // Skip empty lines

      const item: Record<string, string> = {};
      headers.forEach((header, index) => {
        item[header] = values[index] || "";
      });
      items.push(item);
    }

    return items;
  };

  const handleImport = async () => {
    if (!csvText.trim()) {
      error("Please paste CSV data or upload a file");
      return;
    }

    setImporting(true);
    setResults(null);

    try {
      const items = parseCsv(csvText);

      if (items.length === 0) {
        error("No valid items found in CSV");
        setImporting(false);
        return;
      }

      const response = await fetch("/api/inventory/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data);
      } else {
        const errorData = await response.json();
        error(errorData.error || "Failed to import items");
      }
    } catch (err) {
      console.error("Error importing:", err);
      error("An error occurred during import");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template =
      "name,categoryName,subcategoryName,quantity,cost,vendor,description\n" +
      "Tent 10x10,Tents,Small,50,2500,ABC Suppliers,Standard event tent\n" +
      "Chair Plastic,Furniture,Seating,200,150,XYZ Vendor,White plastic chair";

    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory-import-template.csv";
    a.click();
  };

  return (
    <div>
      <Header
        title="Bulk Import Inventory"
        subtitle="Import items from CSV file or paste data"
      />

      <div className="p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Instructions */}
          <div className="card border-blue-200 bg-blue-50">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              📋 How to Import
            </h3>
            <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
              <li>Download the CSV template below</li>
              <li>
                Fill in your inventory data (name, categoryName, quantity are
                required)
              </li>
              <li>Upload the CSV file or paste the data in the text area</li>
              <li>Click "Import Items" to process</li>
              <li>
                Review the results - new items will be created, existing items
                will have quantities added
              </li>
            </ol>
            <button
              type="button"
              onClick={downloadTemplate}
              className="mt-4 btn btn-secondary text-sm"
            >
              📥 Download CSV Template
            </button>
          </div>

          {/* CSV Format Reference */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-3">
              📊 CSV Format Reference
            </h3>
            <div className="overflow-x-auto">
              <table className="table text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Column</th>
                    <th className="table-header">Required</th>
                    <th className="table-header">Description</th>
                    <th className="table-header">Example</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="table-cell font-mono">name</td>
                    <td className="table-cell">
                      <span className="text-red-600 font-bold">Yes</span>
                    </td>
                    <td className="table-cell">Item name</td>
                    <td className="table-cell">Tent 10x10</td>
                  </tr>
                  <tr>
                    <td className="table-cell font-mono">categoryName</td>
                    <td className="table-cell">
                      <span className="text-red-600 font-bold">Yes</span>
                    </td>
                    <td className="table-cell">
                      Category (created if doesn't exist)
                    </td>
                    <td className="table-cell">Tents</td>
                  </tr>
                  <tr>
                    <td className="table-cell font-mono">subcategoryName</td>
                    <td className="table-cell">No</td>
                    <td className="table-cell">
                      Subcategory (created if doesn't exist)
                    </td>
                    <td className="table-cell">Small</td>
                  </tr>
                  <tr>
                    <td className="table-cell font-mono">quantity</td>
                    <td className="table-cell">No</td>
                    <td className="table-cell">
                      Initial quantity (default: 0)
                    </td>
                    <td className="table-cell">50</td>
                  </tr>
                  <tr>
                    <td className="table-cell font-mono">cost</td>
                    <td className="table-cell">No</td>
                    <td className="table-cell">Cost per unit</td>
                    <td className="table-cell">2500</td>
                  </tr>
                  <tr>
                    <td className="table-cell font-mono">vendor</td>
                    <td className="table-cell">No</td>
                    <td className="table-cell">Vendor name</td>
                    <td className="table-cell">ABC Suppliers</td>
                  </tr>
                  <tr>
                    <td className="table-cell font-mono">description</td>
                    <td className="table-cell">No</td>
                    <td className="table-cell">Item description</td>
                    <td className="table-cell">Standard event tent</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* File Upload */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-3">Upload CSV File</h3>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="input"
            />
          </div>

          {/* CSV Text Area */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-3">
              Or Paste CSV Data Directly
            </h3>
            <textarea
              className="input font-mono text-sm"
              rows={12}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`name,categoryName,subcategoryName,quantity,cost,vendor,description\nTent 10x10,Tents,Small,50,2500,ABC Suppliers,Standard event tent\nChair Plastic,Furniture,Seating,200,150,XYZ Vendor,White plastic chair`}
            />
          </div>

          {/* Import Button */}
          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={importing || !csvText.trim()}
              className="btn btn-primary disabled:opacity-50"
            >
              {importing ? "Importing..." : "Import Items"}
            </button>
            <button
              onClick={() => router.back()}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>

          {/* Results */}
          {results && (
            <div
              className={`card ${results.failed === 0
                  ? "border-green-200 bg-green-50"
                  : "border-orange-200 bg-orange-50"
                }`}
            >
              <h3
                className={`text-lg font-semibold mb-3 ${results.failed === 0 ? "text-green-900" : "text-orange-900"
                  }`}
              >
                Import Results
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Successfully Imported</p>
                  <p className="text-2xl font-bold text-green-700">
                    {results.success}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-red-700">
                    {results.failed}
                  </p>
                </div>
              </div>

              {results.errors.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium text-red-900 mb-2">
                    Errors:
                  </p>
                  <ul className="text-xs text-red-700 space-y-1">
                    {results.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {results.success > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => router.push("/dashboard/inventory")}
                    className="btn btn-primary"
                  >
                    View Inventory
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
