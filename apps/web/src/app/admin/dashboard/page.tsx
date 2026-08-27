"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Users, Building2, Briefcase, DollarSign, UserX, Clock } from "lucide-react";
import { apiGet } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type AdminStats = {
  totalCoops: number;
  totalWorkers: number;
  verifiedWorkers: number;
  pendingWorkers: number;
  suspendedWorkers: number;
  totalConsumers: number;
  totalBookings: number;
  platformRevenue: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiGet<{ success: boolean; data: AdminStats }>("/admin/stats");
      if (res.success) setStats(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading ministry stats...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Ministry Dashboard</h1>
          <p className="text-gray-500">Nationwide cooperative overview</p>
        </div>
        <Link href="/admin/coops">
          <Button><Building2 className="mr-1 h-4 w-4" /> Manage Co-ops</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={Building2} label="Total Co-ops" value={stats?.totalCoops ?? 0} color="indigo" />
        <StatsCard icon={Users} label="Total Workers" value={stats?.totalWorkers ?? 0} color="emerald" />
        <StatsCard icon={Briefcase} label="Total Bookings" value={stats?.totalBookings ?? 0} color="blue" />
        <StatsCard icon={DollarSign} label="Platform Revenue" value={formatCurrency(stats?.platformRevenue ?? 0)} color="amber" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard icon={Clock} label="Pending Approval" value={stats?.pendingWorkers ?? 0} color="amber" />
        <StatsCard icon={Users} label="Verified Workers" value={stats?.verifiedWorkers ?? 0} color="emerald" />
        <StatsCard icon={UserX} label="Suspended Workers" value={stats?.suspendedWorkers ?? 0} color="red" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Worker Verification Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {(stats?.pendingWorkers ?? 0) > 0 ? (
            <Link href="/admin/workers">
              <Button>Review {stats?.pendingWorkers} pending workers</Button>
            </Link>
          ) : (
            <p className="text-sm text-gray-500">No workers awaiting approval.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}