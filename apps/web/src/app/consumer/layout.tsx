"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { LayoutDashboard, CalendarCheck, Briefcase, Wallet } from "lucide-react";
import type { SidebarLink } from "@/components/layout/Sidebar";

const sidebarLinks: SidebarLink[] = [
  { href: "/consumer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/consumer/book", label: "Book Service", icon: CalendarCheck },
  { href: "/consumer/bookings", label: "My Bookings", icon: Briefcase },
  { href: "/consumer/wallet", label: "Wallet", icon: Wallet },
];

export default function ConsumerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["CONSUMER"]}>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <Sidebar links={sidebarLinks} />
          <main className="flex-1 p-8">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
