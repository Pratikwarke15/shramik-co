"use client";

import { useState, useCallback, useEffect } from "react";
import { BookingCard } from "@/components/booking/BookingCard";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiGet, apiPost } from "@/lib/api";
import { useToast } from "@/components/providers/ToastProvider";
import type { Booking, BookingStatus } from "@/lib/types";

const tabs: { label: string; filter: BookingStatus | "ALL" }[] = [
  { label: "All", filter: "ALL" },
  { label: "Active", filter: "PENDING" },
  { label: "Completed", filter: "COMPLETED" },
  { label: "Cancelled", filter: "CANCELLED" },
];

export default function BookingsPage() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | BookingStatus>("ALL");

  const fetchBookings = useCallback(async () => {
    try {
      const res = await apiGet<{ success: boolean; data: Booking[] }>("/bookings");
      if (res.success) setBookings(res.data || []);
    } catch {
      toast({ title: "Failed to load bookings", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleCancel = async (id: string) => {
    try {
      const res = await apiPost<{ success: boolean; error?: string }>(`/bookings/${id}/cancel`, { reason: "Cancelled by consumer" });
      if (res.success) {
        toast({ title: "Booking cancelled", variant: "success" });
        fetchBookings();
      } else {
        toast({ title: res.error || "Could not cancel", variant: "danger" });
      }
    } catch {
      toast({ title: "Could not cancel booking", variant: "danger" });
    }
  };

  const filtered = bookings.filter((b) => {
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

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((b) => <BookingCard key={b.id} booking={b} onCancel={handleCancel} />)}
        </div>
      ) : (
        <div className="rounded-xl border bg-white py-16 text-center">
          <p className="text-gray-400">No bookings found</p>
        </div>
      )}
    </div>
  );
}
