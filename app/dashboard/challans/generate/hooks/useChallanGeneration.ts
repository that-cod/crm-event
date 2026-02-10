import { useState, useEffect } from "react";

type Site = {
    id: string;
    name: string;
    location: string;
};

type Project = {
    id: string;
    name: string;
    location: string;
};

type TruckItem = {
    itemId: string;
    itemName: string;
    categoryName: string;
    loadingOrder: number;
    quantity: number;
    weightPerUnit: number | null;
    totalWeight: number;
    hsnCode: string | null;
};

type Truck = {
    truckNumber: number;
    items: TruckItem[];
    totalWeight: number;
    remainingCapacity: number;
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
};

type Preview = {
    trucks: Truck[];
    summary: {
        totalTrucks: number;
        totalItems: number;
        totalWeight: number;
        truckCapacityKg: number;
        categorySequence: string[];
    };
};

export function useChallanGeneration(
    siteId: string | null,
    truckCapacityKg: number,
    companySettings: Record<string, unknown> | null,
    site: Site | null
) {
    const [generating, setGenerating] = useState(false);
    const [preview, setPreview] = useState<Preview | null>(null);
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const res = await fetch("/api/projects");
            if (res.ok) {
                const data = await res.json();
                setProjects(data);
            }
        } catch (error) {
            console.error("Error loading projects:", error);
        }
    };

    const handleGeneratePreview = async (projectIdParam?: string) => {
        if (!siteId && !projectIdParam) {
            throw new Error("Please provide a site or project ID");
        }

        setGenerating(true);
        try {
            const res = await fetch("/api/challans/generate-preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    siteId,
                    projectId: projectIdParam,
                    truckCapacityKg,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setPreview(data.preview);

                // Set trucks with editable fields
                setTrucks(
                    data.preview.trucks.map((t: Truck) => ({
                        ...t,
                        truckPlate: "",
                        driverName: "",
                        driverPhone: "",
                        transporterName: "",
                        lrBiltyNo: "",
                        contactPersonName: "",
                        contactPersonNumber: "",
                        dispatchFrom: companySettings?.godownAddress as string || "",
                        dispatchTo: site?.location || "",
                        amount: 0,
                    }))
                );
                return { success: true };
            } else {
                const errorData = await res.json();
                return { success: false, error: errorData.error || "Failed to generate preview" };
            }
        } catch (err) {
            console.error("Error generating preview:", err);
            return { success: false, error: "An error occurred while generating preview" };
        } finally {
            setGenerating(false);
        }
    };

    return {
        generating,
        preview,
        trucks,
        setTrucks,
        projects,
        handleGeneratePreview,
    };
}
