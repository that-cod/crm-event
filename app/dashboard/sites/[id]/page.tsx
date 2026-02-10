import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";

export default async function SiteDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const site = await prisma.site.findUnique({
    where: { id: params.id },
    include: {
      projects: {
        orderBy: { startDate: "desc" },
      },
      siteInventory: {
        include: {
          item: {
            include: {
              category: true,
            },
          },
        },
      },
      _count: {
        select: {
          projects: true,
          siteInventory: true,
          labourAttendances: true,
        },
      },
    },
  });

  if (!site) {
    notFound();
  }

  const inventorySummary = {
    totalItems: site.siteInventory.length,
    totalQuantity: site.siteInventory.reduce((sum, inv) => sum + inv.quantityDeployed, 0),
    activeDeployments: site.siteInventory.filter((inv) => !inv.actualReturnDate).length,
  };

  return (
    <div>
      <Header
        title={site.name}
        subtitle={site.location}
        action={
          <div className="flex gap-2 flex-wrap">
            {site.siteInventory.length > 0 && (
              <>
                <Link
                  href={`/dashboard/challans/generate?siteId=${site.id}`}
                  className="btn bg-green-600 text-white hover:bg-green-700"
                >
                  🚛 Auto-Generate Challans
                </Link>
                <Link
                  href={`/dashboard/challans/new?siteId=${site.id}`}
                  className="btn btn-primary"
                >
                  📄 Create Challan
                </Link>
              </>
            )}
            <Link
              href={`/dashboard/sites/${site.id}/inventory`}
              className="btn btn-secondary"
            >
              View Inventory
            </Link>
            <Link href="/dashboard/sites" className="btn btn-outline">
              ← Back to Sites
            </Link>
          </div>
        }
      />

      <div className="p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Site Information */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Site Information</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-600">Site Name</label>
                <p className="text-lg text-gray-900 mt-1">{site.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <p className="mt-1">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${site.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                      }`}
                  >
                    {site.isActive ? "Active" : "Inactive"}
                  </span>
                </p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-600">Location</label>
                <p className="text-lg text-gray-900 mt-1">{site.location}</p>
              </div>
              {site.description && (
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-600">
                    Description
                  </label>
                  <p className="text-gray-900 mt-1">{site.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card">
              <p className="text-sm text-gray-600">Projects</p>
              <p className="text-2xl font-bold">{site._count.projects}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-600">Unique Items</p>
              <p className="text-2xl font-bold">{inventorySummary.totalItems}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-600">Total Quantity</p>
              <p className="text-2xl font-bold">{inventorySummary.totalQuantity}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-600">Active Deployments</p>
              <p className="text-2xl font-bold text-orange-600">
                {inventorySummary.activeDeployments}
              </p>
            </div>
          </div>

          {/* Recent Projects */}
          {site.projects.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Recent Projects</h2>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-header">Project Name</th>
                      <th className="table-header">Type</th>
                      <th className="table-header">Start Date</th>
                      <th className="table-header">Status</th>
                      <th className="table-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {site.projects.map((project) => (
                      <tr key={project.id}>
                        <td className="table-cell font-medium">{project.name}</td>
                        <td className="table-cell">
                          {project.type.replace("_", " ")}
                        </td>
                        <td className="table-cell">
                          {new Date(project.startDate).toLocaleDateString()}
                        </td>
                        <td className="table-cell">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${project.status === "ACTIVE"
                              ? "bg-green-100 text-green-800"
                              : project.status === "COMPLETED"
                                ? "bg-gray-100 text-gray-800"
                                : "bg-blue-100 text-blue-800"
                              }`}
                          >
                            {project.status}
                          </span>
                        </td>
                        <td className="table-cell">
                          <Link
                            href={`/dashboard/projects/${project.id}`}
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
            </div>
          )}

          {/* Deployed Inventory Preview */}
          {site.siteInventory.length > 0 && (
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Deployed Inventory</h2>
                <Link
                  href={`/dashboard/sites/${site.id}/inventory`}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  View All →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {site.siteInventory.slice(0, 6).map((inv) => (
                  <div key={inv.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-sm">{inv.item.name}</p>
                      <p className="text-xs text-gray-600">
                        {inv.item.category.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{inv.quantityDeployed}</p>
                      <p className="text-xs text-gray-600">
                        {inv.actualReturnDate ? "Returned" : "Deployed"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
