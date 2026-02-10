type Category = {
    id: string;
    name: string;
    subcategories: { id: string; name: string }[];
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
    currentLocation: string;
    remarks: string;
};

type ItemDetailFormProps = {
    formData: FormData;
    categories: Category[];
    onFormChange: (updates: Partial<FormData>) => void;
};

export default function ItemDetailForm({
    formData,
    categories,
    onFormChange,
}: ItemDetailFormProps) {
    const selectedCategory = categories.find((c) => c.id === formData.categoryId);

    return (
        <div className="space-y-6">
            {/* Name */}
            <div>
                <label className="label">
                    Item Name <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => onFormChange({ name: e.target.value })}
                    className="input"
                    required
                />
            </div>

            {/* Category & Subcategory */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label">
                        Category <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={formData.categoryId}
                        onChange={(e) =>
                            onFormChange({
                                categoryId: e.target.value,
                                subcategoryId: "",
                            })
                        }
                        className="input"
                        required
                    >
                        <option value="">Select Category</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedCategory && selectedCategory.subcategories.length > 0 && (
                    <div>
                        <label className="label">Subcategory</label>
                        <select
                            value={formData.subcategoryId}
                            onChange={(e) => onFormChange({ subcategoryId: e.target.value })}
                            className="input"
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
            </div>

            {/* Quantity & Condition */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label">Quantity Available</label>
                    <input
                        type="number"
                        min="0"
                        value={formData.quantityAvailable}
                        onChange={(e) => onFormChange({ quantityAvailable: e.target.value })}
                        className="input"
                    />
                </div>

                <div>
                    <label className="label">Condition</label>
                    <select
                        value={formData.condition}
                        onChange={(e) => onFormChange({ condition: e.target.value })}
                        className="input"
                    >
                        <option value="GOOD">Good</option>
                        <option value="REPAIR_NEEDED">Repair Needed</option>
                        <option value="DAMAGED">Damaged</option>
                        <option value="REPLACED">Replaced</option>
                    </select>
                </div>
            </div>

            {/* Cost & Vendor */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label">Cost per Unit</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.cost}
                        onChange={(e) => onFormChange({ cost: e.target.value })}
                        className="input"
                        placeholder="0.00"
                    />
                </div>

                <div>
                    <label className="label">Vendor</label>
                    <input
                        type="text"
                        value={formData.vendor}
                        onChange={(e) => onFormChange({ vendor: e.target.value })}
                        className="input"
                        placeholder="Vendor name"
                    />
                </div>
            </div>

            {/* Current Location */}
            <div>
                <label className="label">Current Location</label>
                <input
                    type="text"
                    value={formData.currentLocation}
                    onChange={(e) => onFormChange({ currentLocation: e.target.value })}
                    className="input"
                    placeholder="Warehouse, Site, etc."
                />
            </div>

            {/* Description */}
            <div>
                <label className="label">Description</label>
                <textarea
                    value={formData.description}
                    onChange={(e) => onFormChange({ description: e.target.value })}
                    className="input"
                    rows={3}
                    placeholder="Detailed description of the item"
                />
            </div>

            {/* Remarks */}
            <div>
                <label className="label">Remarks</label>
                <textarea
                    value={formData.remarks}
                    onChange={(e) => onFormChange({ remarks: e.target.value })}
                    className="input"
                    rows={2}
                    placeholder="Any additional notes"
                />
            </div>
        </div>
    );
}
