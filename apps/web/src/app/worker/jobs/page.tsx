"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime, getStatusColor } from "@/lib/utils";
import { MapPin, Phone, CheckCircle, XCircle, Navigation } from "lucide-react";
import type { BookingStatus } from "@/lib/types";

const mockJobs = [
  { id: "1", bookingRef: "CG-X1Y2Z3", service: { name: "Plumbing Repair" }, consumer: { name: "Amit Sharma", phone: "9876543210" }, address: "45 Park Lane, Delhi", quotedPrice: 500, status: "ACCEPTED" as const, createdAt: new Date().toISOString(), paymentStatus: "HELD_IN_ESCROW" as const, commissionRate: 4 },
  { id: "2", bookingRef: "CG-PENDING1", service: { name: "AC Repair" }, consumer: { name: "Neha Gupta" }, address: "67 MG Road, Delhi", quotedPrice: 600, status: "PENDING" as const, createdAt: new Date(Date.now() - 600000).toISOString(), paymentStatus: "PENDING" as const, commissionRate: 4 },
  { id: "3", bookingRef: "CG-PENDING2", service: { name: "Electrical Work" }, consumer: { name: "Vikram Singh" }, address: "89 Civil Lines, Delhi", quotedPrice: 400, status: "PENDING" as const, createdAt: new Date(Date.now() - 900000).toISOString(), paymentStatus: "PENDING" as const, commissionRate: 4 },
  { id: "4", bookingRef: "CG-A1B2C3D4", service: { name: "House Cleaning" }, consumer: { name: "Priya Verma" }, address: "12 Sector 5, Delhi", quotedPrice: 300, status: "COMPLETED" as const, createdAt: new Date(Date.now() - 86400000).toISOString(), paymentStatus: "COMPLETED" as const, commissionRate: 4 },
];

type TabFilter = "PENDING" | "ACTIVE" | "COMPLETED";

const tabs: { label: string; filter: TabFilter }[] = [
  { label: "New Requests", filter: "PENDING" },
  { label: "Active", filter: "ACTIVE" },
  { label: "Completed", filter: "COMPLETED" },
];

export default function WorkerJobsPage() {
  const [activeTab, setActiveTab] = useState<TabFilter>("PENDING");

  const filtered = mockJobs.filter((j) => {
    if (activeTab === "PENDING") return j.status === "PENDING";
    if (activeTab === "ACTIVE") return ["ACCEPTED", "EN_ROUTE", "IN_PROGRESS"].includes(j.status);
    return j.status === "COMPLETED";
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 font-heading">My Jobs</h1>

      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.label}
            onClick={() => setActiveTab(t.filter)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              activeTab === t.filter ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {t.label}
            {t.filter === "PENDING" && (
              <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] text-white">
                {mockJobs.filter((j) => j.status === "PENDING").length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((j) => (
            <div key={j.id} className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gray-400">{j.bookingRef}</span>
                    <Badge className={getStatusColor(j.status)}>{j.status.replace("_", " ")}</Badge>
                  </div>
                  <h4 className="mt-1 font-medium text-gray-900">{j.service.name}</h4>
                  <p className="text-sm text-gray-500">{j.consumer.name}</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                    <MapPin className="h-3 w-3" /> {j.address}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(j.quotedPrice)}</p>
                  <p className="text-xs text-gray-400">{formatDateTime(j.createdAt)}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2 border-t pt-3">
                {j.status === "PENDING" && (
                  <>
                    <Button size="sm" variant="secondary">
                      <CheckCircle className="mr-1 h-3 w-3" /> Accept
                    </Button>
                    <Button size="sm" variant="ghost">
                      <XCircle className="mr-1 h-3 w-3 text-red-500" /> Decline
                    </Button>
                  </>
                )}
                {["ACCEPTED", "EN_ROUTE"].includes(j.status) && (
                  <Button size="sm" variant="outline">
                    <Navigation className="mr-1 h-3 w-3" /> Navigate
                  </Button>
                )}
                {j.status === "COMPLETED" && (
                  <Badge variant="success">Paid {formatCurrency(j.quotedPrice * 0.96)}</Badge>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border bg-white py-16 text-center">
            <p className="text-gray-400">No {activeTab.toLowerCase()} jobs</p>
          </div>
        )}
      </div>
    </div>
  );
}
