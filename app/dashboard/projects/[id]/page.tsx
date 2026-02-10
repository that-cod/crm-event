import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Header from "@/components/Header"
import Link from "next/link"
import DeleteProjectButton from "./DeleteProjectButton"

interface ProjectDetailPageProps {
    params: {
        id: string
    }
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
    const project = await prisma.project.findUnique({
        where: { id: params.id },
        include: {
            site: true,
            stockMovements: {
                include: {
                    item: {
                        include: {
                            category: true,
                        },
                    },
                    performedBy: true,
                },
                orderBy: { createdAt: "desc" },
            },
            challans: {
                include: {
                    items: {
                        include: {
                            item: true,
                        },
                    },
                    createdBy: true,
                },
                orderBy: { issueDate: "desc" },
            },
        },
    })

    if (!project) {
        notFound()
    }

    // Calculate totals
    const totalItemsAllocated = project.stockMovements
        .filter((m) => m.movementType === "OUTWARD")
        .reduce((sum, m) => sum + m.quantity, 0)

    const totalItemsReturned = project.stockMovements
        .filter((m) => m.movementType === "RETURN")
        .reduce((sum, m) => sum + m.quantity, 0)

    const currentlyAllocated = totalItemsAllocated - totalItemsReturned

    const statusColors = {
        PLANNED: "bg-blue-100 text-blue-800",
        ACTIVE: "bg-green-100 text-green-800",
        COMPLETED: "bg-gray-100 text-gray-800",
    }

    const typeColors = {
        CAMP: "bg-purple-100 text-purple-800",
        FESTIVAL: "bg-pink-100 text-pink-800",
        CORPORATE_EVENT: "bg-indigo-100 text-indigo-800",
        RETREAT: "bg-teal-100 text-teal-800",
        RENTAL: "bg-orange-100 text-orange-800",
        OTHER: "bg-gray-100 text-gray-800",
    }

