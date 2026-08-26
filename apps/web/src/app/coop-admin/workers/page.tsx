"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getStatusColor } from "@/lib/utils";
import { Search, Eye, CheckCircle, Ban } from "lucide-react";
import type { WorkerProfile } from "@/lib/types";

const mockWorkers: WorkerProfile[] = [
  { id: "w1", userId: "u1", user: { id: "u1", name: "Rajesh Kumar", phone: "9876543210", role: "WORKER", locale: "en", isActive: true, createdAt: "", updatedAt: "" }, status: "VERIFIED", skillTags: ["Plumbing", "AC Repair"], experienceYears: 5, isAvailable: true, isOnDuty: true, avgRating: 4.8, totalJobs: 234, totalEarnings: 156000, walletBalance: 12000, kycStatus: "VERIFIED", aadhaarVerified: true },
  { id: "w2", userId: "u2", user: { id: "u2", name: "Priya Devi", phone: "9876543211", role: "WORKER", locale: "en", isActive: true, createdAt: "", updatedAt: "" }, status: "PENDING_VERIFICATION", skillTags: ["Cleaning", "Carpentry"], experienceYears: 3, isAvailable: true, isOnDuty: true, avgRating: 4.6, totalJobs: 156, totalEarnings: 89000, walletBalance: 8000, kycStatus: "PENDING", aadhaarVerified: false },
  { id: "w3", userId: "u3", user: { id: "u3", name: "Suresh Patel", phone: "9876543212", role: "WORKER", locale: "en", isActive: true, createdAt: "", updatedAt: "" }, status: "SUSPENDED", skillTags: ["Electrical", "Plumbing"], experienceYears: 7, isAvailable: false, isOnDuty: false, avgRating: 4.9, totalJobs: 412, totalEarnings: 298000, walletBalance: 34000, kycStatus: "VERIFIED", aadhaarVerified: true },
];

export default function WorkersPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfile | null>(null);

  const filtered = mockWorkers.filter((w) => {
    const matchesSearch = w.user.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "ALL" || w.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 font-heading">Worker Management</h1>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search workers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="VERIFIED">Verified</SelectItem>
            <SelectItem value="PENDING_VERIFICATION">Pending</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-600">Worker</th>
              <th className="px-4 py-3 font-medium text-gray-600">Skills</th>
              <th className="px-4 py-3 font-medium text-gray-600">Rating</th>
              <th className="px-4 py-3 font-medium text-gray-600">Jobs</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((w) => (
              <tr key={w.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{w.user.name.charAt(0)}</div>
                    <div>
                      <p className="font-medium text-gray-900">{w.user.name}</p>
                      <p className="text-xs text-gray-400">{w.user.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">{w.skillTags.slice(0, 2).map((t) => <Badge key={t} variant="info">{t}</Badge>)}</div>
                </td>
                <td className="px-4 py-3">{w.avgRating.toFixed(1)}</td>
                <td className="px-4 py-3">{w.totalJobs}</td>
                <td className="px-4 py-3"><Badge className={getStatusColor(w.status)}>{w.status.replace("_", " ")}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setSelectedWorker(w)}><Eye className="h-3.5 w-3.5" /></Button>
                    {w.status === "PENDING_VERIFICATION" && <Button size="sm" variant="ghost" onClick={() => alert(`Verified ${w.user.name}`)}><CheckCircle className="h-3.5 w-3.5 text-emerald-600" /></Button>}
                    {w.status === "VERIFIED" && <Button size="sm" variant="ghost" onClick={() => alert(`Suspended ${w.user.name}`)}><Ban className="h-3.5 w-3.5 text-red-600" /></Button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selectedWorker} onOpenChange={() => setSelectedWorker(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Worker Profile</DialogTitle>
          </DialogHeader>
          {selectedWorker && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-700">{selectedWorker.user.name.charAt(0)}</div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedWorker.user.name}</h3>
                  <p className="text-gray-500">{selectedWorker.user.phone}</p>
                </div>
                <Badge className={getStatusColor(selectedWorker.status)}>{selectedWorker.status.replace("_", " ")}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-gray-500">Rating</span><p className="font-medium">★ {selectedWorker.avgRating}</p></div>
                <div><span className="text-gray-500">Total Jobs</span><p className="font-medium">{selectedWorker.totalJobs}</p></div>
                <div><span className="text-gray-500">Earnings</span><p className="font-medium">₹{selectedWorker.totalEarnings.toLocaleString()}</p></div>
                <div><span className="text-gray-500">Experience</span><p className="font-medium">{selectedWorker.experienceYears} years</p></div>
                <div><span className="text-gray-500">KYC</span><p className="font-medium">{selectedWorker.kycStatus}</p></div>
                <div><span className="text-gray-500">Aadhaar</span><p className="font-medium">{selectedWorker.aadhaarVerified ? "Verified ✓" : "Pending"}</p></div>
              </div>
              <div>
                <span className="text-gray-500">Skills</span>
                <div className="mt-1 flex flex-wrap gap-1">{selectedWorker.skillTags.map((t) => <Badge key={t} variant="info">{t}</Badge>)}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
