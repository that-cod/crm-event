"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import ImageUpload from "@/components/ImageUpload";
import { useToast } from "@/lib/hooks/useToast";

interface Category {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
}

export default function NewItemPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    categoryId: "",
    subcategoryId: "",
    name: "",
    description: "",
    quantityAvailable: "0",
    condition: "GOOD",
    cost: "",
    vendor: "",
    remarks: "",
    imageUrl1: "",
    imageUrl2: "",
    imageUrl3: "",
    currentLocation: "",
  });

  useEffect(() => {
    fetch("/api/inventory/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data));
  }, []);

  const selectedCategory = categories.find(
    (c) => c.id === formData.categoryId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        success("Item created successfully!");
        router.push("/dashboard/inventory");
        router.refresh();
      } else {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        error(errorData.error || "Failed to create item");
      }
    } catch (err) {
      console.error("Error creating item:", err);
      error("An error occurred while creating item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header title="Add New Item" subtitle="Create a new inventory item" />

      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="card space-y-6">
            {/* Category */}
            <div>
              <label className="label">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                required
                className="input"
                value={formData.categoryId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    categoryId: e.target.value,
                    subcategoryId: "",
                  })
                }
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subcategory */}
            {selectedCategory && selectedCategory.subcategories.length > 0 && (
              <div>
                <label className="label">Subcategory</label>
                <select
                  className="input"
                  value={formData.subcategoryId}
                  onChange={(e) =>
                    setFormData({ ...formData, subcategoryId: e.target.value })
                  }
                >
                  <option value="">None</option>
                  {selectedCategory.subcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Item Name */}
            <div>
              <label className="label">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="input"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Deluxe Tent - 4 Person"
              />
            </div>

            {/* Description */}
            <div>
              <label className="label">Description</label>
              <textarea
                className="input"
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Detailed description of the item"
              />
            </div>

            {/* Quantity */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Initial Quantity</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={formData.quantityAvailable}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantityAvailable: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="label">Condition</label>
                <select
                  className="input"
                  value={formData.condition}
                  onChange={(e) =>
                    setFormData({ ...formData, condition: e.target.value })
                  }
                >
                  <option value="GOOD">Good</option>
                  <option value="REPAIR_NEEDED">Repair Needed</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="REPLACED">Replaced</option>
                </select>
              </div>
            </div>

            {/* Cost and Vendor */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Cost per Unit</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input"
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData({ ...formData, cost: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="label">Vendor</label>
                <input
                  type="text"
                  className="input"
                  value={formData.vendor}
                  onChange={(e) =>
                    setFormData({ ...formData, vendor: e.target.value })
                  }
                  placeholder="Vendor name"
                />
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="label">Remarks</label>
              <textarea
                className="input"
                rows={2}
                value={formData.remarks}
                onChange={(e) =>
                  setFormData({ ...formData, remarks: e.target.value })
                }
                placeholder="Any additional notes"
              />
            </div>

            {/* Image Uploads */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Item Images (Up to 3)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ImageUpload
                  currentImageUrl={formData.imageUrl1}
                  onImageUploaded={(url) =>
                    setFormData({ ...formData, imageUrl1: url })
                  }
                  label="Image 1 (Primary)"
                />
                <ImageUpload
                  currentImageUrl={formData.imageUrl2}
                  onImageUploaded={(url) =>
                    setFormData({ ...formData, imageUrl2: url })
                  }
                  label="Image 2"
                />
                <ImageUpload
                  currentImageUrl={formData.imageUrl3}
                  onImageUploaded={(url) =>
                    setFormData({ ...formData, imageUrl3: url })
                  }
                  label="Image 3"
                />
              </div>
              <p className="text-xs text-gray-500 mt-3">
                💡 Tip: Add clear images showing the item from different angles.
                The first image will be used as the primary image in lists and
                challans.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Item"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
