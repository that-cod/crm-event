"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Link from "next/link";

interface AttendanceRecord {
  id: string;
  date: string;
  shiftsWorked: string | number;
  totalWage: string | number | null;
  shiftType: string;
}


interface LabourSummary {
  labourName: string;
  totalDays: number;
  totalShifts: number;
  totalWages: number;
  warehouseDays: number;
  siteDays: number;
  records: AttendanceRecord[];
}

export default function LabourSummaryPage() {
  const [loading, setLoading] = useState(true);
  const [labourSummary, setLabourSummary] = useState<LabourSummary[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [expandedLabour, setExpandedLabour] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, [dateRange]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);

      const response = await fetch(
        `/api/labour-attendance/summary?${params.toString()}`
      );
      const data = await response.json();
      setLabourSummary(data.labourSummary);
    } catch (error) {
      console.error("Error fetching summary:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalStats = {
    totalLabourers: labourSummary.length,
    totalDays: labourSummary.reduce((sum, l) => sum + l.totalDays, 0),
    totalShifts: labourSummary.reduce((sum, l) => sum + l.totalShifts, 0),
    totalWages: labourSummary.reduce((sum, l) => sum + l.totalWages, 0),
  };

  return (
    <div>
      <Header
        title="Labour Summary Report"
        subtitle="Attendance and wage summary by labourer"
        action={
          <Link href="/labour" className="btn btn-secondary">
            ← Back to Attendance
          </Link>
        }
      />

      <div className="p-8">
        {/* Overall Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card border-blue-200 bg-blue-50">
            <p className="text-sm text-blue-600">Total Labourers</p>
            <p className="text-2xl font-bold text-blue-700">
              {totalStats.totalLabourers}
            </p>
          </div>
          <div className="card border-orange-200 bg-orange-50">
            <p className="text-sm text-orange-600">Total Work Days</p>
            <p className="text-2xl font-bold text-orange-700">
              {totalStats.totalDays}
            </p>
          </div>
          <div className="card border-purple-200 bg-purple-50">
            <p className="text-sm text-purple-600">Total Shifts</p>
            <p className="text-2xl font-bold text-purple-700">
              {totalStats.totalShifts.toFixed(1)}
            </p>
          </div>
          <div className="card border-green-200 bg-green-50">
            <p className="text-sm text-green-600">Total Wages Paid</p>
            <p className="text-xl font-bold text-green-700">
              ₹{totalStats.totalWages.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Date Range Filters */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Start Date
              </label>
              <input
                type="date"
                className="input"
                value={dateRange.startDate || ""}
                onChange={(e) =>
                  setDateRange({ ...dateRange, startDate: e.target.value })
                }
                max={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                End Date
              </label>
              <input
                type="date"
                className="input"
                value={dateRange.endDate || ""}
                onChange={(e) =>
                  setDateRange({ ...dateRange, endDate: e.target.value })
                }
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
        </div>

        {/* Labour Summary Table */}
        <div className="card">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-gray-600">Loading summary...</p>
            </div>
          ) : labourSummary.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👷</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Attendance Data
              </h3>
              <p className="text-gray-600 mb-4">
                No attendance records found for the selected date range.
              </p>
              <Link href="/labour/new" className="btn btn-primary">
                Mark Attendance
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Labour Name</th>
                    <th className="table-header">Total Days</th>
                    <th className="table-header">Warehouse Days</th>
                    <th className="table-header">Site Days</th>
                    <th className="table-header">Total Shifts</th>
                    <th className="table-header">Avg Shifts/Day</th>
                    <th className="table-header">Total Wages</th>
                    <th className="table-header">Avg Wage/Day</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {labourSummary.map((labour) => (
                    <>
                      <tr key={labour.labourName} className="hover:bg-gray-50">
                        <td className="table-cell font-medium">
                          {labour.labourName}
                        </td>
                        <td className="table-cell">
                          <span className="font-semibold text-lg">
                            {labour.totalDays}
                          </span>
                        </td>
                        <td className="table-cell text-sm text-blue-600">
                          {labour.warehouseDays}
                        </td>
                        <td className="table-cell text-sm text-green-600">
                          {labour.siteDays}
                        </td>
                        <td className="table-cell">
                          <span className="font-semibold text-lg text-orange-600">
                            {labour.totalShifts.toFixed(1)}
                          </span>
                        </td>
                        <td className="table-cell text-sm">
                          {(labour.totalShifts / labour.totalDays).toFixed(2)}
                        </td>
                        <td className="table-cell font-medium text-green-700">
                          ₹{labour.totalWages.toFixed(2)}
                        </td>
                        <td className="table-cell text-sm">
                          ₹
                          {labour.totalWages > 0
                            ? (labour.totalWages / labour.totalDays).toFixed(2)
                            : "0.00"}
                        </td>
                        <td className="table-cell">
                          <button
                            onClick={() =>
                              setExpandedLabour(
                                expandedLabour === labour.labourName
                                  ? null
                                  : labour.labourName
                              )
                            }
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                          >
                            {expandedLabour === labour.labourName
                              ? "Hide"
                              : "Details"}
                          </button>
                        </td>
                      </tr>
                      {expandedLabour === labour.labourName && (
                        <tr>
                          <td colSpan={9} className="bg-gray-50 p-4">
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm text-gray-700 mb-2">
                                Attendance Records:
                              </h4>
                              <div className="grid grid-cols-1 gap-2">
                                {labour.records.map((record: AttendanceRecord) => (
                                  <div
                                    key={record.id}
                                    className="flex justify-between items-center p-2 bg-white rounded border border-gray-200 text-sm"
                                  >
                                    <div>
                                      <span className="font-medium">
                                        {new Date(
                                          record.date
                                        ).toLocaleDateString()}
                                      </span>
                                      <span className="mx-2">•</span>
                                      <span
                                        className={`px-2 py-0.5 rounded text-xs ${record.shiftType === "WAREHOUSE"
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-green-100 text-green-700"
                                          }`}
                                      >
                                        {record.shiftType}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <span className="text-orange-600 font-semibold">
                                        {parseFloat(
                                          String(record.shiftsWorked)
                                        ).toFixed(1)}{" "}
                                        shifts
                                      </span>
                                      {record.totalWage && (
                                        <span className="text-green-700 font-medium">
                                          ₹
                                          {parseFloat(
                                            String(record.totalWage)
                                          ).toFixed(2)}
                                        </span>
                                      )}
                                      <Link
                                        href={`/labour/${record.id}`}
                                        className="text-primary-600 hover:text-primary-700 font-medium"
                                      >
                                        Edit
                                      </Link>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
