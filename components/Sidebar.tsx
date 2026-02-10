"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@prisma/client";
import { signOut } from "next-auth/react";

interface SidebarProps {
  userRole: UserRole;
}

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname?.startsWith(path);

  const canManage = userRole === "ADMIN" || userRole === "INVENTORY_MANAGER";
  const isAdmin = userRole === "ADMIN";

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: "📊",
      show: true,
    },
    {
      label: "Inventory",
      href: "/dashboard/inventory",
      icon: "📦",
      show: true,
    },
    {
      label: "Sites",
      href: "/dashboard/sites",
      icon: "📍",
      show: true,
    },
    {
      label: "Projects",
      href: "/dashboard/projects",
      icon: "🎯",
      show: true,
    },
    {
      label: "Stock Movements",
      href: "/dashboard/stock-movements",
      icon: "🔄",
      show: canManage,
    },
    {
      label: "Purchase Orders",
      href: "/dashboard/purchase-orders",
      icon: "📦",
      show: canManage,
    },
    {
      label: "Repairs",
      href: "/dashboard/repairs",
      icon: "🔧",
      show: canManage,
    },
    {
      label: "Scrap",
      href: "/dashboard/scrap",
      icon: "♻️",
      show: canManage,
    },
    {
      label: "Labour",
      href: "/dashboard/labour",
      icon: "👷",
      show: canManage,
    },
    {
      label: "Attendance Mgmt",
      href: "/dashboard/attendance-management",
      icon: "📅",
      show: canManage,
    },
    {
      label: "Challans",
      href: "/dashboard/challans",
      icon: "📋",
      show: true,
    },
    {
      label: "Reports",
      href: "/dashboard/reports",
      icon: "📈",
      show: true,
    },
    {
      label: "Users",
      href: "/dashboard/users",
      icon: "👥",
      show: isAdmin,
    },
    {
      label: "Settings",
      href: "/dashboard/settings",
      icon: "⚙️",
      show: isAdmin,
    },
  ];

  return (
    <div className="h-screen w-64 bg-gray-900 text-white flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">Inventory CRM</h1>
        <p className="text-xs text-gray-400 mt-1">Event Management</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {navItems
          .filter((item) => item.show)
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-6 py-3 text-sm transition-colors ${isActive(item.href)
                  ? "bg-primary-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </Link>
          ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className="w-full btn bg-gray-800 text-white hover:bg-gray-700 text-sm"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
