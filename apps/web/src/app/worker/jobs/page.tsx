"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime, getStatusColor } from "@/lib/utils";
import { apiGet, apiPatch } from "@/lib/api";
import { useToast } from "@/components/providers/ToastProvider";
import { MapPin, Phone, CheckCircle, XCircle, Navigation, Wrench, PlayCircle, Loader2 } from "lucide-react";
import type { Booking, BookingStatus } from "@/lib/types";

type TabFilter = "PENDING" | "ACTIVE" | "COMPLETED";

const tabs: { label: string; filter: TabFilter }[] = [
  { label: "New Requests", filter: "PENDING" },
  { label: "Active", filter: "ACTIVE" },
  { label: "Completed", filter: "COMPLETED" },
];

const ACTIVE_STATUSES: BookingStatus[] = ["ACCEPTED", "EN_ROUTE", "IN_PROGRESS"];

export default function WorkerJobsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabFilter>("PENDING");
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await apiGet<{ success: boolean; data: Booking[] }>("/bookings");
      if (res.success) setJobs(res.data || []);
    } catch {
      toast({ title: "Failed to load jobs", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const updateStatus = async (booking: Booking, status: BookingStatus) => {
    setBusyId(booking.id);
    try {
      const res = await apiPatch<{ success: boolean; error?: string }>(`/bookings/${booking.id}/status`, { status });
      if (res.success) {
        toast({ title: "Status updated", variant: "success" });
        fetchJobs();
      } else {
        toast({ title: res.error || "Could not update status", variant: "danger" });
      }
    } catch {
      toast({ title: "Could not update status", variant: "danger" });
    } finally {
      setBusyId(null);
    }
  };

  const filtered = jobs.filter((j) => {
    if (activeTab === "PENDING") return j.status === "PENDING";
    if (activeTab === "ACTIVE") return ACTIVE_STATUSES.includes(j.status);
    return j.status === "COMPLETED";
  });

  const pendingCount = jobs.filter((j) => j.status === "PENDING").length;

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
            {t.filter === "PENDING" && pendingCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((j) => (
            <div key={j.id} className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gray-400">{j.bookingRef}</span>
                    <Badge className={getStatusColor(j.status)}>{j.status.replace("_", " ")}</Badge>
                  </div>
                  <h4 className="mt-1 font-medium text-gray-900">{j.service?.name || "Service"}</h4>
                  <p className="text-sm text-gray-500">{j.consumer?.name}</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                    <MapPin className="h-3 w-3" /> {j.address}
                  </div>
                  {j.consumer?.phone && (
                    <a href={`tel:${j.consumer.phone}`} className="mt-1 inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                      <Phone className="h-3 w-3" /> {j.consumer.phone}
                    </a>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(j.quotedPrice)}</p>
                  <p className="text-xs text-gray-400">{formatDateTime(j.createdAt)}</p>
                  <p className="text-xs text-gray-400">Commission: {j.commissionRate}%</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2 border-t pt-3">
                {j.status === "PENDING" && (
                  <>
                    <Button size="sm" variant="secondary" loading={busyId === j.id} onClick={() => updateStatus(j, "ACCEPTED")}>
                      <CheckCircle className="mr-1 h-3 w-3" /> Accept
                    </Button>
                    <Button size="sm" variant="ghost" loading={busyId === j.id} onClick={() => updateStatus(j, "CANCELLED")}>
                      <XCircle className="mr-1 h-3 w-3 text-red-500" /> Decline
                    </Button>
                  </>
                )}
                {j.status === "ACCEPTED" && (
                  <Button size="sm" variant="outline" loading={busyId === j.id} onClick={() => updateStatus(j, "EN_ROUTE")}>
                    <Navigation className="mr-1 h-3 w-3" /> Start (En Route)
                  </Button>
                )}
                {j.status === "EN_ROUTE" && (
                  <Button size="sm" variant="outline" loading={busyId === j.id} onClick={() => updateStatus(j, "IN_PROGRESS")}>
                    <Wrench className="mr-1 h-3 w-3" /> Mark In Progress
                  </Button>
                )}
                {j.status === "IN_PROGRESS" && (
                  <Button size="sm" variant="secondary" loading={busyId === j.id} onClick={() => updateStatus(j, "COMPLETED")}>
                    <PlayCircle className="mr-1 h-3 w-3" /> Complete Job
                  </Button>
                )}
                {j.status === "COMPLETED" && (
                  <Badge variant="success">Paid {formatCurrency((j.workerPayout ?? j.quotedPrice))}</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-white py-16 text-center">
          <p className="text-gray-400">No {activeTab.toLowerCase()} jobs</p>
        </div>
      )}
    </div>
  );
}
