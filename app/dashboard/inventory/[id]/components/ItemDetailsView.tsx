type ItemData = {
    id: string;
    name: string;
    description?: string | null;
    quantityAvailable: number;
    condition: string;
    cost?: number | null;
    vendor?: string | null;
    currentLocation?: string | null;
    remarks?: string | null;
    category: { id: string; name: string };
    subcategory?: { id: string; name: string } | null;
};

type ItemDetailsViewProps = {
    item: ItemData;
};

export default function ItemDetailsView({ item }: ItemDetailsViewProps) {
    const getConditionColor = (condition: string) => {
        switch (condition) {
            case "GOOD":
                return "bg-green-100 text-green-800";
            case "REPAIR_NEEDED":
                return "bg-yellow-100 text-yellow-800";
            case "DAMAGED":
                return "bg-red-100 text-red-800";
            case "SCRAP":
                return "bg-gray-100 text-gray-800";
            default:
                return "bg-blue-100 text-blue-800";
        }
    };

    return (
        <>
            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="text-sm font-medium text-gray-600">Item Name</label>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{item.name}</p>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-600">Category</label>
                    <p className="text-lg text-gray-900 mt-1">{item.category.name}</p>
                </div>
                {item.subcategory && (
                    <div>
                        <label className="text-sm font-medium text-gray-600">Subcategory</label>
                        <p className="text-lg text-gray-900 mt-1">{item.subcategory.name}</p>
                    </div>
                )}
                <div>
                    <label className="text-sm font-medium text-gray-600">Quantity Available</label>
                    <p className="text-2xl font-bold text-green-700 mt-1">
                        {item.quantityAvailable}
                    </p>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-600">Condition</label>
                    <p className="mt-1">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConditionColor(item.condition)}`}>
                            {item.condition.replace("_", " ")}
                        </span>
                    </p>
                </div>
                {item.cost && (
                    <div>
                        <label className="text-sm font-medium text-gray-600">Cost per Unit</label>
                        <p className="text-lg font-semibold text-gray-900 mt-1">
                            ₹{parseFloat(item.cost.toString()).toFixed(2)}
                        </p>
                    </div>
                )}
                {item.vendor && (
                    <div>
                        <label className="text-sm font-medium text-gray-600">Vendor</label>
                        <p className="text-lg text-gray-900 mt-1">{item.vendor}</p>
                    </div>
                )}
                {item.currentLocation && (
                    <div>
                        <label className="text-sm font-medium text-gray-600">Current Location</label>
                        <p className="text-lg text-gray-900 mt-1">{item.currentLocation}</p>
                    </div>
                )}
            </div>

            {item.description && (
                <div className="mt-6 pt-6 border-t">
                    <label className="text-sm font-medium text-gray-600">Description</label>
                    <p className="text-gray-900 mt-2">{item.description}</p>
                </div>
            )}

            {item.remarks && (
                <div className="mt-6 pt-6 border-t">
                    <label className="text-sm font-medium text-gray-600">Remarks</label>
                    <p className="text-gray-900 mt-2">{item.remarks}</p>
                </div>
            )}
        </>
    );
}
