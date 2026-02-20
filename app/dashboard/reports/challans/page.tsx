import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import Header from "@/components/Header";
import Link from "next/link";

// Type definitions
interface ChallanItem {
  item: {
    name: string;
  };
  quantity: number;
}

type Challan = Prisma.ChallanGetPayload<{
  include: {
    project: true;
    createdBy: true;
    items: {
      include: {
        item: {
          include: {
            category: true;
          };
        };
      };
    };
  };
}>;

export default async function ChallansReportPage() {
  const challans = await prisma.challan.findMany({
    include: {
      project: true,
      createdBy: true,
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
      createdAt: "desc",
    },
  });

  // Calculate statistics
  const stats = {
    total: challans.length,
    thisMonth: challans.filter((c) => {
      const challanDate = new Date(c.createdAt);
      const now = new Date();
      return (
        challanDate.getMonth() === now.getMonth() &&
        challanDate.getFullYear() === now.getFullYear()
      );
    }).length,
    totalItems: challans.reduce((sum, c) => sum + c.items.length, 0),
    totalQuantity: challans.reduce(
      (sum, c) => sum + c.items.reduce((s, i) => s + i.quantity, 0),
      0
    ),
  };

  // Group by project
  const challansByProject = challans.reduce((acc, challan) => {
    const projectId = challan.project.id;
    if (!acc[projectId]) {
      acc[projectId] = {
        project: challan.project,
        challans: [],
      };
    }
    acc[projectId].challans.push(challan);
    return acc;
  }, {} as Record<string, { project: { id: string; name: string; location: string; startDate: Date; status: string }; challans: Challan[] }>);

  return (
    <div>
      <Header
        title="Challan History"
        subtitle="Complete history of all delivery challans"
        action={
          <a
            href="/api/reports/export/challans?format=csv"
            className="btn btn-primary"
          >
            Export CSV
          </a>
        }
      />

      <div className="p-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <p className="text-sm text-gray-600">Total Challans</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">This Month</p>
            <p className="text-2xl font-bold text-blue-600">{stats.thisMonth}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Unique Items</p>
            <p className="text-2xl font-bold">{stats.totalItems}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Total Quantity</p>
            <p className="text-2xl font-bold">{stats.totalQuantity}</p>
          </div>
        </div>

        {/* Challans by Project */}
        <div className="space-y-6">
          {Object.keys(challansByProject).length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Challans Found
              </h3>
              <p className="text-gray-600 mb-4">
                Create your first challan to start tracking deliveries.
              </p>
              <Link
                href="/dashboard/challans/new"
                className="btn btn-primary inline-block"
              >
                Create Challan
              </Link>
            </div>
          ) : (
            Object.values(challansByProject).map(({ project, challans }) => (
              <div key={project.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      <Link
                        href={`/dashboard/projects/${project.id}`}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        {project.name}
                      </Link>
                    </h3>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>📍 {project.location}</span>
                      <span>
                        📅 {new Date(project.startDate).toLocaleDateString()}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${project.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : project.status === "COMPLETED"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-blue-100 text-blue-800"
                          }`}
                      >
                        {project.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Challans</p>
                    <p className="text-2xl font-bold">{challans.length}</p>
                  </div>
                </div>

                {/* Challans Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Challan Number
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Issue Date
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Expected Return
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                          Items
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                          Total Qty
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Created By
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {challans.map((challan) => (
                        <tr key={challan.id}>
                          <td className="px-4 py-2">
                            <Link
                              href={`/dashboard/challans/${challan.id}`}
                              className="text-primary-600 hover:text-primary-700 font-mono font-semibold"
                            >
                              {challan.challanNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-2 text-gray-600">
                            {new Date(challan.issueDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 text-gray-600">
                            {challan.expectedReturnDate
                              ? new Date(
                                challan.expectedReturnDate
                              ).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="px-4 py-2 text-right font-medium">
                            {challan.items.length}
                          </td>
                          <td className="px-4 py-2 text-right font-semibold">
                            {challan.items.reduce(
                              (sum: number, item: ChallanItem) => sum + item.quantity,
                              0
                            )}
                          </td>
                          <td className="px-4 py-2 text-gray-600">
                            {challan.createdBy.name}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex gap-2">
                              <Link
                                href={`/dashboard/challans/${challan.id}`}
                                className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                              >
                                View
                              </Link>
                              <Link
                                href={`/dashboard/challans/${challan.id}/print`}
                                target="_blank"
                                className="text-green-600 hover:text-green-700 text-xs font-medium"
                              >
                                Print
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Challan Items Summary */}
                <div className="mt-4 pt-4 border-t">
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                      View Items Summary
                    </summary>
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Array.from(
                        new Set(
                          challans.flatMap((c: Challan) => c.items.map((i: ChallanItem) => i.item.name))
                        )
                      ).map((itemName) => {
                        const totalQty = challans.reduce(
                          (sum, c) =>
                            sum +
                            c.items
                              .filter((i: ChallanItem) => i.item.name === itemName)
                              .reduce((s: number, i: ChallanItem) => s + i.quantity, 0),
                          0
                        );
                        return (
                          <div
                            key={itemName}
                            className="text-xs p-2 bg-gray-50 rounded"
                          >
                            <span className="font-medium">{itemName}:</span>{" "}
                            <span className="text-gray-600">{totalQty} units</span>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
