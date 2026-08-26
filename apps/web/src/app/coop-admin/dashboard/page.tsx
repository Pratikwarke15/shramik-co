"use client";

import { StatsCard } from "@/components/dashboard/StatsCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { WorkerGrid } from "@/components/dashboard/WorkerGrid";
import { Users, Briefcase, DollarSign, Percent } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { WorkerProfile } from "@/lib/types";

const mockWorkers: WorkerProfile[] = [
  { id: "w1", userId: "u1", user: { id: "u1", name: "Rajesh Kumar", phone: "9876543210", role: "WORKER", locale: "en", isActive: true, createdAt: "", updatedAt: "" }, status: "VERIFIED", skillTags: ["Plumbing", "AC Repair"], experienceYears: 5, isAvailable: true, isOnDuty: true, avgRating: 4.8, totalJobs: 234, totalEarnings: 156000, walletBalance: 12000, kycStatus: "VERIFIED", aadhaarVerified: true },
  { id: "w2", userId: "u2", user: { id: "u2", name: "Priya Devi", phone: "9876543211", role: "WORKER", locale: "en", isActive: true, createdAt: "", updatedAt: "" }, status: "PENDING_VERIFICATION", skillTags: ["Cleaning", "Carpentry"], experienceYears: 3, isAvailable: true, isOnDuty: true, avgRating: 4.6, totalJobs: 156, totalEarnings: 89000, walletBalance: 8000, kycStatus: "PENDING", aadhaarVerified: false },
  { id: "w3", userId: "u3", user: { id: "u3", name: "Suresh Patel", phone: "9876543212", role: "WORKER", locale: "en", isActive: true, createdAt: "", updatedAt: "" }, status: "VERIFIED", skillTags: ["Electrical", "Plumbing"], experienceYears: 7, isAvailable: false, isOnDuty: false, avgRating: 4.9, totalJobs: 412, totalEarnings: 298000, walletBalance: 34000, kycStatus: "VERIFIED", aadhaarVerified: true },
  { id: "w4", userId: "u4", user: { id: "u4", name: "Meena Kumari", phone: "9876543213", role: "WORKER", locale: "en", isActive: true, createdAt: "", updatedAt: "" }, status: "VERIFIED", skillTags: ["Cleaning"], experienceYears: 2, isAvailable: true, isOnDuty: true, avgRating: 4.4, totalJobs: 89, totalEarnings: 45000, walletBalance: 5000, kycStatus: "VERIFIED", aadhaarVerified: true },
  { id: "w5", userId: "u5", user: { id: "u5", name: "Anil Yadav", phone: "9876543214", role: "WORKER", locale: "en", isActive: true, createdAt: "", updatedAt: "" }, status: "VERIFIED", skillTags: ["Transport", "Carpentry"], experienceYears: 4, isAvailable: true, isOnDuty: false, avgRating: 4.7, totalJobs: 198, totalEarnings: 123000, walletBalance: 15000, kycStatus: "VERIFIED", aadhaarVerified: true },
  { id: "w6", userId: "u6", user: { id: "u6", name: "Deepa Nair", phone: "9876543215", role: "WORKER", locale: "en", isActive: true, createdAt: "", updatedAt: "" }, status: "VERIFIED", skillTags: ["Painting", "Cleaning"], experienceYears: 6, isAvailable: true, isOnDuty: true, avgRating: 4.9, totalJobs: 310, totalEarnings: 189000, walletBalance: 22000, kycStatus: "VERIFIED", aadhaarVerified: true },
];

const recentBookings = [
  { ref: "CG-X1Y2Z3W4", service: "Plumbing Repair", worker: "Rajesh K.", amount: 500, status: "COMPLETED" },
  { ref: "CG-A1B2C3D4", service: "House Cleaning", worker: "Priya D.", amount: 350, status: "IN_PROGRESS" },
  { ref: "CG-E5F6G7H8", service: "Electrical Work", worker: "Suresh P.", amount: 400, status: "PENDING" },
];

export default function CoopAdminDashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-heading">Co-op Dashboard</h1>
        <p className="text-gray-500">Sunrise Workers Cooperative</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={Users} label="Total Workers" value={48} color="indigo" trend={{ value: 5, isUp: true }} />
        <StatsCard icon={Briefcase} label="Active Bookings" value={12} color="blue" trend={{ value: 18, isUp: true }} />
        <StatsCard icon={DollarSign} label="Revenue (This Month)" value={formatCurrency(102000)} color="emerald" trend={{ value: 12, isUp: true }} />
        <StatsCard icon={Percent} label="Commission Rate" value="4%" color="amber" />
      </div>

      <RevenueChart />

      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Workers</h2>
        <WorkerGrid
          workers={mockWorkers}
          onVerify={(id) => alert(`Verifying worker ${id}`)}
          onSuspend={(id) => alert(`Suspending worker ${id}`)}
          onMessage={(id) => alert(`Message worker ${id}`)}
        />
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-6 py-3 font-medium text-gray-600">Ref</th>
              <th className="px-6 py-3 font-medium text-gray-600">Service</th>
              <th className="px-6 py-3 font-medium text-gray-600">Worker</th>
              <th className="px-6 py-3 font-medium text-gray-600">Amount</th>
              <th className="px-6 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {recentBookings.map((b) => (
              <tr key={b.ref} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3 font-mono text-xs">{b.ref}</td>
                <td className="px-6 py-3">{b.service}</td>
                <td className="px-6 py-3">{b.worker}</td>
                <td className="px-6 py-3 font-medium">{formatCurrency(b.amount)}</td>
                <td className="px-6 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    b.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" :
                    b.status === "IN_PROGRESS" ? "bg-indigo-100 text-indigo-800" :
                    "bg-amber-100 text-amber-800"
                  }`}>{b.status.replace("_", " ")}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
