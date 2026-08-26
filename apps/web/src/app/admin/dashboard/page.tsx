"use client";

import { StatsCard } from "@/components/dashboard/StatsCard";
import { Users, Building2, Briefcase, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const mockCoops = [
  { id: "c1", name: "Sunrise Workers Cooperative", city: "Delhi", state: "Delhi", workers: 48, revenue: 102000, isActive: true },
  { id: "c2", name: "Mumbai Gig Workers Union", city: "Mumbai", state: "Maharashtra", workers: 35, revenue: 78000, isActive: true },
  { id: "c3", name: "Bangalore Service Collective", city: "Bangalore", state: "Karnataka", workers: 28, revenue: 65000, isActive: true },
  { id: "c4", name: "Chennai Workers Alliance", city: "Chennai", state: "Tamil Nadu", workers: 22, revenue: 45000, isActive: false },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Ministry Dashboard</h1>
          <p className="text-gray-500">Nationwide cooperative overview</p>
        </div>
        <Button><Plus className="mr-1 h-4 w-4" /> Register New Co-op</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={Building2} label="Total Co-ops" value={4} color="indigo" />
        <StatsCard icon={Users} label="Total Workers" value={133} color="emerald" trend={{ value: 8, isUp: true }} />
        <StatsCard icon={Briefcase} label="Total Bookings" value="2,847" color="blue" trend={{ value: 15, isUp: true }} />
        <StatsCard icon={DollarSign} label="Platform Revenue" value={formatCurrency(290000)} color="amber" trend={{ value: 12, isUp: true }} />
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Registered Co-operatives</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-6 py-3 font-medium text-gray-600">Name</th>
              <th className="px-6 py-3 font-medium text-gray-600">City</th>
              <th className="px-6 py-3 font-medium text-gray-600">Workers</th>
              <th className="px-6 py-3 font-medium text-gray-600">Revenue</th>
              <th className="px-6 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {mockCoops.map((c) => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3 font-medium text-gray-900">{c.name}</td>
                <td className="px-6 py-3 text-gray-500">{c.city}, {c.state}</td>
                <td className="px-6 py-3">{c.workers}</td>
                <td className="px-6 py-3 font-medium">{formatCurrency(c.revenue)}</td>
                <td className="px-6 py-3">
                  <Badge variant={c.isActive ? "success" : "default"}>{c.isActive ? "Active" : "Inactive"}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
