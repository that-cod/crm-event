// Types for drag-and-drop challan generation

export type SiteItem = {
    itemId: string;
    itemName: string;
    categoryId: string;
    categoryName: string;
    quantity: number;
    weightPerUnit: number | null;
    totalWeight: number;
    hsnCode: string | null;
};

export type TruckItem = {
    itemId: string;
    itemName: string;
    categoryName: string;
    quantity: number;
    weightPerUnit: number | null;
    totalWeight: number;
};

export type Truck = {
    id: string; // Unique ID for drag-drop
    number: number; // Display number
    capacity: number; // kg
    items: TruckItem[];
    totalWeight: number;
    truckNumber?: string; // License plate
    driverName?: string;
    driverPhone?: string;
};

export type ChallanFormData = {
    projectId: string;
    siteId: string | null;
    trucks: {
        capacity: number;
        items: {
            itemId: string;
            quantity: number;
        }[];
    }[];
};

export type PendingDrop = {
    item: SiteItem;
    truckId: string;
};
