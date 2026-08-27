"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, CreditCard, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiGet } from "@/lib/api";
import { formatCurrency, formatDateTime, getStatusColor } from "@/lib/utils";
import Link from "next/link";
import type { Booking } from "@/lib/types";

export default function ConsumerWalletPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await apiGet<{ success: boolean; data: Booking[] }>("/bookings");
      if (res.success) setBookings(res.data || []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const totalPaid = bookings
    .filter((b) => b.paymentStatus === "COMPLETED" || b.paymentStatus === "HELD_IN_ESCROW")
    .reduce((sum, b) => sum + (b.quotedPrice || 0), 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 font-heading">My Payments</h1>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 text-white">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="h-5 w-5 opacity-80" />
            <span className="text-sm opacity-80">Total Paid for Services</span>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(totalPaid)}</p>
          <p className="mt-2 text-xs opacity-80">{bookings.length} bookings</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
      ) : bookings.length > 0 ? (
        <div className="rounded-xl border bg-white divide-y shadow-sm">
          <div className="px-4 py-3"><h4 className="text-sm font-medium text-gray-900">Recent Payments</h4></div>
          {bookings.slice(0, 10).map((b) => (
            <Link key={b.id} href={`/consumer/bookings/${b.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{b.service?.name || "Service"}</p>
                  <p className="text-xs text-gray-400">{b.bookingRef} · {formatDateTime(b.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-right">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(b.quotedPrice)}</p>
                  <Badge className={getStatusColor(b.paymentStatus)}>{b.paymentStatus.replace("_", " ")}</Badge>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-white py-16 text-center">
          <p className="text-gray-400">No payments yet</p>
          <Link href="/consumer/book" className="mt-2 inline-block text-sm text-indigo-600 hover:underline">Book a service</Link>
        </div>
      )}
    </div>
  );
}
