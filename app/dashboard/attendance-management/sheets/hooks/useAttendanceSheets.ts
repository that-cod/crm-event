import { useState, useEffect } from "react";

interface Labour {
    id: string;
    name: string;
}

interface AttendanceSheet {
    id: string;
    labour: Labour;
    attendanceJson: number[];
    totalShifts: number;
    dailyRate: number;
    wages: number;
    incentive: number;
    netWages: number;
    openingBalance: number;
    totalAdvance: number;
    totalPaid: number;
    netPayable: number;
    balanceDue: number;
}

interface Site {
    id: string;
    name: string;
}

export function useAttendanceSheets(
    siteId: string | null,
    month: number,
    year: number
) {
    const [loading, setLoading] = useState(true);
    const [sheets, setSheets] = useState<AttendanceSheet[]>([]);
    const [siteName, setSiteName] = useState("");
    const [daysInMonth, setDaysInMonth] = useState(31);

    useEffect(() => {
        if (siteId) {
            fetchSheets();
            fetchSiteInfo();
            const days = new Date(year, month, 0).getDate();
            setDaysInMonth(days);
        }
    }, [siteId, month, year]);

    const fetchSiteInfo = async () => {
        try {
            const response = await fetch(`/api/sites`);
            const data = await response.json();
            const site = data.sites?.find((s: Site) => s.id === siteId);
            if (site) setSiteName(site.name);
        } catch (error) {
            console.error("Error fetching site:", error);
        }
    };

    const fetchSheets = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `/api/attendance-sheets?siteId=${siteId}&month=${month}&year=${year}`
            );
            const data = await response.json();
            setSheets(data.sheets || []);
        } catch (error) {
            console.error("Error fetching sheets:", error);
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        sheets,
        setSheets,
        siteName,
        daysInMonth,
        refetchSheets: fetchSheets,
    };
}
