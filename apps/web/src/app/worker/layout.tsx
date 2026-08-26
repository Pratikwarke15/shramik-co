import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { LayoutDashboard, Users, Settings, Gavel, Coins } from "lucide-react";
import type { SidebarLink } from "@/components/layout/Sidebar";

const sidebarLinks: SidebarLink[] = [
  { href: "/worker/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/worker/jobs", label: "My Jobs", icon: Users },
  { href: "/worker/earnings", label: "Earnings", icon: Coins },
  { href: "/worker/profile", label: "Profile", icon: Settings },
];

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar links={sidebarLinks} />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
