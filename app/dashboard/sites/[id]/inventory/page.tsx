import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";
import SiteInventoryClient from "./SiteInventoryClient";

export default async function SiteInventoryPage({
  params,
}: {
  params: { id: string };
}) {
  const site = await prisma.site.findUnique({
    where: { id: params.id },
  });

  if (!site) {
    notFound();
  }

  const siteInventory = await prisma.siteInventory.findMany({
    where: { siteId: params.id },
    include: {
      item: {
        include: {
          category: true,
          subcategory: true,
          bundleTemplates: {
            include: {
              items: {
                include: {
                  item: {
                    select: {
                      id: true,
                      name: true,
                      componentType: true,
                      quantityAvailable: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      deployedDate: "desc",
    },
  });

  const summary = {
    totalItems: siteInventory.length,
    totalQuantity: siteInventory.reduce((sum, inv) => sum + inv.quantityDeployed, 0),
    currentlyDeployed: siteInventory.filter((inv) => !inv.actualReturnDate).length,
    returned: siteInventory.filter((inv) => inv.actualReturnDate).length,
    overdue: siteInventory.filter(
      (inv) =>
        !inv.actualReturnDate &&
        inv.expectedReturnDate &&
        new Date(inv.expectedReturnDate) < new Date()
    ).length,
  };

  return (
    <div>
      <Header
        title={`${site.name} - Inventory`}
        subtitle="Items deployed at this site"
        action={
          <Link href={`/dashboard/sites/${site.id}`} className="btn btn-secondary">
            ← Back to Site
          </Link>
        }
      />

      <div className="p-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="card">
            <p className="text-sm text-gray-600">Unique Items</p>
            <p className="text-2xl font-bold">{summary.totalItems}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Total Quantity</p>
            <p className="text-2xl font-bold">{summary.totalQuantity}</p>
          </div>
          <div className="card border-orange-200 bg-orange-50">
            <p className="text-sm text-orange-600">Currently Deployed</p>
            <p className="text-2xl font-bold text-orange-700">
              {summary.currentlyDeployed}
            </p>
          </div>
          <div className="card border-green-200 bg-green-50">
            <p className="text-sm text-green-600">Returned</p>
            <p className="text-2xl font-bold text-green-700">{summary.returned}</p>
          </div>
          <div className="card border-red-200 bg-red-50">
            <p className="text-sm text-red-600">Overdue Returns</p>
            <p className="text-2xl font-bold text-red-700">{summary.overdue}</p>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="card">
          {siteInventory.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Inventory Deployed
              </h3>
              <p className="text-gray-600">
                No items have been deployed to this site yet.
              </p>
            </div>
          ) : (
            <SiteInventoryClient siteInventory={siteInventory} />
          )}
        </div>
      </div>
    </div>
  );
}
