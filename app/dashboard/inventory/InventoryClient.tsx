'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

type Item = {
    id: string;
    name: string;
    quantityAvailable: number;
    condition: string;
    vendor: string | null;
    imageUrl1: string | null;
    category: {
        id: string;
        name: string;
    };
    subcategory: {
        id: string;
        name: string;
    } | null;
};

type Category = {
    id: string;
    name: string;
};

type QuantityThreshold = 'low' | 'medium' | 'high' | null;

export default function InventoryClient({
    items,
    categories,
    canManage,
}: {
    items: Item[];
    categories: Category[];
    canManage: boolean;
}) {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [showFilterPanel, setShowFilterPanel] = useState(false);

    // Advanced filter states
    const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
    const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
    const [selectedQuantityThreshold, setSelectedQuantityThreshold] = useState<QuantityThreshold>(null);

    // Get unique vendors from items
    const uniqueVendors = useMemo(() => {
        const vendors = items
            .map(item => item.vendor)
            .filter((vendor): vendor is string => vendor !== null && vendor !== '');
        return Array.from(new Set(vendors)).sort();
    }, [items]);

    // Count active filters
    const activeFilterCount = [
        selectedVendor,
        selectedConditions.length > 0 ? 'condition' : null,
        selectedQuantityThreshold
    ].filter(Boolean).length;

    // Toggle condition filter
    const toggleCondition = (condition: string) => {
        setSelectedConditions(prev =>
            prev.includes(condition)
                ? prev.filter(c => c !== condition)
                : [...prev, condition]
        );
    };

    // Clear all filters
    const clearAllFilters = () => {
        setSelectedCategory(null);
        setSelectedVendor(null);
        setSelectedConditions([]);
        setSelectedQuantityThreshold(null);
        setSearchQuery('');
    };

    // Filter items based on all criteria
    const filteredItems = items.filter((item) => {
        // Category filter
        const matchesCategory = selectedCategory
            ? item.category.id === selectedCategory
            : true;

        // Search filter
        const matchesSearch = searchQuery
            ? item.name.toLowerCase().includes(searchQuery.toLowerCase())
            : true;

        // Vendor filter
        const matchesVendor = selectedVendor
            ? item.vendor === selectedVendor
            : true;

        // Condition filter
        const matchesCondition = selectedConditions.length > 0
            ? selectedConditions.includes(item.condition)
            : true;

        // Quantity threshold filter
        const matchesQuantity = selectedQuantityThreshold
            ? (selectedQuantityThreshold === 'low' && item.quantityAvailable < 10) ||
            (selectedQuantityThreshold === 'medium' && item.quantityAvailable >= 10 && item.quantityAvailable <= 50) ||
            (selectedQuantityThreshold === 'high' && item.quantityAvailable > 50)
            : true;

        return matchesCategory && matchesSearch && matchesVendor && matchesCondition && matchesQuantity;
    });


    return (
        <>
            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg
                            className="h-5 w-5 text-gray-400"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search by product name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input pl-11 pr-10 w-full"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                            title="Clear search"
                        >
                            <svg
                                className="h-5 w-5"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    )}
                </div>
                {searchQuery && (
                    <p className="text-sm text-gray-600 mt-2">
                        Found {filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''}
                    </p>
                )}
            </div>

            {/* Category Filters with Advanced Filter Button */}
            <div className="card mb-6">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${selectedCategory === null
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        All Items ({items.length})
                    </button>
                    {categories.map((cat) => {
                        const categoryItems = items.filter((item) => item.category.id === cat.id);
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${selectedCategory === cat.id
                                    ? 'bg-primary-100 text-primary-700'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {cat.name} ({categoryItems.length})
                            </button>
                        );
                    })}

                    {/* Advanced Filter Button */}
                    <div className="relative ml-auto">
                        <button
                            onClick={() => setShowFilterPanel(!showFilterPanel)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeFilterCount > 0 || showFilterPanel
                                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            More Filters
                            {activeFilterCount > 0 && (
                                <span className="bg-white text-primary-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>

                        {/* Filter Dropdown Panel */}
                        {showFilterPanel && (
                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                <div className="p-4 space-y-4">
                                    <div className="flex items-center justify-between pb-3 border-b">
                                        <h3 className="font-semibold text-gray-900">Advanced Filters</h3>
                                        <button
                                            onClick={() => setShowFilterPanel(false)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Vendor Filter */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Vendor
                                        </label>
                                        <select
                                            value={selectedVendor || ''}
                                            onChange={(e) => setSelectedVendor(e.target.value || null)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        >
                                            <option value="">All Vendors</option>
                                            {uniqueVendors.map((vendor) => (
                                                <option key={vendor} value={vendor}>
                                                    {vendor}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Condition Filter */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Condition
                                        </label>
                                        <div className="space-y-2">
                                            {['GOOD', 'REPAIR_NEEDED', 'DAMAGED'].map((condition) => (
                                                <label key={condition} className="flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedConditions.includes(condition)}
                                                        onChange={() => toggleCondition(condition)}
                                                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                                    />
                                                    <span className="ml-2 text-sm text-gray-700">
                                                        {condition.replace('_', ' ')}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Quantity Threshold Filter */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Stock Level
                                        </label>
                                        <select
                                            value={selectedQuantityThreshold || ''}
                                            onChange={(e) => setSelectedQuantityThreshold((e.target.value || null) as QuantityThreshold)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        >
                                            <option value="">All Stock Levels</option>
                                            <option value="low">Low Stock (&lt;10)</option>
                                            <option value="medium">Medium Stock (10-50)</option>
                                            <option value="high">High Stock (&gt;50)</option>
                                        </select>
                                    </div>

                                    {/* Clear All Button */}
                                    {activeFilterCount > 0 && (
                                        <button
                                            onClick={() => {
                                                clearAllFilters();
                                                setShowFilterPanel(false);
                                            }}
                                            className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-md text-sm font-medium hover:bg-red-100 transition-colors"
                                        >
                                            Clear All Filters
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="card">
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="table-header">Category</th>
                                <th className="table-header">Sub-Category</th>
                                <th className="table-header">Item Name</th>
                                <th className="table-header">Image</th>
                                <th className="table-header">Available Qty</th>
                                <th className="table-header">Condition</th>
                                <th className="table-header">Vendor</th>
                                <th className="table-header">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-8 text-gray-500">
                                        {searchQuery
                                            ? `No items found matching "${searchQuery}".`
                                            : selectedCategory
                                                ? 'No items found in this category.'
                                                : 'No items found. Add your first item to get started.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => (
                                    <tr key={item.id}>
                                        <td className="table-cell">{item.category.name}</td>
                                        <td className="table-cell">
                                            {item.subcategory?.name || '—'}
                                        </td>
                                        <td className="table-cell font-medium">{item.name}</td>
                                        <td className="table-cell">
                                            {item.imageUrl1 ? (
                                                <img
                                                    src={item.imageUrl1}
                                                    alt={item.name}
                                                    className="w-12 h-12 object-cover rounded border border-gray-200"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                                                    <span className="text-gray-400 text-xs">📷</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="table-cell">
                                            <span
                                                className={`font-semibold ${item.quantityAvailable < 10
                                                    ? 'text-red-600'
                                                    : 'text-green-600'
                                                    }`}
                                            >
                                                {item.quantityAvailable}
                                            </span>
                                        </td>
                                        <td className="table-cell">
                                            <span
                                                className={`px-2 py-1 text-xs rounded-full ${item.condition === 'GOOD'
                                                    ? 'bg-green-100 text-green-800'
                                                    : item.condition === 'REPAIR_NEEDED'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-red-100 text-red-800'
                                                    }`}
                                            >
                                                {item.condition.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="table-cell">{item.vendor || '—'}</td>
                                        <td className="table-cell">
                                            <Link
                                                href={`/dashboard/inventory/${item.id}`}
                                                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                                            >
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
