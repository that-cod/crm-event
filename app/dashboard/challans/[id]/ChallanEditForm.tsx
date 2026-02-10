"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

interface ChallanEditFormProps {
    challanId: string;
    initialData: {
        truckNumber: string | null;
        driverName: string | null;
        driverPhone: string | null;
        transporterName: string | null;
        lrBiltyNo: string | null;
        contactPersonName: string | null;
        contactPersonNumber: string | null;
        dispatchFrom: string | null;
        dispatchTo: string | null;
        amount: number | null;
        expectedReturnDate: Date | null;
        remarks: string | null;
        status: string;
    };
    isDraft: boolean;
}

export default function ChallanEditForm({ challanId, initialData, isDraft }: ChallanEditFormProps) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        truckNumber: initialData.truckNumber || "",
        driverName: initialData.driverName || "",
        driverPhone: initialData.driverPhone || "",
        transporterName: initialData.transporterName || "",
        lrBiltyNo: initialData.lrBiltyNo || "",
        contactPersonName: initialData.contactPersonName || "",
        contactPersonNumber: initialData.contactPersonNumber || "",
        dispatchFrom: initialData.dispatchFrom || "",
        dispatchTo: initialData.dispatchTo || "",
        amount: initialData.amount?.toString() || "",
        expectedReturnDate: initialData.expectedReturnDate
            ? new Date(initialData.expectedReturnDate).toISOString().split("T")[0]
            : "",
        remarks: initialData.remarks || "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch(`/api/challans/${challanId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    truckNumber: formData.truckNumber || null,
                    driverName: formData.driverName || null,
                    driverPhone: formData.driverPhone || null,
                    transporterName: formData.transporterName || null,
                    lrBiltyNo: formData.lrBiltyNo || null,
                    contactPersonName: formData.contactPersonName || null,
                    contactPersonNumber: formData.contactPersonNumber || null,
                    dispatchFrom: formData.dispatchFrom || null,
                    dispatchTo: formData.dispatchTo || null,
                    amount: formData.amount ? parseFloat(formData.amount) : null,
                    expectedReturnDate: formData.expectedReturnDate || null,
                    remarks: formData.remarks || null,
                    status: isDraft ? "SENT" : undefined, // Mark as SENT if it was DRAFT
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to update challan");
            }

            toast.success("Challan updated successfully");
            setIsEditing(false);
            router.refresh();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Failed to update challan";
            toast.error(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        // Reset to initial data
        setFormData({
            truckNumber: initialData.truckNumber || "",
            driverName: initialData.driverName || "",
            driverPhone: initialData.driverPhone || "",
            transporterName: initialData.transporterName || "",
            lrBiltyNo: initialData.lrBiltyNo || "",
            contactPersonName: initialData.contactPersonName || "",
            contactPersonNumber: initialData.contactPersonNumber || "",
            dispatchFrom: initialData.dispatchFrom || "",
            dispatchTo: initialData.dispatchTo || "",
            amount: initialData.amount?.toString() || "",
            expectedReturnDate: initialData.expectedReturnDate
                ? new Date(initialData.expectedReturnDate).toISOString().split("T")[0]
                : "",
            remarks: initialData.remarks || "",
        });
        setIsEditing(false);
    };

    if (!isEditing) {
        return (
            <div className="card">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">📝 Challan Details</h2>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="btn btn-primary btn-sm"
                    >
                        ✏️ Edit Details
                    </button>
                </div>

                {isDraft && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                        ⚠️ <strong>Draft Status:</strong> This challan is in draft mode. Add truck and shipping details, then save to mark as SENT.
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-600">Truck Number</label>
                        <p className="text-lg text-gray-900 mt-1">{formData.truckNumber || "—"}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600">Driver Name</label>
                        <p className="text-lg text-gray-900 mt-1">{formData.driverName || "—"}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600">Driver Phone</label>
                        <p className="text-lg text-gray-900 mt-1">{formData.driverPhone || "—"}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600">Transporter Name</label>
                        <p className="text-lg text-gray-900 mt-1">{formData.transporterName || "—"}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600">LR/Bilty Number</label>
                        <p className="text-lg text-gray-900 mt-1">{formData.lrBiltyNo || "—"}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600">Contact Person</label>
                        <p className="text-lg text-gray-900 mt-1">{formData.contactPersonName || "—"}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600">Contact Number</label>
                        <p className="text-lg text-gray-900 mt-1">{formData.contactPersonNumber || "—"}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600">Amount</label>
                        <p className="text-lg text-gray-900 mt-1">
                            {formData.amount ? `₹${parseFloat(formData.amount).toLocaleString()}` : "—"}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600">Dispatch From</label>
                        <p className="text-lg text-gray-900 mt-1">{formData.dispatchFrom || "—"}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600">Dispatch To</label>
                        <p className="text-lg text-gray-900 mt-1">{formData.dispatchTo || "—"}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600">Expected Return Date</label>
                        <p className="text-lg text-gray-900 mt-1">
                            {formData.expectedReturnDate
                                ? new Date(formData.expectedReturnDate).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })
                                : "—"}
                        </p>
                    </div>
                </div>

                {formData.remarks && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                        <label className="text-sm font-medium text-blue-900">Remarks</label>
                        <p className="text-gray-800 mt-1">{formData.remarks}</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="card">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">✏️ Edit Challan Details</h2>
                <div className="flex gap-2">
                    <button
                        onClick={handleCancel}
                        className="btn btn-secondary btn-sm"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="btn btn-primary btn-sm"
                        disabled={isSaving}
                    >
                        {isSaving ? "Saving..." : isDraft ? "Save & Mark as Sent" : "Save Changes"}
                    </button>
                </div>
            </div>

            {isDraft && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                    ⚠️ <strong>Draft Mode:</strong> Saving will mark this challan as SENT. Make sure all details are correct before saving.
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="truckNumber" className="label">
                        Truck Number
                    </label>
                    <input
                        type="text"
                        id="truckNumber"
                        name="truckNumber"
                        value={formData.truckNumber}
                        onChange={handleChange}
                        className="input"
                        placeholder="e.g., MH12AB1234"
                    />
                </div>

                <div>
                    <label htmlFor="driverName" className="label">
                        Driver Name
                    </label>
                    <input
                        type="text"
                        id="driverName"
                        name="driverName"
                        value={formData.driverName}
                        onChange={handleChange}
                        className="input"
                        placeholder="Driver's full name"
                    />
                </div>

                <div>
                    <label htmlFor="driverPhone" className="label">
                        Driver Phone
                    </label>
                    <input
                        type="tel"
                        id="driverPhone"
                        name="driverPhone"
                        value={formData.driverPhone}
                        onChange={handleChange}
                        className="input"
                        placeholder="10-digit mobile number"
                    />
                </div>

                <div>
                    <label htmlFor="transporterName" className="label">
                        Transporter Name
                    </label>
                    <input
                        type="text"
                        id="transporterName"
                        name="transporterName"
                        value={formData.transporterName}
                        onChange={handleChange}
                        className="input"
                        placeholder="Transport company name"
                    />
                </div>

                <div>
                    <label htmlFor="lrBiltyNo" className="label">
                        LR/Bilty Number
                    </label>
                    <input
                        type="text"
                        id="lrBiltyNo"
                        name="lrBiltyNo"
                        value={formData.lrBiltyNo}
                        onChange={handleChange}
                        className="input"
                        placeholder="LR or Bilty number"
                    />
                </div>

                <div>
                    <label htmlFor="contactPersonName" className="label">
                        Contact Person Name
                    </label>
                    <input
                        type="text"
                        id="contactPersonName"
                        name="contactPersonName"
                        value={formData.contactPersonName}
                        onChange={handleChange}
                        className="input"
                        placeholder="Site contact person"
                    />
                </div>

                <div>
                    <label htmlFor="contactPersonNumber" className="label">
                        Contact Person Number
                    </label>
                    <input
                        type="tel"
                        id="contactPersonNumber"
                        name="contactPersonNumber"
                        value={formData.contactPersonNumber}
                        onChange={handleChange}
                        className="input"
                        placeholder="Contact number"
                    />
                </div>

                <div>
                    <label htmlFor="amount" className="label">
                        Amount (₹)
                    </label>
                    <input
                        type="number"
                        id="amount"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        className="input"
                        placeholder="Transportation amount"
                        step="0.01"
                    />
                </div>

                <div>
                    <label htmlFor="dispatchFrom" className="label">
                        Dispatch From
                    </label>
                    <input
                        type="text"
                        id="dispatchFrom"
                        name="dispatchFrom"
                        value={formData.dispatchFrom}
                        onChange={handleChange}
                        className="input"
                        placeholder="Origin location"
                    />
                </div>

                <div>
                    <label htmlFor="dispatchTo" className="label">
                        Dispatch To
                    </label>
                    <input
                        type="text"
                        id="dispatchTo"
                        name="dispatchTo"
                        value={formData.dispatchTo}
                        onChange={handleChange}
                        className="input"
                        placeholder="Destination location"
                    />
                </div>

                <div>
                    <label htmlFor="expectedReturnDate" className="label">
                        Expected Return Date
                    </label>
                    <input
                        type="date"
                        id="expectedReturnDate"
                        name="expectedReturnDate"
                        value={formData.expectedReturnDate}
                        onChange={handleChange}
                        className="input"
                    />
                </div>
            </div>

            <div className="mt-6">
                <label htmlFor="remarks" className="label">
                    Remarks
                </label>
                <textarea
                    id="remarks"
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleChange}
                    className="input"
                    rows={4}
                    placeholder="Additional notes or instructions..."
                />
            </div>
        </div>
    );
}