    return (
        <div className="p-8">
            <Header
                title={project.name}
                subtitle={`${project.type.replace("_", " ")} • ${project.location}`}
                action={
                    <div className="flex gap-2">
                        {(project.status === "ACTIVE" || project.status === "PLANNED") && (
                            <Link
                                href={`/dashboard/challans/new?projectId=${project.id}`}
                                className="btn btn-primary"
                            >
                                📄 Create Challan
                            </Link>
                        )}
                        <DeleteProjectButton
                            projectId={project.id}
                            projectName={project.name}
                        />
                        <Link href="/dashboard/projects" className="btn btn-secondary">
                            ← Back to Projects
                        </Link>
                    </div>
                }
            />

            {/* Project Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
                <div className="card">
                    <p className="text-sm text-gray-600 mb-2">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[project.status]}`}>
                        {project.status}
                    </span>
                </div>

                <div className="card">
                    <p className="text-sm text-gray-600 mb-2">Type</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${typeColors[project.type]}`}>
                        {project.type.replace("_", " ")}
                    </span>
                </div>

                <div className="card">
                    <p className="text-sm text-gray-600 mb-2">Items Allocated</p>
                    <p className="text-3xl font-bold text-primary-600">{currentlyAllocated}</p>
                    <p className="text-xs text-gray-500 mt-1">
                        {totalItemsAllocated} total • {totalItemsReturned} returned
                    </p>
                </div>

                <div className="card">
                    <p className="text-sm text-gray-600 mb-2">Challans</p>
                    <p className="text-3xl font-bold text-primary-600">{project.challans.length}</p>
                </div>
            </div>

            {/* Project Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Left Column - Project Info */}
                <div className="card">
                    <h2 className="text-xl font-semibold mb-4">Project Information</h2>
                    <dl className="space-y-3">
                        <div>
                            <dt className="text-sm font-medium text-gray-600">Location</dt>
                            <dd className="text-base text-gray-900 mt-1">{project.location}</dd>
                        </div>

                        {project.site && (
                            <div>
                                <dt className="text-sm font-medium text-gray-600">Site</dt>
                                <dd className="text-base text-gray-900 mt-1">
                                    <Link href={`/dashboard/sites/${project.site.id}`} className="text-primary-600 hover:underline">
                                        {project.site.name}
                                    </Link>
                                </dd>
                            </div>
                        )}

                        <div>
                            <dt className="text-sm font-medium text-gray-600">Start Date</dt>
                            <dd className="text-base text-gray-900 mt-1">
                                {new Date(project.startDate).toLocaleDateString()}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-sm font-medium text-gray-600">End Date</dt>
                            <dd className="text-base text-gray-900 mt-1">
                                {project.endDate ? new Date(project.endDate).toLocaleDateString() : "Not specified"}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-sm font-medium text-gray-600">Duration</dt>
                            <dd className="text-base text-gray-900 mt-1">
                                {project.endDate
                                    ? `${Math.ceil(
                                        (new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) /
                                        (1000 * 60 * 60 * 24)
                                    )} days`
                                    : "Ongoing"}
                            </dd>
                        </div>
                    </dl>
                </div>

                {/* Right Column - Quick Stats */}
                <div className="card">
                    <h2 className="text-xl font-semibold mb-4">Activity Summary</h2>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                            <span className="text-sm font-medium text-blue-900">Stock Movements</span>
                            <span className="text-2xl font-bold text-blue-600">{project.stockMovements.length}</span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <span className="text-sm font-medium text-green-900">Outward Movements</span>
                            <span className="text-2xl font-bold text-green-600">
                                {project.stockMovements.filter((m) => m.movementType === "OUTWARD").length}
                            </span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                            <span className="text-sm font-medium text-orange-900">Returns</span>
                            <span className="text-2xl font-bold text-orange-600">
                                {project.stockMovements.filter((m) => m.movementType === "RETURN").length}
                            </span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                            <span className="text-sm font-medium text-purple-900">Challans Issued</span>
                            <span className="text-2xl font-bold text-purple-600">{project.challans.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stock Movements Table */}
            <div className="card mt-6">
                <h2 className="text-xl font-semibold mb-4">Stock Movements</h2>
                {project.stockMovements.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">📦</div>
                        <p className="text-gray-600">No stock movements yet</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="table-header">Date</th>
                                    <th className="table-header">Item</th>
                                    <th className="table-header">Category</th>
                                    <th className="table-header">Type</th>
                                    <th className="table-header">Quantity</th>
                                    <th className="table-header">Performed By</th>
                                    <th className="table-header">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {project.stockMovements.map((movement) => (
                                    <tr key={movement.id}>
                                        <td className="table-cell text-sm">
                                            {new Date(movement.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="table-cell font-medium">{movement.item.name}</td>
                                        <td className="table-cell text-sm">{movement.item.category.name}</td>
                                        <td className="table-cell">
                                            <span
                                                className={`px-2 py-1 text-xs rounded-full font-medium ${movement.movementType === "OUTWARD"
                                                    ? "bg-red-100 text-red-800"
                                                    : movement.movementType === "INWARD"
                                                        ? "bg-green-100 text-green-800"
                                                        : "bg-blue-100 text-blue-800"
                                                    }`}
                                            >
                                                {movement.movementType}
                                            </span>
                                        </td>
                                        <td className="table-cell">
                                            <span className="font-semibold text-lg">{movement.quantity}</span>
                                        </td>
                                        <td className="table-cell text-sm">{movement.performedBy.name}</td>
                                        <td className="table-cell text-xs text-gray-600 max-w-xs truncate">
                                            {movement.notes || "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Challans Table */}
            <div className="card mt-6">
                <h2 className="text-xl font-semibold mb-4">Challans</h2>
                {project.challans.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">📄</div>
                        <p className="text-gray-600">No challans issued yet</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="table-header">Challan Number</th>
                                    <th className="table-header">Issue Date</th>
                                    <th className="table-header">Expected Return</th>
                                    <th className="table-header">Items</th>
                                    <th className="table-header">Created By</th>
                                    <th className="table-header">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {project.challans.map((challan) => (
                                    <tr key={challan.id}>
                                        <td className="table-cell font-medium">{challan.challanNumber}</td>
                                        <td className="table-cell text-sm">
                                            {new Date(challan.issueDate).toLocaleDateString()}
                                        </td>
                                        <td className="table-cell text-sm">
                                            {challan.expectedReturnDate
                                                ? new Date(challan.expectedReturnDate).toLocaleDateString()
                                                : "—"}
                                        </td>
                                        <td className="table-cell">
                                            <span className="font-semibold text-primary-600">{challan.items.length}</span> items
                                        </td>
                                        <td className="table-cell text-sm">{challan.createdBy.name}</td>
                                        <td className="table-cell">
                                            <Link
                                                href={`/dashboard/challans/${challan.id}`}
                                                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                                            >
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
