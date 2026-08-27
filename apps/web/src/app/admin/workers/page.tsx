"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/providers/ToastProvider";
import { apiGet, apiPost } from "@/lib/api";
import { getStatusColor } from "@/lib/utils";
import { Search, Eye, CheckCircle, Ban, Loader2, Building2 } from "lucide-react";

interface AdminWorker {
  id: string;
  userId: string;
  name: string;
  phone: string;
  joinedAt: string;
  status: string;
  skillTags: string[];
  bio?: string | null;
  workAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phoneVerified: boolean;
  kycStatus: string;
  kycDocumentUrl?: string | null;
  aadhaarVerified: boolean;
  avgRating: number;
  totalJobs: number;
  coop?: { id: string; name: string; city: string } | null;
}

const STATUS_OPTIONS = ["PENDING_ADMIN_APPROVAL", "PENDING_VERIFICATION", "VERIFIED", "SUSPENDED", "DEACTIVATED", "ALL"];
const STATUS_LABELS: Record<string, string> = {
  PENDING_ADMIN_APPROVAL: "Pending Approval",
  PENDING_VERIFICATION: "Pending Verification",
  VERIFIED: "Verified",
  SUSPENDED: "Suspended",
  DEACTIVATED: "Deactivated",
  ALL: "All Workers",
};

