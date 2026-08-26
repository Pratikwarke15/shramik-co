"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookingTracker } from "@/components/booking/BookingTracker";
import { Rating } from "@/components/ui/rating";
import { MapPlaceholder } from "@/components/ui/map-placeholder";
import { formatCurrency, formatDateTime, getStatusColor } from "@/lib/utils";
import type { Booking } from "@/lib/types";

const mockBooking: Booking = {
  id: "1",
  bookingRef: "CG-A1B2C3D4",
  consumerId: "u1",
  workerId: "w1",
  worker: { id: "w1", userId: "u1", user: { id: "u1", name: "Rajesh Kumar", phone: "9876543210", role: "WORKER", locale: "en", isActive: true, createdAt: "", updatedAt: "" }, status: "VERIFIED", skillTags: ["Plumbing"], experienceYears: 5, isAvailable: true, isOnDuty: true, avgRating: 4.8, totalJobs: 234, totalEarnings: 156000, walletBalance: 12000, kycStatus: "VERIFIED", aadhaarVerified: true },
  serviceId: "s1",
  service: { id: "s1", coopId: "c1", categoryName: "Plumbing", categorySlug: "plumbing", name: "Plumbing Repair", basePrice: 500, unit: "fixed", isActive: true },
  status: "EN_ROUTE",
  address: "123 MG Road, New Delhi",
  description: "Leaking kitchen pipe",
  quotedPrice: 500,
  commissionRate: 4,
  commissionAmount: 20,
  paymentStatus: "HELD_IN_ESCROW",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export default function BookingDetailPage() {
  const [booking] = useState(mockBooking);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Booking {booking.bookingRef}</h1>
          <p className="text-sm text-gray-500">{formatDateTime(booking.createdAt)}</p>
        </div>
        <Badge className={getStatusColor(booking.status)}>{booking.status.replace("_", " ")}</Badge>
      </div>

      <BookingTracker status={booking.status} />

      {booking.worker && (
        <Card>
          <CardHeader><CardTitle className="text-base">Your Worker</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-700">
                {booking.worker.user.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{booking.worker.user.name}</h4>
                <p className="text-sm text-gray-500">{booking.worker.skillTags.join(", ")}</p>
                <p className="text-xs text-gray-400">★ {booking.worker.avgRating} · {booking.worker.totalJobs} jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Booking Details</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Service</span><span>{booking.service?.name}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Address</span><span className="text-right max-w-[60%]">{booking.address}</span></div>
          {booking.description && <div className="flex justify-between"><span className="text-gray-500">Description</span><span className="text-right max-w-[60%]">{booking.description}</span></div>}
          <div className="flex justify-between"><span className="text-gray-500">Price</span><span className="font-bold">{formatCurrency(booking.quotedPrice)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Commission</span><span>{formatCurrency(booking.commissionAmount || 0)}</span></div>
        </CardContent>
      </Card>

      <MapPlaceholder lat={28.6139} lng={77.209} height="200px" />

      {booking.status === "COMPLETED" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Rate Your Experience</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Rating value={reviewRating} onChange={setReviewRating} size="lg" />
            <textarea
              placeholder="Share your feedback..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
            />
            <Button size="sm">Submit Review</Button>
          </CardContent>
        </Card>
      )}

      {["PENDING", "ACCEPTED"].includes(booking.status) && (
        <Button variant="danger" onClick={() => alert("Booking cancelled")}>Cancel Booking</Button>
      )}
    </div>
  );
}
