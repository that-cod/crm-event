import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/hooks/useToast";

type ItemData = {
    id: string;
    name: string;
    description?: string | null;
    categoryId: string;
    subcategoryId?: string | null;
    quantityAvailable: number;
    condition: string;
    cost?: number | null;
    vendor?: string | null;
    remarks?: string | null;
    imageUrl1?: string | null;
    imageUrl2?: string | null;
    imageUrl3?: string | null;
    currentLocation?: string | null;
    category: { id: string; name: string };
    subcategory?: { id: string; name: string } | null;
};

type FormData = {
    name: string;
    description: string;
    categoryId: string;
    subcategoryId: string;
    quantityAvailable: string;
    condition: string;
    cost: string;
    vendor: string;
    remarks: string;
    imageUrl1: string;
    imageUrl2: string;
    imageUrl3: string;
    currentLocation: string;
};

export function useItemForm(initialItem: ItemData) {
    const router = useRouter();
    const { success, error } = useToast();

    const [item, setItem] = useState<ItemData>(initialItem);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState<FormData>({
        name: item.name,
        description: item.description || "",
        categoryId: item.categoryId,
        subcategoryId: item.subcategoryId || "",
        quantityAvailable: item.quantityAvailable.toString(),
        condition: item.condition,
        cost: item.cost?.toString() || "",
        vendor: item.vendor || "",
        remarks: item.remarks || "",
        imageUrl1: item.imageUrl1 || "",
        imageUrl2: item.imageUrl2 || "",
        imageUrl3: item.imageUrl3 || "",
        currentLocation: item.currentLocation || "",
    });

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/inventory/items/${item.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                const updatedItem = await res.json();
                setItem(updatedItem);
                setIsEditing(false);
                success("Item updated successfully!");
                router.refresh();
            } else {
                const errorData = await res.json();
                error(errorData.error || "Failed to update item");
            }
        } catch (err) {
            console.error("Error updating item:", err);
            error("An error occurred while updating item");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            name: item.name,
            description: item.description || "",
            categoryId: item.categoryId,
            subcategoryId: item.subcategoryId || "",
            quantityAvailable: item.quantityAvailable.toString(),
            condition: item.condition,
            cost: item.cost?.toString() || "",
            vendor: item.vendor || "",
            remarks: item.remarks || "",
            imageUrl1: item.imageUrl1 || "",
            imageUrl2: item.imageUrl2 || "",
            imageUrl3: item.imageUrl3 || "",
            currentLocation: item.currentLocation || "",
        });
        setIsEditing(false);
    };

    return {
        item,
        isEditing,
        setIsEditing,
        loading,
        formData,
        setFormData,
        handleSave,
        handleCancel,
    };
}
