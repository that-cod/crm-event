import { useState, useEffect } from "react";

type Category = {
    id: string;
    name: string;
    subcategories: { id: string; name: string }[];
};

export function useCategories(isEditing: boolean) {
    const [categories, setCategories] = useState<Category[]>([]);

    useEffect(() => {
        if (isEditing) {
            fetchCategories();
        }
    }, [isEditing]);

    const fetchCategories = async () => {
        try {
            const res = await fetch("/api/inventory/categories");
            const data = await res.json();
            setCategories(data);
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    };

    return { categories };
}
