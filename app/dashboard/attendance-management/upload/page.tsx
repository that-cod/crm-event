"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/hooks/useToast";

interface Site {
    id: string;
    name: string;
    location: string;
}

export default function AttendanceUploadPage() {
    const router = useRouter();
    const { success, error } = useToast();
    const [loading, setLoading] = useState(false);
    const [sites, setSites] = useState<Site[]>([]);
    const [selectedSite, setSelectedSite] = useState("");
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvData, setCsvData] = useState<Array<Record<string, string>>>([]);
    const [previewData, setPreviewData] = useState<Array<Record<string, string>>>([]);
    const [step, setStep] = useState<"upload" | "preview">("upload");

    useEffect(() => {
        fetchSites();
    }, []);

    const fetchSites = async () => {
        try {
            const response = await fetch("/api/sites");
            const data = await response.json();
            setSites(data.sites || []);
        } catch (error) {
            console.error("Error fetching sites:", error);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCsvFile(file);
            parseCSV(file);
        }
    };

    const parseCSV = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const lines = text.split("\n").filter((line) => line.trim());

            // Skip first 3 rows (empty, month header, empty)
            // Row 4 is headers: S.N., Employee Name, 1-31, RATE
            const dataLines = lines.slice(3);

            const parsed = dataLines.map((line) => {
                const values = line.split(",");
                return {
                    serialNo: values[0]?.trim(),
                    name: values[1]?.trim(),
                    rate: values[values.length - 1]?.trim(), // Last column is RATE
                };
            }).filter((row) => row.name && row.name !== "Employee Name");

            setCsvData(parsed);
        };
        reader.readAsText(file);
    };

    const handleUploadCSV = async () => {
        if (!selectedSite || csvData.length === 0) {
            error("Please select a site and upload a CSV file");
            return;
        }

        setLoading(true);
        try {
            // Upload CSV and create/update labours
            const response = await fetch("/api/attendance-sheets/upload-csv", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    csvData,
                    siteId: selectedSite,
                    month,
                    year,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setPreviewData(data.labours);
                setStep("preview");
            } else {
                error("Error uploading CSV: " + (data.error || "Unknown error"));
            }
        } catch (err) {
            console.error("Error uploading CSV:", err);
            error("Failed to upload CSV");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSheets = async () => {
        setLoading(true);
        try {
            // Create attendance sheets
            const laboursData = previewData.map((labour) => ({
                labourId: labour.existingLabourId,
                dailyRate: labour.rate,
            }));

            const response = await fetch("/api/attendance-sheets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    siteId: selectedSite,
                    month,
                    year,
                    labours: laboursData,
                }),
            });

            const data = await response.json();

            if (data.success) {
                // Redirect to attendance grid
                router.push(
                    `/dashboard/attendance-management/sheets?siteId=${selectedSite}&month=${month}&year=${year}`
                );
            } else {
                error("Error creating sheets: " + (data.error || "Unknown error"));
            }
        } catch (err) {
            console.error("Error creating sheets:", err);
            error("Failed to create attendance sheets");
        } finally {
            setLoading(false);
        }
    };

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    return (
        <div>
            <Header
                title="Upload Labour Attendance CSV"
                subtitle="Import labour data and create monthly attendance sheets"
                action={
                    <Link href="/dashboard/labour" className="btn btn-secondary">
                        ← Back to Labour
                    </Link>
                }
            />

            <div className="p-8 max-w-4xl mx-auto">
                {step === "upload" ? (
                    <>
                        {/* Step 1: Upload Configuration */}
                        <div className="card mb-6">
                            <h2 className="text-xl font-bold mb-4">Step 1: Select Site and Period</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                                        Site *
                                    </label>
                                    <select
                                        className="input"
                                        value={selectedSite}
                                        onChange={(e) => setSelectedSite(e.target.value)}
                                    >
                                        <option value="">Select Site</option>
                                        {sites.map((site) => (
                                            <option key={site.id} value={site.id}>
                                                {site.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                                        Month *
                                    </label>
                                    <select
                                        className="input"
                                        value={month}
                                        onChange={(e) => setMonth(parseInt(e.target.value))}
                                    >
                                        {monthNames.map((name, index) => (
                                            <option key={index} value={index + 1}>
                                                {name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                                        Year *
                                    </label>
                                    <select
                                        className="input"
                                        value={year}
                                        onChange={(e) => setYear(parseInt(e.target.value))}
                                    >
                                        {[2024, 2025, 2026, 2027].map((y) => (
                                            <option key={y} value={y}>
                                                {y}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Step 2: Upload CSV */}
                        <div className="card mb-6">
                            <h2 className="text-xl font-bold mb-4">Step 2: Upload CSV File</h2>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="csv-upload"
                                />
                                <label
                                    htmlFor="csv-upload"
                                    className="cursor-pointer inline-block"
                                >
                                    <div className="text-6xl mb-4">📄</div>
                                    <p className="text-lg font-medium text-gray-900 mb-2">
                                        {csvFile ? csvFile.name : "Click to upload CSV"}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        CSV should contain: S.N., Employee Name, and RATE columns
                                    </p>
                                </label>
                            </div>

                            {csvData.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-sm text-green-600 font-medium">
                                        ✓ {csvData.length} labours found in CSV
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Upload Button */}
                        <div className="flex justify-end">
                            <button
                                onClick={handleUploadCSV}
                                disabled={!selectedSite || csvData.length === 0 || loading}
                                className="btn btn-primary"
                            >
                                {loading ? "Processing..." : "Process CSV →"}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Step 3: Preview and Confirm */}
                        <div className="card mb-6">
                            <h2 className="text-xl font-bold mb-4">Step 3: Review Labour Data</h2>
                            <p className="text-sm text-gray-600 mb-4">
                                Review the labours below. New labours will be created, existing ones will be updated.
                            </p>

                            <div className="overflow-x-auto">
                                <table className="table">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="table-header">S.N.</th>
                                            <th className="table-header">Name</th>
                                            <th className="table-header">Daily Rate</th>
                                            <th className="table-header">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {previewData.map((labour, index) => (
                                            <tr key={index}>
                                                <td className="table-cell">{labour.serialNo}</td>
                                                <td className="table-cell font-medium">{labour.name}</td>
                                                <td className="table-cell">₹{labour.rate}</td>
                                                <td className="table-cell">
                                                    <span
                                                        className={`px-2 py-1 text-xs rounded-full font-medium ${labour.isNew
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-blue-100 text-blue-800"
                                                            }`}
                                                    >
                                                        {labour.isNew ? "New" : "Existing"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-between">
                            <button
                                onClick={() => setStep("upload")}
                                className="btn btn-secondary"
                                disabled={loading}
                            >
                                ← Back
                            </button>
                            <button
                                onClick={handleCreateSheets}
                                disabled={loading}
                                className="btn btn-primary"
                            >
                                {loading ? "Creating Sheets..." : "Create Attendance Sheets →"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
