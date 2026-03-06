"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DeployItemsModal from "@/components/DeployItemsModal";

interface SiteDeployButtonProps {
    siteId: string;
    siteName: string;
}

export default function SiteDeployButton({ siteId, siteName }: SiteDeployButtonProps) {
    const router = useRouter();
    const [showModal, setShowModal] = useState(false);

    const handleSuccess = () => {
        router.refresh();
    };

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="btn btn-primary"
            >
                🚚 Deploy Items
            </button>

            {showModal && (
                <DeployItemsModal
                    siteId={siteId}
                    siteName={siteName}
                    onClose={() => setShowModal(false)}
                    onSuccess={handleSuccess}
                />
            )}
        </>
    );
}