export default function AdminWorkersPage() {
  const { toast } = useToast();
  const [workers, setWorkers] = useState<AdminWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("PENDING_ADMIN_APPROVAL");
  const [selectedWorker, setSelectedWorker] = useState<AdminWorker | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "ALL") params.set("status", filter);
      if (search.trim()) params.set("q", search.trim());
      const res = await apiGet<{ success: boolean; data: AdminWorker[] }>(`/admin/workers?${params.toString()}`);
      if (res.success) setWorkers(res.data);
    } catch {
      toast({ title: "Failed to load workers", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [filter, toast]);

  useEffect(() => {
    const t = setTimeout(fetchWorkers, search.trim() ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchWorkers, search]);

  const handleApprove = async (worker: AdminWorker) => {
    setActionLoading(true);
    try {
      const res = await apiPost<{ success: boolean; error?: string }>(`/admin/workers/${worker.id}/approve`, { note: "Approved by ministry" });
      if (res.success) {
        toast({ title: `${worker.name} approved!`, variant: "success" });
        fetchWorkers();
      } else {
        toast({ title: res.error || "Approval failed", variant: "danger" });
      }
    } catch {
      toast({ title: "Approval failed", variant: "danger" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (worker: AdminWorker) => {
    setActionLoading(true);
    try {
      const res = await apiPost<{ success: boolean; error?: string }>(`/admin/workers/${worker.id}/reject`, { reason: rejectReason || "Registration rejected" });
      if (res.success) {
        toast({ title: `${worker.name} rejected`, variant: "success" });
        setShowRejectDialog(false);
        setRejectReason("");
        fetchWorkers();
      } else {
        toast({ title: res.error || "Rejection failed", variant: "danger" });
      }
    } catch {
      toast({ title: "Rejection failed", variant: "danger" });
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = workers.filter((w) => w.status === "PENDING_ADMIN_APPROVAL").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Worker Verification</h1>
          {pendingCount > 0 ? (
            <p className="mt-1 text-sm text-amber-600">{pendingCount} worker(s) awaiting verification</p>
          ) : (
            <p className="mt-1 text-sm text-gray-500">Nationwide worker registry</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone, or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s] || s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
      ) : workers.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center text-sm text-gray-500">No workers found.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Worker</th>
                <th className="px-4 py-3 font-medium text-gray-600">Co-op</th>
                <th className="px-4 py-3 font-medium text-gray-600">Address</th>
                <th className="px-4 py-3 font-medium text-gray-600">KYC</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => (
                <tr key={w.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{w.name.charAt(0)}</div>
                      <div>
                        <p className="font-medium text-gray-900">{w.name}</p>
                        <p className="text-xs text-gray-400">{w.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {w.coop ? (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                        <Building2 className="h-3 w-3" /> {w.coop.name}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[160px] truncate text-gray-500">{w.workAddress || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={w.aadhaarVerified ? "success" : "default"}>{w.aadhaarVerified ? "Aadhaar ✓" : "Pending"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={getStatusColor(w.status)}>{STATUS_LABELS[w.status] || w.status.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setSelectedWorker(w)} title="View details"><Eye className="h-3.5 w-3.5" /></Button>
                      {w.status === "PENDING_ADMIN_APPROVAL" && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => handleApprove(w)} disabled={actionLoading} title="Approve"><CheckCircle className="h-3.5 w-3.5 text-emerald-600" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => { setSelectedWorker(w); setShowRejectDialog(true); }} disabled={actionLoading} title="Reject"><Ban className="h-3.5 w-3.5 text-red-600" /></Button>
                        </>
                      )}
                      {w.status === "VERIFIED" && (
                        <Button size="sm" variant="ghost" onClick={() => { setSelectedWorker(w); setShowRejectDialog(true); }} title="Suspend"><Ban className="h-3.5 w-3.5 text-red-600" /></Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!selectedWorker && !showRejectDialog} onOpenChange={(open) => { if (!open) setSelectedWorker(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Worker Profile</DialogTitle></DialogHeader>
          {selectedWorker && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-700">{selectedWorker.name.charAt(0)}</div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedWorker.name}</h3>
                  <p className="text-gray-500">{selectedWorker.phone}</p>
                </div>
                <Badge className={getStatusColor(selectedWorker.status)}>{STATUS_LABELS[selectedWorker.status] || selectedWorker.status}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {selectedWorker.coop && (
                  <div className="col-span-2"><span className="block text-gray-500">Co-op</span><p className="font-medium">{selectedWorker.coop.name} ({selectedWorker.coop.city})</p></div>
                )}
                <div><span className="block text-gray-500">Phone Verified</span><p className="font-medium">{selectedWorker.phoneVerified ? "Yes ✓" : "No"}</p></div>
                <div><span className="block text-gray-500">KYC</span><p className="font-medium">{selectedWorker.kycStatus}</p></div>
                <div><span className="block text-gray-500">Aadhaar</span><p className="font-medium">{selectedWorker.aadhaarVerified ? "Verified ✓" : "Pending"}</p></div>
                <div><span className="block text-gray-500">Rating</span><p className="font-medium">★ {selectedWorker.avgRating || "—"}</p></div>
                {selectedWorker.workAddress && (
                  <div className="col-span-2"><span className="block text-gray-500">Work Address</span><p className="font-medium">{selectedWorker.workAddress}</p></div>
                )}
                {selectedWorker.bio && (
                  <div className="col-span-2"><span className="block text-gray-500">Bio</span><p className="font-medium">{selectedWorker.bio}</p></div>
                )}
                {selectedWorker.latitude && selectedWorker.longitude && (
                  <div className="col-span-2"><span className="block text-gray-500">Location</span><p className="font-medium">{selectedWorker.latitude.toFixed(4)}, {selectedWorker.longitude.toFixed(4)}</p></div>
                )}
                {selectedWorker.kycDocumentUrl && (
                  <div className="col-span-2">
                    <span className="block text-gray-500">KYC Document</span>
                    <a href={selectedWorker.kycDocumentUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">View document ↗</a>
                  </div>
                )}
              </div>
              <div>
                <span className="block text-gray-500">Skills</span>
                <div className="mt-1 flex flex-wrap gap-1">{selectedWorker.skillTags.map((t) => <Badge key={t} variant="info">{t}</Badge>)}</div>
              </div>
              {selectedWorker.status === "PENDING_ADMIN_APPROVAL" && (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => { handleApprove(selectedWorker); setSelectedWorker(null); }} disabled={actionLoading}>
                    <CheckCircle className="mr-1 h-4 w-4" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-red-600" onClick={() => setShowRejectDialog(true)}>
                    <Ban className="mr-1 h-4 w-4" /> Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={(open) => { if (!open) setShowRejectDialog(false); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject / Suspend Worker</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              {selectedWorker ? <span className="font-medium text-gray-900">{selectedWorker.name}:</span> : ""} Provide a reason for rejection or suspension.
            </p>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Incomplete documentation, Aadhaar mismatch..."
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowRejectDialog(false); }}>Cancel</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={() => selectedWorker && handleReject(selectedWorker)} disabled={actionLoading || !rejectReason.trim()}>
                <Ban className="mr-1 h-4 w-4" /> Confirm Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}