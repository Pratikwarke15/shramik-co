"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Handshake,
  Home,
  CalendarCheck,
  Wallet,
  Briefcase,
  DollarSign,
  LayoutDashboard,
  Users,
  Settings,
  BarChart3,
  Gavel,
  Coins,
  Building2,
  Menu,
  X,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
import { Avatar, AvatarFallback } from "@radix-ui/react-avatar";

const navConfig = {
  CONSUMER: [
    { href: "/consumer/dashboard", label: "Home", icon: Home },
    { href: "/consumer/book", label: "Book Service", icon: CalendarCheck },
    { href: "/consumer/bookings", label: "My Bookings", icon: Briefcase },
    { href: "/consumer/wallet", label: "Wallet", icon: Wallet },
  ],
  WORKER: [
    { href: "/worker/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/worker/jobs", label: "My Jobs", icon: Briefcase },
    { href: "/worker/earnings", label: "Earnings", icon: DollarSign },
  ],
  COOP_ADMIN: [
    { href: "/coop-admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/coop-admin/workers", label: "Workers", icon: Users },
    { href: "/coop-admin/services", label: "Services", icon: Settings },
    { href: "/coop-admin/disputes", label: "Disputes", icon: Gavel },
    { href: "/coop-admin/dividends", label: "Dividends", icon: Coins },
  ],
  MINISTRY_SUPER_ADMIN: [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/workers", label: "Worker Verification", icon: Gavel },
    { href: "/admin/coops", label: "Co-ops", icon: Building2 },
  ],
};

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    setMobileOpen(false);
    try {
      logout();
    } finally {
      // Full-page navigation to a clean entry point wipes every in-memory
      // piece of the previous session (Zustand, React Query, singletons).
      // location.replace() also replaces the history entry so the Back button
      // cannot return to the protected page and resurrect the session.
      window.location.replace("/login");
    }
  };

  const links = user ? navConfig[user.role] || [] : [];

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!isAuthenticated) {
    return (
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Handshake className="h-7 w-7 text-indigo-600" />
            <span className="text-xl font-bold text-gray-900 font-heading">Shramik Co</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <Handshake className="h-7 w-7 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900 font-heading">Shramik Co</span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {links.map((link) => {
                const Icon = link.icon;
                const active = pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSelector />
            <div className="relative hidden md:block">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-gray-50"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="flex h-full w-full items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-700">
                    {user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-gray-700">{user?.name}</span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border bg-white py-1 shadow-lg animate-fade-in">
                    <div className="border-b px-4 py-2">
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.role?.replace("_", " ")}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              className="md:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t bg-white md:hidden animate-fade-in">
          <div className="space-y-1 px-4 py-3">
            {links.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                    active ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-5 w-5" />
              Log out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
