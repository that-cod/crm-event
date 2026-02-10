import { useState, useEffect } from "react";

type Site = {
    id: string;
    name: string;
    location: string;
};

export function useInitialData(siteId: string | null) {
    const [site, setSite] = useState<Site | null>(null);
    const [companySettings, setCompanySettings] = useState<Record<string, unknown> | null>(null);

    useEffect(() => {
        loadInitialData();
    }, [siteId]);

    const loadInitialData = async () => {
        try {
            const settingsRes = await fetch("/api/settings/company");

            if (settingsRes.ok) {
                const settings = await settingsRes.json();
                setCompanySettings(settings);
            }

            if (siteId) {
                const siteRes = await fetch(`/api/sites/${siteId}`);
                if (siteRes.ok) {
                    const siteData = await siteRes.json();
                    setSite(siteData);
                }
            }
        } catch (error) {
            console.error("Error loading data:", error);
        }
    };

    return { site, companySettings };
}
