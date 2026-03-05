import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

// Sidebar width constant - change here to update everywhere
const SIDEBAR_WIDTH = "16rem"; // 256px = w-64

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  return (
    <div className="flex h-screen">
      <Sidebar userRole={session.user.role} />
      <div
        className="flex-1 overflow-auto bg-gray-50"
        style={{ marginLeft: SIDEBAR_WIDTH }}
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </div>
    </div>
  );
}

