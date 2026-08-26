"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStatusColor, formatCurrency, formatDateTime } from "@/lib/utils";
import type { Booking } from "@/lib/types";
import Link from "next/link";

interface BookingCardProps {
  booking: Booking;
  onCancel?: (id: string) => void;
}

export function BookingCard({ booking, onCancel }: BookingCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-gray-900">{booking.bookingRef}</span>
            <Badge className={getStatusColor(booking.status)}>{booking.status.replace("_", " ")}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-600">{booking.service?.name || "Service"}</p>
          {booking.worker && (
            <p className="text-xs text-gray-500">
              Worker: {booking.worker.user?.name || "Assigned"}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">{formatCurrency(booking.quotedPrice)}</p>
          <p className="text-xs text-gray-400">{formatDateTime(booking.createdAt)}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {["PENDING", "ACCEPTED"].includes(booking.status) && (
          <Link href={`/bookings/${booking.id}`}>
            <Button size="sm" variant="outline">Track</Button>
          </Link>
        )}
        {["PENDING", "ACCEPTED"].includes(booking.status) && onCancel && (
          <Button size="sm" variant="danger" onClick={() => onCancel(booking.id)}>
            Cancel
          </Button>
        )}
        {booking.status === "COMPLETED" && !booking.rating && (
          <Link href={`/bookings/${booking.id}`}>
            <Button size="sm" variant="secondary">Rate</Button>
          </Link>
        )}
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-auto flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          Details
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-2 border-t pt-4 text-sm text-gray-600 animate-fade-in">
          <div className="flex justify-between">
            <span>Address</span>
            <span className="text-right max-w-[60%]">{booking.address}</span>
          </div>
          {booking.description && (
            <div className="flex justify-between">
              <span>Notes</span>
              <span className="text-right max-w-[60%]">{booking.description}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Payment Status</span>
            <Badge className={getStatusColor(booking.paymentStatus)}>{booking.paymentStatus.replace("_", " ")}</Badge>
          </div>
          {booking.commissionAmount != null && (
            <div className="flex justify-between">
              <span>Commission ({booking.commissionRate}%)</span>
              <span>{formatCurrency(booking.commissionAmount)}</span>
            </div>
          )}
          {booking.cancelReason && (
            <div className="flex justify-between">
              <span>Cancellation Reason</span>
              <span className="text-right max-w-[60%]">{booking.cancelReason}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
