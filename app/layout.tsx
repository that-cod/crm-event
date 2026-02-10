import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { setupPrismaMiddleware } from "@/lib/prisma-middleware";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

// Initialize Prisma middleware on app startup
if (typeof window === 'undefined') {
  setupPrismaMiddleware();
}

export const metadata: Metadata = {
  title: "Inventory CRM - Event Management",
  description: "Inventory Management System for Tent and Events Company",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
