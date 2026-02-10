import { useState } from "react";
import { useRouter } from "next/navigation";

type Truck = {
    truckPlate?: string;
    driverName?: string;
    driverPhone?: string;
    transporterName?: string;
    lrBiltyNo?: string;
    contactPersonName?: string;
    contactPersonNumber?: string;
    dispatchFrom?: string;
    dispatchTo?: string;
    amount?: number;
    items: Array<{
        itemId: string;
        quantity: number;
    }>;
};

export function useBulkChallanCreation() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleCreateChallans = async (
        selectedProjectId: string,
        siteId: string | null,
        expectedReturnDate: string,
        remarks: string,
        trucks: Truck[]
    ) => {
        if (!selectedProjectId) {
            return { success: false, error: "Please select a project" };
        }

        if (trucks.length === 0) {
            return { success: false, error: "No trucks to create challans for" };
        }

        setLoading(true);
        try {
            const res = await fetch("/api/challans/bulk-create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId: selectedProjectId,
                    siteId: siteId || null,
                    challanType: siteId ? "TRANSFER" : "DELIVERY",
                    expectedReturnDate: expectedReturnDate || null,
                    remarks,
                    trucks: trucks.map((t) => ({
                        truckNumber: t.truckPlate,
                        driverName: t.driverName,
                        driverPhone: t.driverPhone,
                        transporterName: t.transporterName,
                        lrBiltyNo: t.lrBiltyNo,
                        contactPersonName: t.contactPersonName,
                        contactPersonNumber: t.contactPersonNumber,
                        dispatchFrom: t.dispatchFrom,
                        dispatchTo: t.dispatchTo,
                        amount: t.amount,
                        items: t.items.map((item) => ({
                            itemId: item.itemId,
                            quantity: item.quantity,
                        })),
                    })),
                }),
            });

            if (res.ok) {
                const data = await res.json();
                router.push("/dashboard/challans");
                return { success: true, message: data.message };
            } else {
                const errorData = await res.json();
                return { success: false, error: errorData.error || "Failed to create challans" };
            }
        } catch (err) {
            console.error("Error creating challans:", err);
            return { success: false, error: "An error occurred while creating challans" };
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        handleCreateChallans,
    };
}
