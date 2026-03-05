import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import Link from "next/link";
import { canCreateProjects } from "@/lib/permissions";
import DeleteBundleTemplateButton from "./DeleteBundleTemplateButton";

export default async function BundleTemplatesPage() {
    const session = await getServerSession(authOptions);
    const canManage = canCreateProjects(session!.user.role);

    const templates = await prisma.bundleTemplate.findMany({
        include: {
            baseItem: {
                include: {
                    category: true,
                },
            },
            items: {
                include: {
                    item: {
                        include: {
                            category: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            name: "asc",
        },
    });

    return (
        <div>
            <Header
                title="Bundle Templates"
                subtitle="Manage item bundles and equipment packages"
                action={
                    canManage ? (
                        <Link href="/dashboard/bundle-templates/new" className="btn btn-primary">
                            + New Bundle Template
                        </Link>
                    ) : undefined
                }
            />

            <div className="p-8">
                <div className="card">
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="table-header">Template Name</th>
                                    <th className="table-header">Base Item</th>
                                    <th className="table-header">Category</th>
                                    <th className="table-header">Bundled Items</th>
                                    <th className="table-header">Description</th>
                                    <th className="table-header">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {templates.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8 text-gray-500">
                                            No bundle templates found. Create your first bundle to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    templates.map((template) => (
                                        <tr key={template.id}>
                                            <td className="table-cell font-medium">{template.name}</td>
                                            <td className="table-cell">{template.baseItem.name}</td>
                                            <td className="table-cell">
                                                <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                                                    {template.baseItem.category.name}
                                                </span>
                                            </td>
                                            <td className="table-cell">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {template.items.length} items
                                                </span>
                                            </td>
                                            <td className="table-cell text-gray-600">
                                                {template.description || "—"}
                                            </td>
                                            <td className="table-cell">
                                                <div className="flex gap-2 items-center">
                                                    <Link
                                                        href={`/dashboard/bundle-templates/${template.id}`}
                                                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                                                    >
                                                        View
                                                    </Link>
                                                    {canManage && (
                                                        <DeleteBundleTemplateButton templateId={template.id} templateName={template.name} />
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Info */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-start gap-3">
                        <div className="text-xl">ℹ️</div>
                        <div>
                            <p className="text-sm font-medium text-blue-900 mb-1">
                                About Bundle Templates
                            </p>
                            <p className="text-xs text-blue-700">
                                Bundle templates help you quickly allocate groups of items together.
                                For example, a "Tent Setup" bundle might include a tent, poles, stakes,
                                and a carrying bag. When allocating to projects, you can use these
                                templates for faster processing.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
