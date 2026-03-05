"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/hooks/useToast";

interface Site {
    id: string;
    name: string;
}

interface ParsedLabour {
    name: string;
    rate: string;
}

export default function BulkUploadLabourPage() {
    const router = useRouter();
    const { success, error: showError } = useToast();
    const [sites, setSites] = useState<Site[]>([]);
    const [selectedSite, setSelectedSite] = useState("");
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [parsedLabours, setParsedLabours] = useState<ParsedLabour[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch("/api/sites")
            .then((r) => r.json())
            .then((data) => setSites(Array.isArray(data) ? data : []))
            .catch(console.error);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCsvFile(file);

        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            const lines = text.split("\n").filter((l) => l.trim());

            // Find header row by looking for "Employee Name"
            const headerIdx = lines.findIndex((l) =>
                l.toLowerCase().includes("employee name")
            );
            if (headerIdx === -1) {
                showError("CSV must have an 'Employee Name' column");
                return;
            }

            const headers = lines[headerIdx].split(",").map((h) => h.trim());
            const nameCol = headers.findIndex(
                (h) => h.toLowerCase() === "employee name"
            );
            const rateCol = headers.findIndex(
                (h) => h.toUpperCase() === "RATE"
            );

            const parsed = lines
                .slice(headerIdx + 1)
                .map((line) => {
                    const vals = line.split(",");
                    return {
                        name: nameCol >= 0 ? (vals[nameCol]?.trim() ?? "") : "",
                        rate: rateCol >= 0 ? (vals[rateCol]?.trim() ?? "500") : "500",
                    };
                })
                .filter((r) => r.name !== "");

            setParsedLabours(parsed);
        };
        reader.readAsText(file);
    };

    const handleUpload = async () => {
        if (!selectedSite || parsedLabours.length === 0) {
            showError("Select a site and upload a CSV");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/labours/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    siteId: selectedSite,
                    labours: parsedLabours,
                }),
            });
            const data = await res.json();
            if (data.success) {
                success(
                    `${data.created} created, ${data.updated} updated out of ${data.count} labours`
                );
                router.push("/dashboard/attendance-management");
            } else {
                showError(data.error || "Upload failed");
            }
        } catch {
            showError("Upload failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <Header
                title="Bulk Upload Labours"
                subtitle="Import labour names and rates from CSV"
                action={
                    <Link href="/dashboard/labour" className="btn btn-secondary">
                        Back to Labour
                    </Link>
                }
            />

            <div className="p-8 max-w-4xl mx-auto">
                <div className="card mb-6">
                    <h2 className="text-xl font-bold mb-4">Select Site</h2>
                    <select
                        className="input"
                        value={selectedSite}
                        onChange={(e) => setSelectedSite(e.target.value)}
                    >
                        <option value="">Select Site</option>
                        {sites.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="card mb-6">
                    <h2 className="text-xl font-bold mb-4">Upload CSV</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        CSV must have an &quot;Employee Name&quot; column. Optional
                        &quot;RATE&quot; column (defaults to 500).
                    </p>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="hidden"
                            id="csv-upload"
                        />
                        <label htmlFor="csv-upload" className="cursor-pointer">
                            <p className="text-lg font-medium text-gray-900 mb-2">
                                {csvFile ? csvFile.name : "Click to upload CSV"}
                            </p>
                            <p className="text-sm text-gray-500">
                                Supports your existing attendance CSV format
                            </p>
                        </label>
                    </div>
                    {parsedLabours.length > 0 && (
                        <p className="mt-4 text-sm text-green-600 font-medium">
                            {parsedLabours.length} labours found in CSV
                        </p>
                    )}
                </div>

                {parsedLabours.length > 0 && (
                    <div className="card mb-6">
                        <h2 className="text-xl font-bold mb-4">Preview</h2>
                        <div className="overflow-x-auto">
                            <table className="table">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="table-header">S.N.</th>
                                        <th className="table-header">Name</th>
                                        <th className="table-header">Daily Rate</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {parsedLabours.map((l, i) => (
                                        <tr key={i}>
                                            <td className="table-cell">{i + 1}</td>
                                            <td className="table-cell font-medium">
                                                {l.name}
                                            </td>
                                            <td className="table-cell">
                                                {l.rate}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="flex justify-end">
                    <button
                        onClick={handleUpload}
                        disabled={
                            !selectedSite || parsedLabours.length === 0 || loading
                        }
                        className="btn btn-primary"
                    >
                        {loading ? "Uploading..." : "Upload Labours"}
                    </button>
                </div>
            </div>
        </div>
    );
}
