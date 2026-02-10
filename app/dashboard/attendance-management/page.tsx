"use client";

import Header from "@/components/Header";
import Link from "next/link";

export default function AttendanceManagementPage() {
    return (
        <div>
            <Header
                title="Labour Attendance Management"
                subtitle="Comprehensive shift-based attendance tracking with payroll calculations"
            />

            <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    {/* Upload CSV Card */}
                    <Link href="/dashboard/attendance-management/upload">
                        <div className="card hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-primary-500">
                            <div className="text-center">
                                <div className="text-6xl mb-4">📤</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">
                                    Upload CSV & Create Sheets
                                </h3>
                                <p className="text-gray-600 text-sm mb-4">
                                    Import labour data from CSV and create monthly attendance sheets
                                </p>
                                <div className="text-primary-600 font-medium">
                                    Get Started →
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* View Existing Sheets Card */}
                    <div className="card border-2 border-gray-200">
                        <div className="text-center">
                            <div className="text-6xl mb-4">📊</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                View Attendance Sheets
                            </h3>
                            <p className="text-gray-600 text-sm mb-4">
                                Access existing attendance sheets by selecting site and month
                            </p>
                            <p className="text-sm text-gray-500">
                                Use the upload page to select a site and period
                            </p>
                        </div>
                    </div>
                </div>

                {/* Features Section */}
                <div className="mt-12 max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                        Features
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="card text-center">
                            <div className="text-4xl mb-3">⏱️</div>
                            <h4 className="font-semibold text-gray-900 mb-2">
                                Shift-Based Tracking
                            </h4>
                            <p className="text-sm text-gray-600">
                                Track 0, 0.5, 1, 1.5, 2 shifts per day with dropdown selection
                            </p>
                        </div>

                        <div className="card text-center">
                            <div className="text-4xl mb-3">💰</div>
                            <h4 className="font-semibold text-gray-900 mb-2">
                                Auto Calculations
                            </h4>
                            <p className="text-sm text-gray-600">
                                Real-time wage, incentive, and balance calculations
                            </p>
                        </div>

                        <div className="card text-center">
                            <div className="text-4xl mb-3">📈</div>
                            <h4 className="font-semibold text-gray-900 mb-2">
                                Opening Balance
                            </h4>
                            <p className="text-sm text-gray-600">
                                Automatically fetches previous month's balance due
                            </p>
                        </div>

                        <div className="card text-center">
                            <div className="text-4xl mb-3">💳</div>
                            <h4 className="font-semibold text-gray-900 mb-2">
                                Transaction Tracking
                            </h4>
                            <p className="text-sm text-gray-600">
                                Manage multiple advances and payments per labour
                            </p>
                        </div>

                        <div className="card text-center">
                            <div className="text-4xl mb-3">🏗️</div>
                            <h4 className="font-semibold text-gray-900 mb-2">
                                Site-Specific
                            </h4>
                            <p className="text-sm text-gray-600">
                                Separate labour management for each site/event
                            </p>
                        </div>

                        <div className="card text-center">
                            <div className="text-4xl mb-3">🖨️</div>
                            <h4 className="font-semibold text-gray-900 mb-2">
                                PDF Reports
                            </h4>
                            <p className="text-sm text-gray-600">
                                Generate printable payroll reports with summary
                            </p>
                        </div>
                    </div>
                </div>

                {/* Instructions */}
                <div className="mt-12 max-w-4xl mx-auto card bg-blue-50 border-blue-200">
                    <h3 className="text-lg font-bold text-blue-900 mb-4">
                        📋 How to Use
                    </h3>
                    <ol className="space-y-2 text-sm text-blue-800">
                        <li className="flex items-start">
                            <span className="font-bold mr-2">1.</span>
                            <span>
                                Prepare your CSV file with columns: S.N., Employee Name, 1-31 (for days), and RATE
                            </span>
                        </li>
                        <li className="flex items-start">
                            <span className="font-bold mr-2">2.</span>
                            <span>
                                Click "Upload CSV & Create Sheets" and select your site, month, and year
                            </span>
                        </li>
                        <li className="flex items-start">
                            <span className="font-bold mr-2">3.</span>
                            <span>
                                Upload the CSV file - the system will create/update labour records
                            </span>
                        </li>
                        <li className="flex items-start">
                            <span className="font-bold mr-2">4.</span>
                            <span>
                                Mark daily shifts using the dropdown (0, 0.5, 1, 1.5, 2) in the attendance grid
                            </span>
                        </li>
                        <li className="flex items-start">
                            <span className="font-bold mr-2">5.</span>
                            <span>
                                Add incentives, advances, and payments as needed - calculations update in real-time
                            </span>
                        </li>
                        <li className="flex items-start">
                            <span className="font-bold mr-2">6.</span>
                            <span>
                                Print or export to PDF for payroll processing
                            </span>
                        </li>
                    </ol>
                </div>
            </div>
        </div>
    );
}
