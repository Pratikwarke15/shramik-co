"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { Briefcase, DollarSign, Star, Clock, ShieldAlert, Loader2 } from "lucide-react";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import { apiGet, apiPatch } from "@/lib/api";
import { useToast } from "@/components/providers/ToastProvider";
import Link from "next/link";
import type { WorkerProfile, Booking } from "@/lib/types";

const ACTIVE_STATUSES = ["PENDING", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS"];

export default function WorkerDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [earnings, setEarnings] = useState<{ totalEarnings: number; monthlyEarnings: number; walletBalance: number; totalJobs: number; avgRating: number } | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [p, b, e] = await Promise.all([
        apiGet<{ success: boolean; data: WorkerProfile }>("/workers/profile"),
        apiGet<{ success: boolean; data: Booking[] }>("/bookings"),
        apiGet<{ success: boolean; data: any }>("/workers/earnings"),
      ]);
      if (p.success && p.data) setProfile(p.data);
      if (b.success) setBookings(b.data || []);
      if (e.success && e.data) setEarnings(e.data);
    } catch {
      toast({ title: "Failed to load dashboard", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleOnDuty = async (onDuty: boolean) => {
    if (!profile) return;
    const next = { isAvailable: onDuty, isOnDuty: onDuty };
    setProfile({ ...profile, ...next });
    try {
      const res = await apiPatch<{ success: boolean; error?: string }>("/workers/availability", next);
      if (!res.success) {
        toast({ title: res.error || "Could not update", variant: "danger" });
        setProfile((p) => (p ? { ...p, isAvailable: !onDuty, isOnDuty: !onDuty } : p));
      }
    } catch {
      toast({ title: "Could not update availability", variant: "danger" });
      setProfile((p) => (p ? { ...p, isAvailable: !onDuty, isOnDuty: !onDuty } : p));
    }
  };

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  }

  const activeJob = bookings.find((b) => ACTIVE_STATUSES.includes(b.status));
  const recentJobs = bookings.slice(0, 5);
  const jobsToday = bookings.filter((b) => {
    if (!b.createdAt) return false;
    const d = new Date(b.createdAt);
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const isOnDuty = profile?.isOnDuty ?? false;
  const rating = earnings?.avgRating ?? profile?.avgRating ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {profile?.status === "PENDING_ADMIN_APPROVAL" && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800">Your profile is under admin review</p>
            <p className="text-sm text-amber-600">
              You cannot accept jobs until a cooperative administrator approves your registration.
            </p>
          </div>
          <Link href="/worker/pending-approval" className="ml-auto shrink-0 text-sm font-medium text-amber-700 hover:underline">
            View status →
          </Link>
        </div>
      )}

      {profile?.status === "SUSPENDED" && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <ShieldAlert className="h-5 w-5 text-red-600" />
          <div>
            <p className="font-medium text-red-800">Your account has been suspended</p>
            <p className="text-sm text-red-600">Please contact your cooperative administrator.</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Worker Dashboard</h1>
          <p className="text-gray-500">Welcome back! Here&apos;s your overview.</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm">
          <span className="text-sm font-medium text-gray-700">On Duty</span>
          <Switch checked={isOnDuty} onCheckedChange={toggleOnDuty} />
          <Badge variant={isOnDuty ? "success" : "default"}>{isOnDuty ? "Online" : "Offline"}</Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={Briefcase} label="Jobs Today" value={jobsToday} color="indigo" />
        <StatsCard icon={DollarSign} label="Monthly Earnings" value={formatCurrency(earnings?.monthlyEarnings ?? 0)} color="emerald" />
        <StatsCard icon={Star} label="Avg Rating" value={rating ? rating.toFixed(1) : "—"} color="amber" />
        <StatsCard icon={Clock} label="Total Jobs" value={earnings?.totalJobs ?? 0} color="blue" />
      </div>

      {activeJob && (
        <Card className="border-indigo-200 bg-indigo-50/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base text-indigo-900">
              Active Job
              <Link href={`/worker/jobs`} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">Go to jobs →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{activeJob.service?.name || "Service"}</p>
                <p className="text-sm text-gray-500">{activeJob.consumer?.name ? `${activeJob.consumer.name} · ` : ""}{activeJob.address}</p>
                <p className="text-xs text-gray-400">{activeJob.bookingRef}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-indigo-600">{formatCurrency(activeJob.quotedPrice)}</p>
                <Badge className={getStatusColor(activeJob.status)}>{activeJob.status.replace("_", " ")}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Jobs</h2>
          <Link href="/worker/jobs" className="text-sm text-indigo-600 hover:text-indigo-500">View all</Link>
        </div>
        {recentJobs.length > 0 ? (
          <div className="space-y-2">
            {recentJobs.map((j) => (
              <div key={j.id} className="flex items-center justify-between rounded-xl border bg-white p-4">
                <div>
                  <p className="font-medium text-gray-900">{j.service?.name || "Service"}</p>
                  <p className="text-xs text-gray-400">{j.bookingRef}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(j.quotedPrice)}</p>
                  <Badge className={getStatusColor(j.status)}>{j.status.replace("_", " ")}</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border bg-white py-10 text-center text-gray-400">No jobs yet</div>
        )}
      </div>

      <RevenueChart title="Your Earnings" />
    </div>
  );
}
