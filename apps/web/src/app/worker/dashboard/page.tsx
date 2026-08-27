"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { Briefcase, DollarSign, Star, Clock, ShieldAlert } from "lucide-react";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import { apiGet } from "@/lib/api";
import Link from "next/link";

const mockActiveJob = {
  id: "1",
  bookingRef: "CG-X1Y2Z3",
  service: { name: "Plumbing Repair" },
  consumer: { name: "Amit Sharma" },
  address: "45 Park Lane, Delhi",
  quotedPrice: 500,
  status: "ACCEPTED" as const,
};

const recentJobs = [
  { id: "2", bookingRef: "CG-A1B2C3D4", service: { name: "Electrical Work" }, status: "COMPLETED" as const, quotedPrice: 350, createdAt: new Date(Date.now() - 86400000).toISOString(), address: "123 Main St", paymentStatus: "COMPLETED" as const, commissionRate: 4 },
  { id: "3", bookingRef: "CG-B2C3D4E5", service: { name: "House Cleaning" }, status: "COMPLETED" as const, quotedPrice: 300, createdAt: new Date(Date.now() - 172800000).toISOString(), address: "78 Oak Ave", paymentStatus: "COMPLETED" as const, commissionRate: 4 },
];

export default function WorkerDashboard() {
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ success: boolean; data: any }>("/workers/profile")
      .then((res) => {
        if (res.success && res.data) setApprovalStatus(res.data.status);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {approvalStatus === "PENDING_ADMIN_APPROVAL" && (
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Worker Dashboard</h1>
          <p className="text-gray-500">Welcome back! Here&apos;s your overview.</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm">
          <span className="text-sm font-medium text-gray-700">On Duty</span>
          <Switch checked={isOnDuty} onCheckedChange={setIsOnDuty} />
          <Badge variant={isOnDuty ? "success" : "default"}>{isOnDuty ? "Online" : "Offline"}</Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={Briefcase} label="Jobs Today" value={3} color="indigo" trend={{ value: 15, isUp: true }} />
        <StatsCard icon={DollarSign} label="Earnings Today" value={formatCurrency(1250)} color="emerald" trend={{ value: 8, isUp: true }} />
        <StatsCard icon={Star} label="Avg Rating" value="4.8" color="amber" />
        <StatsCard icon={Clock} label="Hours Active" value="6.5" color="blue" />
      </div>

      {mockActiveJob && (
        <Card className="border-indigo-200 bg-indigo-50/50">
          <CardHeader><CardTitle className="text-base text-indigo-900">Active Job</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{mockActiveJob.service.name}</p>
                <p className="text-sm text-gray-500">{mockActiveJob.consumer.name} · {mockActiveJob.address}</p>
                <p className="text-xs text-gray-400">{mockActiveJob.bookingRef}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-indigo-600">{formatCurrency(mockActiveJob.quotedPrice)}</p>
                <Badge className={getStatusColor(mockActiveJob.status)}>{mockActiveJob.status}</Badge>
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
        <div className="space-y-2">
          {recentJobs.map((j) => (
            <div key={j.id} className="flex items-center justify-between rounded-xl border bg-white p-4">
              <div>
                <p className="font-medium text-gray-900">{j.service.name}</p>
                <p className="text-xs text-gray-400">{j.bookingRef}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{formatCurrency(j.quotedPrice)}</p>
                <Badge className={getStatusColor(j.status)}>{j.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      <RevenueChart title="Your Earnings" />
    </div>
  );
}
