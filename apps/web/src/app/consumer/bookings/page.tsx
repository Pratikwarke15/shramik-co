"use client";

import { useState } from "react";
import { BookingCard } from "@/components/booking/BookingCard";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/lib/types";

const mockBookings = [
  { id: "1", bookingRef: "CG-A1B2C3D4", service: { name: "Plumbing Repair" }, worker: { user: { name: "Rajesh K." } }, status: "IN_PROGRESS" as const, quotedPrice: 500, createdAt: new Date().toISOString(), address: "123 Main St", paymentStatus: "HELD_IN_ESCROW" as const, commissionRate: 4 },
  { id: "2", bookingRef: "CG-E5F6G7H8", service: { name: "House Cleaning" }, worker: { user: { name: "Priya D." } }, status: "COMPLETED" as const, quotedPrice: 350, rating: 5, createdAt: new Date(Date.now() - 86400000).toISOString(), address: "456 Oak Ave", paymentStatus: "COMPLETED" as const, commissionRate: 4 },
  { id: "3", bookingRef: "CG-I9J0K1L2", service: { name: "Electrical Work" }, status: "PENDING" as const, quotedPrice: 400, createdAt: new Date(Date.now() - 172800000).toISOString(), address: "789 Pine Rd", paymentStatus: "PENDING" as const, commissionRate: 4 },
];

const tabs: { label: string; filter: BookingStatus | "ALL" }[] = [
  { label: "All", filter: "ALL" },
  { label: "Active", filter: "PENDING" },
  { label: "Completed", filter: "COMPLETED" },
  { label: "Cancelled", filter: "CANCELLED" },
];

export default function BookingsPage() {
  const [activeTab, setActiveTab] = useState<"ALL" | BookingStatus>("ALL");

  const filtered = mockBookings.filter((b) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "PENDING") return ["PENDING", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS"].includes(b.status);
    return b.status === activeTab;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 font-heading">My Bookings</h1>

      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.label}
            onClick={() => setActiveTab(t.filter)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              activeTab === t.filter
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((b) => <BookingCard key={b.id} booking={b as any} />)
        ) : (
          <div className="rounded-xl border bg-white py-16 text-center">
            <p className="text-gray-400">No bookings found</p>
          </div>
        )}
      </div>
    </div>
  );
}
