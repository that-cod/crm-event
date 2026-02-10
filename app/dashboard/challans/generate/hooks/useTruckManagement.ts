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

export function useTruckManagement(
    trucks: Truck[],
    setTrucks: React.Dispatch<React.SetStateAction<Truck[]>>,
    truckCapacityKg: number
) {
    // Recalculate truck weight and remaining capacity
    const recalculateTruckWeight = (truck: Truck): Truck => {
        const totalWeight = truck.items.reduce((sum, item) => sum + item.totalWeight, 0);
        return {
            ...truck,
            totalWeight,
            remainingCapacity: truckCapacityKg - totalWeight,
        };
    };

    // Update truck metadata (plate, driver, etc.)
    const updateTruck = (truckIndex: number, field: string, value: string | number) => {
        setTrucks((prev) =>
            prev.map((t, i) => (i === truckIndex ? { ...t, [field]: value } : t))
        );
    };

    // Update item quantity and recalculate weights
    const updateItemQuantity = (truckIndex: number, itemIndex: number, newQuantity: number) => {
        if (newQuantity < 0) return; // Prevent negative quantities

        setTrucks((prev) => {
            const updated = prev.map((truck, tIdx) => {
                if (tIdx !== truckIndex) return truck;

                const updatedItems = truck.items.map((item, iIdx) => {
                    if (iIdx !== itemIndex) return item;

                    const totalWeight = (item.weightPerUnit || 0) * newQuantity;
                    return {
                        ...item,
                        quantity: newQuantity,
                        totalWeight,
                    };
                });

                return recalculateTruckWeight({
                    ...truck,
                    items: updatedItems,
                });
            });

            return updated;
        });
    };

    // Remove item from truck
    const removeItem = (truckIndex: number, itemIndex: number) => {
        setTrucks((prev) => {
            const updated = prev.map((truck, tIdx) => {
                if (tIdx !== truckIndex) return truck;

                const updatedItems = truck.items.filter((_, iIdx) => iIdx !== itemIndex);
                return recalculateTruckWeight({
                    ...truck,
                    items: updatedItems,
                });
            });

            // Remove empty trucks (except if it's the last truck)
            return updated.filter((truck) => truck.items.length > 0 || updated.length === 1);
        });
    };

    // Add a new empty truck
    const addTruck = () => {
        setTrucks((prev) => {
            const newTruckNumber = prev.length > 0 ? Math.max(...prev.map((t) => t.truckNumber)) + 1 : 1;
            const newTruck: Truck = {
                truckNumber: newTruckNumber,
                items: [],
                totalWeight: 0,
                remainingCapacity: truckCapacityKg,
                truckPlate: "",
                driverName: "",
                driverPhone: "",
                transporterName: "",
                lrBiltyNo: "",
                contactPersonName: "",
                contactPersonNumber: "",
                dispatchFrom: prev[0]?.dispatchFrom || "",
                dispatchTo: prev[0]?.dispatchTo || "",
                amount: 0,
            };
            return [...prev, newTruck];
        });
    };

    // Remove a truck and redistribute its items
    const removeTruck = (truckIndex: number) => {
        setTrucks((prev) => {
            if (prev.length <= 1) return prev; // Can't remove the last truck

            const truckToRemove = prev[truckIndex];
            const remainingTrucks = prev.filter((_, idx) => idx !== truckIndex);

            // Redistribute items from removed truck
            if (truckToRemove.items.length > 0) {
                const itemsToRedistribute = [...truckToRemove.items];
                const updatedTrucks = remainingTrucks.map((truck) => ({ ...truck }));

                // Sort items by loading order (same as original algorithm)
                itemsToRedistribute.sort((a, b) => a.loadingOrder - b.loadingOrder);

                // Distribute items across remaining trucks
                itemsToRedistribute.forEach((item) => {
                    // Find truck with most remaining capacity
                    let bestTruckIdx = 0;
                    let maxCapacity = updatedTrucks[0].remainingCapacity;

                    updatedTrucks.forEach((truck, idx) => {
                        if (truck.remainingCapacity > maxCapacity) {
                            maxCapacity = truck.remainingCapacity;
                            bestTruckIdx = idx;
                        }
                    });

                    // Add item to best truck
                    updatedTrucks[bestTruckIdx].items.push(item);
                    updatedTrucks[bestTruckIdx] = recalculateTruckWeight(updatedTrucks[bestTruckIdx]);
                });

                return updatedTrucks;
            }

            return remainingTrucks;
        });
    };

    // Redistribute all items across a new number of trucks
    const redistributeItems = (newTruckCount: number) => {
        if (newTruckCount < 1) return;

        setTrucks((prev) => {
            // Collect all items from all trucks
            const allItems: TruckItem[] = [];
            prev.forEach((truck) => {
                allItems.push(...truck.items);
            });

            if (allItems.length === 0) {
                // No items, just create empty trucks
                return Array.from({ length: newTruckCount }, (_, i) => ({
                    truckNumber: i + 1,
                    items: [],
                    totalWeight: 0,
                    remainingCapacity: truckCapacityKg,
                    truckPlate: prev[0]?.truckPlate || "",
                    driverName: prev[0]?.driverName || "",
                    driverPhone: prev[0]?.driverPhone || "",
                    transporterName: prev[0]?.transporterName || "",
                    lrBiltyNo: prev[0]?.lrBiltyNo || "",
                    contactPersonName: prev[0]?.contactPersonName || "",
                    contactPersonNumber: prev[0]?.contactPersonNumber || "",
                    dispatchFrom: prev[0]?.dispatchFrom || "",
                    dispatchTo: prev[0]?.dispatchTo || "",
                    amount: prev[0]?.amount || 0,
                }));
            }

            // Sort items by loading order
            allItems.sort((a, b) => a.loadingOrder - b.loadingOrder);

            // Create new trucks
            const newTrucks: Truck[] = Array.from({ length: newTruckCount }, (_, i) => ({
                truckNumber: i + 1,
                items: [],
                totalWeight: 0,
                remainingCapacity: truckCapacityKg,
                // Preserve first truck's metadata
                truckPlate: prev[0]?.truckPlate || "",
                driverName: prev[0]?.driverName || "",
                driverPhone: prev[0]?.driverPhone || "",
                transporterName: prev[0]?.transporterName || "",
                lrBiltyNo: prev[0]?.lrBiltyNo || "",
                contactPersonName: prev[0]?.contactPersonName || "",
                contactPersonNumber: prev[0]?.contactPersonNumber || "",
                dispatchFrom: prev[0]?.dispatchFrom || "",
                dispatchTo: prev[0]?.dispatchTo || "",
                amount: prev[0]?.amount || 0,
            }));

            // Distribute items using first-fit decreasing algorithm
            allItems.forEach((item) => {
                let placed = false;

                // Try to place in existing truck with capacity
                for (let i = 0; i < newTrucks.length; i++) {
                    if (newTrucks[i].remainingCapacity >= item.totalWeight) {
                        newTrucks[i].items.push(item);
                        newTrucks[i] = recalculateTruckWeight(newTrucks[i]);
                        placed = true;
                        break;
                    }
                }

                // If can't fit, place in truck with most space (even if over capacity)
                if (!placed) {
                    let maxCapacityIdx = 0;
                    let maxCapacity = newTrucks[0].remainingCapacity;

                    newTrucks.forEach((truck, idx) => {
                        if (truck.remainingCapacity > maxCapacity) {
                            maxCapacity = truck.remainingCapacity;
                            maxCapacityIdx = idx;
                        }
                    });

                    newTrucks[maxCapacityIdx].items.push(item);
                    newTrucks[maxCapacityIdx] = recalculateTruckWeight(newTrucks[maxCapacityIdx]);
                }
            });

            return newTrucks;
        });
    };

    return {
        updateTruck,
        updateItemQuantity,
        removeItem,
        addTruck,
        removeTruck,
        redistributeItems,
    };
}
