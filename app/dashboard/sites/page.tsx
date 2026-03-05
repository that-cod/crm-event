import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import Link from "next/link";
import { canManageInventory } from "@/lib/permissions";
import DeleteSiteButton from "./DeleteSiteButton";

export default async function SitesPage() {
  const session = await getServerSession(authOptions);
  const canManage = canManageInventory(session!.user.role);

  const sites = await prisma.site.findMany({
    include: {
      _count: {
        select: {
          projects: true,
          siteInventory: true,
          labourAttendances: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const stats = {
    total: sites.length,
    active: sites.filter((s) => s.isActive).length,
    inactive: sites.filter((s) => !s.isActive).length,
  };

  return (
    <div>
      <Header
        title="Sites & Locations"
        subtitle="Manage warehouse and project sites"
        action={
          canManage ? (
            <Link href="/dashboard/sites/new" className="btn btn-primary">
              + Add Site
            </Link>
          ) : undefined
        }
      />

      <div className="p-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card">
            <p className="text-sm text-gray-600">Total Sites</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="card border-green-200 bg-green-50">
            <p className="text-sm text-green-600">Active Sites</p>
            <p className="text-2xl font-bold text-green-700">{stats.active}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Inactive Sites</p>
            <p className="text-2xl font-bold">{stats.inactive}</p>
          </div>
        </div>

        {/* Sites Table */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Site Name</th>
                  <th className="table-header">Location</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Projects</th>
                  <th className="table-header">Items Deployed</th>
                  <th className="table-header">Labour Records</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sites.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      No sites found. Add your first site to get started.
                    </td>
                  </tr>
                ) : (
                  sites.map((site) => (
                    <tr key={site.id}>
                      <td className="table-cell">
                        <Link
                          href={`/dashboard/sites/${site.id}`}
                          className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                          {site.name}
                        </Link>
                      </td>
                      <td className="table-cell">{site.location}</td>
                      <td className="table-cell">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${site.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                            }`}
                        >
                          {site.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="table-cell">{site._count.projects}</td>
                      <td className="table-cell">{site._count.siteInventory}</td>
                      <td className="table-cell">
                        {site._count.labourAttendances}
                      </td>
                      <td className="table-cell">
                        <div className="flex gap-2 items-center">
                          <Link
                            href={`/dashboard/sites/${site.id}`}
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                          >
                            View
                          </Link>
                          <Link
                            href={`/dashboard/sites/${site.id}/inventory`}
                            className="text-green-600 hover:text-green-700 text-sm font-medium"
                          >
                            Inventory
                          </Link>
                          {canManage && (
                            <DeleteSiteButton siteId={site.id} siteName={site.name} />
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
      </div>
    </div>
  );
}
