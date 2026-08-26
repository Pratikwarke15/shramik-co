"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CalendarCheck, Briefcase, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent } from "@/components/ui/card";
import { BookingCard } from "@/components/booking/BookingCard";

const mockBookings = [
  { id: "1", bookingRef: "CG-A1B2C3D4", service: { name: "Plumbing Repair" }, worker: { user: { name: "Rajesh K." } }, status: "IN_PROGRESS" as const, quotedPrice: 500, createdAt: new Date().toISOString(), address: "123 Main St", paymentStatus: "HELD_IN_ESCROW" as const, commissionRate: 4 },
  { id: "2", bookingRef: "CG-E5F6G7H8", service: { name: "House Cleaning" }, status: "COMPLETED" as const, quotedPrice: 350, createdAt: new Date(Date.now() - 86400000).toISOString(), address: "456 Oak Ave", paymentStatus: "COMPLETED" as const, commissionRate: 4 },
];

export default function ConsumerDashboard() {
  const { user } = useAuth();
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-heading">Welcome, {user?.name || "Guest"} 👋</h1>
        <p className="text-gray-500">What would you like to do today?</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/consumer/book">
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100">
                <CalendarCheck className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Book a Service</h3>
                <p className="text-sm text-gray-500">Find and hire local workers</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-600" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/consumer/bookings">
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100">
                <Briefcase className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">View Bookings</h3>
                <p className="text-sm text-gray-500">Track your service history</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-emerald-600" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
          <Link href="/consumer/bookings" className="text-sm text-indigo-600 hover:text-indigo-500">View all</Link>
        </div>
        <div className="space-y-3">
          {mockBookings.map((b) => (
            <BookingCard key={b.id} booking={b as any} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Active Booking</h2>
        <Card className="border-indigo-200 bg-indigo-50/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-indigo-600 animate-pulse" />
              <span className="font-medium text-indigo-900">Plumbing Repair — Worker en route</span>
            </div>
            <p className="mt-2 text-sm text-indigo-700">Estimated arrival: 12 minutes</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
