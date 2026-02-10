"use client";

import { useState, useMemo, useRef } from "react";

type Item = {
    id: string;
    name: string;
    quantityAvailable: number;
    category: {
        id: string;
        name: string;
    };
};

type Category = {
    id: string;
    name: string;
    items: Item[];
};

interface CategoryItemDropdownProps {
    items: Item[];
    selectedItemId: string;
    onSelectItem: (itemId: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export default function CategoryItemDropdown({
    items,
    selectedItemId,
    onSelectItem,
    placeholder = "Select an item...",
    disabled = false,
}: CategoryItemDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null);
    const [submenuPosition, setSubmenuPosition] = useState({ top: 0, left: 0 });
    const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Group items by category
    const categories: Category[] = useMemo(() => {
        const categoryMap = new Map<string, Category>();

        items.forEach((item) => {
            const catId = item.category.id;
            if (!categoryMap.has(catId)) {
                categoryMap.set(catId, {
                    id: catId,
                    name: item.category.name,
                    items: [],
                });
            }
            categoryMap.get(catId)!.items.push(item);
        });

        // Sort categories alphabetically and items within each category
        return Array.from(categoryMap.values())
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((cat) => ({
                ...cat,
                items: cat.items.sort((a, b) => a.name.localeCompare(b.name)),
            }));
    }, [items]);

    // Get selected item details
    const selectedItem = items.find((item) => item.id === selectedItemId);

    const handleSelectItem = (itemId: string) => {
        onSelectItem(itemId);
        setIsOpen(false);
        setHoveredCategoryId(null);
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
        }
    };

    const handleCategoryHover = (categoryId: string) => {
        // Clear any pending hide timeout
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
        }
        const categoryEl = categoryRefs.current[categoryId];
        if (categoryEl) {
            const rect = categoryEl.getBoundingClientRect();
            const submenuWidth = 384; // w-96 = 24rem = 384px
            const submenuMaxHeight = 384; // max-h-96 = 24rem = 384px
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const gap = 8;

            let left = rect.right + gap;
            let top = rect.top;

            // Check if submenu would go off right edge
            if (left + submenuWidth > viewportWidth) {
                // Position on left side instead
                left = rect.left - submenuWidth - gap;

                // If still off-screen on left, position within viewport
                if (left < 0) {
                    left = viewportWidth - submenuWidth - 16; // 16px margin from edge
                }
            }

            // Check if submenu would go off bottom edge
            if (top + submenuMaxHeight > viewportHeight) {
                // Align to bottom of viewport with margin
                top = viewportHeight - submenuMaxHeight - 16; // 16px margin from bottom

                // Make sure it doesn't go above viewport
                if (top < 16) {
                    top = 16; // 16px margin from top
                }
            }

            // Ensure submenu doesn't go off top edge
            if (top < 16) {
                top = 16;
            }

            // Ensure submenu doesn't go off left edge
            if (left < 16) {
                left = 16;
            }

            setSubmenuPosition({ top, left });
        }
        setHoveredCategoryId(categoryId);
    };

    const handleCategoryLeave = () => {
        // Delay hiding to allow mouse to move to submenu
        hideTimeoutRef.current = setTimeout(() => {
            setHoveredCategoryId(null);
        }, 150); // 150ms delay
    };

    const handleSubmenuEnter = () => {
        // Cancel hide if mouse enters submenu
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
        }
    };

    const handleSubmenuLeave = () => {
        // Hide submenu when mouse leaves it
        setHoveredCategoryId(null);
    };

    return (
        <div className="relative w-full">
            {/* Dropdown Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className={`input w-full text-left flex items-center justify-between ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    }`}
            >
                <span className={selectedItem ? "text-gray-900" : "text-gray-500"}>
                    {selectedItem ? selectedItem.name : placeholder}
                </span>
                <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? "transform rotate-180" : ""
                        }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <>
                    {/* Overlay to close dropdown */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => {
                            setIsOpen(false);
                            setHoveredCategoryId(null);
                        }}
                    />

                    {/* Category List */}
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-20 max-h-80 overflow-y-auto">
                        {categories.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-500">
                                No items available
                            </div>
                        ) : (
                            categories.map((category) => (
                                <div
                                    key={category.id}
                                    ref={(el) => { categoryRefs.current[category.id] = el; }}
                                    className="relative"
                                    onMouseEnter={() => handleCategoryHover(category.id)}
                                    onMouseLeave={handleCategoryLeave}
                                >
                                    {/* Category Item */}
                                    <div className={`px-4 py-3 cursor-pointer flex items-center justify-between border-b border-gray-100 transition-colors ${hoveredCategoryId === category.id ? 'bg-primary-50 border-l-4 border-l-primary-500' : 'hover:bg-gray-50'
                                        }`}>
                                        <span className="font-medium text-gray-900">
                                            {category.name}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                {category.items.length} items
                                            </span>
                                            <svg
                                                className="w-4 h-4 text-gray-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 5l7 7-7 7"
                                                />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Item Submenu (shows on hover) - Using FIXED positioning to avoid clipping */}
                    {hoveredCategoryId && (
                        <div
                            className="fixed bg-white border-2 border-primary-500 rounded-lg shadow-2xl z-50 w-96 max-h-96 overflow-hidden"
                            style={{
                                top: `${submenuPosition.top}px`,
                                left: `${submenuPosition.left}px`,
                            }}
                            onMouseEnter={handleSubmenuEnter}
                            onMouseLeave={handleSubmenuLeave}
                        >
                            {/* Submenu Header */}
                            <div className="bg-primary-600 text-white px-4 py-3 font-semibold border-b border-primary-700">
                                <div className="flex items-center justify-between">
                                    <span>{categories.find(c => c.id === hoveredCategoryId)?.name}</span>
                                    <span className="text-xs bg-primary-700 px-2 py-1 rounded">
                                        {categories.find(c => c.id === hoveredCategoryId)?.items.length} items
                                    </span>
                                </div>
                            </div>

                            {/* Items List */}
                            <div className="max-h-80 overflow-y-auto p-2">
                                {categories.find(c => c.id === hoveredCategoryId)?.items.length === 0 ? (
                                    <div className="px-4 py-6 text-sm text-gray-500 text-center">
                                        No items in this category
                                    </div>
                                ) : (
                                    categories.find(c => c.id === hoveredCategoryId)?.items.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => handleSelectItem(item.id)}
                                            className={`w-full px-4 py-3 text-left rounded-md hover:bg-primary-50 hover:border-primary-200 border border-transparent transition-all mb-2 ${selectedItemId === item.id
                                                ? "bg-primary-100 border-primary-300"
                                                : ""
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <span className="text-sm text-gray-900 font-medium flex-1">
                                                    {item.name}
                                                </span>
                                                <span
                                                    className={`text-xs px-2 py-1 rounded font-semibold whitespace-nowrap ${item.quantityAvailable < 10
                                                        ? "bg-red-100 text-red-700"
                                                        : item.quantityAvailable < 50
                                                            ? "bg-yellow-100 text-yellow-700"
                                                            : "bg-green-100 text-green-700"
                                                        }`}
                                                >
                                                    {item.quantityAvailable} avail
                                                </span>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
