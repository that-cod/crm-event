"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Link from "next/link";

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
  } | null;
}

interface AttendanceSummary {
  total: number;
  warehouse: number;
  site: number;
  totalShifts: number;
  totalWages: number;
  uniqueLabourers: number;
}

export default function LabourAttendancePage() {
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>({
    total: 0,
    warehouse: 0,
    site: 0,
    totalShifts: 0,
    totalWages: 0,
    uniqueLabourers: 0,
  });
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetchAttendance();
  }, [locationFilter, dateRange]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (locationFilter !== "ALL") params.append("locationType", locationFilter);
      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);

      const response = await fetch(`/api/labour-attendance?${params.toString()}`);
      const data = await response.json();
      setAttendanceRecords(data.attendanceRecords);
      setSummary(data.summary);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header
        title="Labour Attendance"
        subtitle="Track warehouse and site labour attendance"
        action={
          <div className="flex gap-2">
            <Link href="/dashboard/labour/summary" className="btn btn-secondary">
              📊 View Summary
            </Link>
            <Link href="/dashboard/labour/new" className="btn btn-primary">
              + Mark Attendance
            </Link>
          </div>
        }
      />

      <div className="p-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="card">
            <p className="text-sm text-gray-600">Total Records</p>
            <p className="text-2xl font-bold">{summary.total}</p>
          </div>
          <div className="card border-blue-200 bg-blue-50">
            <p className="text-sm text-blue-600">Warehouse</p>
            <p className="text-2xl font-bold text-blue-700">
              {summary.warehouse}
            </p>
          </div>
          <div className="card border-green-200 bg-green-50">
            <p className="text-sm text-green-600">Site</p>
            <p className="text-2xl font-bold text-green-700">{summary.site}</p>
          </div>
          <div className="card border-orange-200 bg-orange-50">
            <p className="text-sm text-orange-600">Total Shifts</p>
            <p className="text-2xl font-bold text-orange-700">
              {summary.totalShifts.toFixed(1)}
            </p>
          </div>
          <div className="card border-purple-200 bg-purple-50">
            <p className="text-sm text-purple-600">Total Wages</p>
            <p className="text-xl font-bold text-purple-700">
              ₹{summary.totalWages.toLocaleString()}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Unique Labourers</p>
            <p className="text-2xl font-bold">{summary.uniqueLabourers}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Location Filter
              </label>
              <div className="flex gap-2">
                {["ALL", "WAREHOUSE", "SITE"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setLocationFilter(type)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${locationFilter === type
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

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

        {/* Attendance Table */}
        <div className="card">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-gray-600">Loading attendance records...</p>
            </div>
          ) : attendanceRecords.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👷</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Attendance Records
              </h3>
              <p className="text-gray-600 mb-4">
                {locationFilter !== "ALL" ||
                  dateRange.startDate ||
                  dateRange.endDate
                  ? "No attendance records match your filters."
                  : "No attendance has been marked yet."}
              </p>
              <Link href="/dashboard/labour/new" className="btn btn-primary">
                Mark Attendance
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Labour Name</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Location Type</th>
                    <th className="table-header">Site/Warehouse</th>
                    <th className="table-header">Shifts Worked</th>
                    <th className="table-header">Wage/Shift</th>
                    <th className="table-header">Total Wage</th>
                    <th className="table-header">Notes</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {attendanceRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="table-cell font-medium">
                        {record.labourName}
                      </td>
                      <td className="table-cell">
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td className="table-cell">
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-medium ${record.locationType === "WAREHOUSE"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                            }`}
                        >
                          {record.locationType}
                        </span>
                      </td>
                      <td className="table-cell text-sm">
                        {record.locationType === "SITE"
                          ? record.site?.name || "—"
                          : "Main Warehouse"}
                      </td>
                      <td className="table-cell">
                        <span className="font-semibold text-lg text-orange-600">
                          {parseFloat(record.shiftsWorked).toFixed(1)}
                        </span>
                      </td>
                      <td className="table-cell text-sm">
                        {record.wagePerShift
                          ? `₹${parseFloat(record.wagePerShift).toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="table-cell text-sm font-medium">
                        {record.totalWage
                          ? `₹${parseFloat(record.totalWage).toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="table-cell text-xs text-gray-600 max-w-xs truncate">
                        {record.notes || "—"}
                      </td>
                      <td className="table-cell">
                        <Link
                          href={`/dashboard/labour/${record.id}`}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
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
