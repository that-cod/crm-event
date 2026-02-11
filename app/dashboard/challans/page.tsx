import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import Link from "next/link";
import { canCreateChallans } from "@/lib/permissions";
import ChallanActions from "./ChallanActions";

export default async function ChallansPage() {
  const session = await getServerSession(authOptions);
  const canManage = canCreateChallans(session!.user.role);

  const challans = await prisma.challan.findMany({
    include: {
      project: true,
      createdBy: true,
      items: {
        include: {
          item: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div>
      <Header
        title="Challans"
        subtitle="Delivery and dispatch notes"
        action={
          canManage ? (
            <Link href="/dashboard/challans/new" className="btn btn-primary">
              + Create Challan
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
                  <th className="table-header">Challan Number</th>
                  <th className="table-header">Project</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Issue Date</th>
                  <th className="table-header">Expected Return</th>
                  <th className="table-header">Items Count</th>
                  <th className="table-header">Created By</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {challans.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      No challans found. Create your first challan to get started.
                    </td>
                  </tr>
                ) : (
                  challans.map((challan) => {
                    const statusStyles = {
                      DRAFT: "bg-gray-100 text-gray-800",
                      SENT: "bg-blue-100 text-blue-800",
                      RETURNED: "bg-green-100 text-green-800",
                      PARTIALLY_RETURNED: "bg-yellow-100 text-yellow-800",
                      CANCELLED: "bg-red-100 text-red-800",
                    };
                    
                    return (
                      <tr key={challan.id}>
                        <td className="table-cell font-mono font-semibold">
                          {challan.challanNumber}
                        </td>
                        <td className="table-cell">{challan.project.name}</td>
                        <td className="table-cell">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[challan.status as keyof typeof statusStyles]}`}>
                            {challan.status}
                          </span>
                        </td>
                        <td className="table-cell">
                          {new Date(challan.issueDate).toLocaleDateString()}
                        </td>
                      <td className="table-cell">
                        {challan.expectedReturnDate
                          ? new Date(
                              challan.expectedReturnDate
                            ).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="table-cell">{challan.items.length}</td>
                      <td className="table-cell">{challan.createdBy.name}</td>
                      <td className="table-cell">
                        <ChallanActions
                          challanId={challan.id}
                          challanNumber={challan.challanNumber}
                          status={challan.status}
                        />
                      </td>
                    </tr>
                  );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
