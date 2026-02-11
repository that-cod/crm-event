import { useState, useEffect } from "react";

type Project = {
    id: string;
    name: string;
    location: string;
};

export function useProjects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await fetch("/api/projects");
                if (response.ok) {
                    const data = await response.json();
                    // API returns array directly, not wrapped in projects property
                    setProjects(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                console.error("Error fetching projects:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, []);

    return { projects, loading };
}
