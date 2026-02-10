"use client";

import Link from "next/link";
import Header from "@/components/Header";
import { useItemForm } from "./hooks/useItemForm";
import { useCategories } from "./hooks/useCategories";
import ItemImages from "./components/ItemImages";
import ItemDetailForm from "./components/ItemDetailForm";
import ItemDetailsView from "./components/ItemDetailsView";
import QuickActions from "./components/QuickActions";

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

export default function ItemDetailClient({ initialItem }: { initialItem: ItemData }) {
    const {
        item,
        isEditing,
        setIsEditing,
        loading,
        formData,
        setFormData,
        handleSave,
        handleCancel,
    } = useItemForm(initialItem);

    const { categories } = useCategories(isEditing);

    const images = [item.imageUrl1, item.imageUrl2, item.imageUrl3].filter(Boolean) as string[];

    const handleFormChange = (updates: Partial<typeof formData>) => {
        setFormData({ ...formData, ...updates });
    };

    const handleImageUpdate = (field: "imageUrl1" | "imageUrl2" | "imageUrl3", url: string) => {
        setFormData({ ...formData, [field]: url });
    };

    return (
        <div>
            <Header
                title={item.name}
                subtitle={`${item.category.name}${item.subcategory ? ` / ${item.subcategory.name}` : ""}`}
                action={
                    <div className="flex gap-3">
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="btn btn-primary"
                            >
                                ✏️ Edit Item
                            </button>
                        )}
                        <Link href="/dashboard/inventory" className="btn btn-secondary">
                            ← Back to Inventory
                        </Link>
                    </div>
                }
            />

            <div className="p-8">
                <div className="max-w-5xl mx-auto space-y-6">
                    {/* Save/Cancel Buttons (shown when editing) */}
                    {isEditing && (
                        <div className="card bg-blue-50 border-blue-200">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="font-semibold text-blue-900">Edit Mode</h3>
                                    <p className="text-sm text-blue-700">
                                        Make your changes and click Save to update the item
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleSave}
                                        disabled={loading}
                                        className="btn btn-primary disabled:opacity-50"
                                    >
                                        {loading ? "Saving..." : "💾 Save Changes"}
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        className="btn btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Images Gallery */}
                    <ItemImages
                        isEditing={isEditing}
                        images={images}
                        itemName={item.name}
                        formData={{
                            imageUrl1: formData.imageUrl1,
                            imageUrl2: formData.imageUrl2,
                            imageUrl3: formData.imageUrl3,
                        }}
                        onImageUpdate={handleImageUpdate}
                    />

                    {/* Item Information */}
                    <div className="card">
                        <h2 className="text-lg font-semibold mb-4">Item Details</h2>

                        {isEditing ? (
                            <ItemDetailForm
                                formData={formData}
                                categories={categories}
                                onFormChange={handleFormChange}
                            />
                        ) : (
                            <ItemDetailsView item={item} />
                        )}
                    </div>

                    {/* Actions (only show when not editing) */}
                    {!isEditing && <QuickActions itemId={item.id} />}
                </div>
            </div>
        </div>
    );
}
