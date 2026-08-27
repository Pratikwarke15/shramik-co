"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/providers/ToastProvider";
import { apiGet, apiPost } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Building2, Plus, MapPin, Users, Wrench } from "lucide-react";

interface Coop {
  id: string;
  name: string;
  registrationNo: string;
  description?: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  commissionRate: number;
  isActive: boolean;
  createdAt: string;
  admin?: { id: string; name: string; phone: string } | null;
  workerCount: number;
  serviceCount: number;
  revenue: number;
}

const emptyForm = {
  name: "",
  registrationNo: "",
  description: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  latitude: "",
  longitude: "",
  radiusKm: "10",
  commissionRate: "4",
};

export default function AdminCoopsPage() {
  const { toast } = useToast();
  const [coops, setCoops] = useState<Coop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchCoops = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: Coop[] }>("/admin/coops");
      if (res.success) setCoops(res.data);
    } catch {
      toast({ title: "Failed to load co-ops", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchCoops(); }, [fetchCoops]);

  const submit = async () => {
    setCreating(true);
    try {
      const payload = {
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        radiusKm: parseFloat(form.radiusKm) || 10,
        commissionRate: parseFloat(form.commissionRate) || 4,
        description: form.description || undefined,
      };
      if (!payload.name || !payload.registrationNo || !payload.address || !payload.city || !payload.state || !/^\d{6}$/.test(form.pincode)) {
        toast({ title: "Please fill all required fields (6-digit pincode)", variant: "danger" });
        return;
      }
      if (isNaN(payload.latitude) || isNaN(payload.longitude)) {
        toast({ title: "Latitude and longitude must be numbers", variant: "danger" });
        return;
      }
      const res = await apiPost<{ success: boolean; error?: string }>("/coops", payload);
      if (res.success) {
        toast({ title: "Co-op registered!", variant: "success" });
        setShowCreate(false);
        setForm(emptyForm);
        fetchCoops();
      } else {
        toast({ title: res.error || "Registration failed", variant: "danger" });
      }
    } catch {
      toast({ title: "Registration failed", variant: "danger" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Co-operative Societies</h1>
          <p className="text-gray-500">Nationwide co-op registry</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="mr-1 h-4 w-4" /> Register Co-op</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
      ) : coops.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center text-sm text-gray-500">No co-ops registered yet.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {coops.map((c) => (
            <div key={c.id} className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><Building2 className="h-5 w-5" /></div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{c.name}</h3>
                    <p className="text-xs text-gray-400">Reg. No. {c.registrationNo}</p>
                  </div>
                </div>
                <Badge variant={c.isActive ? "success" : "default"}>{c.isActive ? "Active" : "Inactive"}</Badge>
              </div>
              <p className="mt-3 text-sm text-gray-600 line-clamp-2">{c.description || "—"}</p>
              <p className="mt-2 flex items-center gap-1 text-xs text-gray-500"><MapPin className="h-3 w-3" /> {c.address}, {c.city}, {c.state} - {c.pincode}</p>
              <div className="mt-4 grid grid-cols-4 gap-2 border-t pt-3 text-center">
                <div><p className="text-lg font-bold text-gray-900">{c.workerCount}</p><p className="text-xs text-gray-500">Workers</p></div>
                <div><p className="text-lg font-bold text-gray-900">{c.serviceCount}</p><p className="text-xs text-gray-500">Services</p></div>
                <div><p className="text-lg font-bold text-gray-900">{formatCurrency(c.revenue)}</p><p className="text-xs text-gray-500">Revenue</p></div>
                <div><p className="text-lg font-bold text-gray-900">{c.commissionRate}%</p><p className="text-xs text-gray-500">Commission</p></div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {c.workerCount} workers</span>
                <span className="inline-flex items-center gap-1"><Wrench className="h-3 w-3" /> {c.serviceCount} services</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register a New Co-operative</DialogTitle>
            <DialogDescription>Create a worker co-operative society. Coordinates define its service area.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Pune Gig Workers Union" />
            <Input label="Registration No." value={form.registrationNo} onChange={(e) => setForm({ ...form, registrationNo: e.target.value })} placeholder="e.g. MAH/PUNE/2023/001" />
            <Input label="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Purpose of the co-operative" />
            <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street address" />
            <div className="grid grid-cols-3 gap-3">
              <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Pune" />
              <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="Maharashtra" />
              <Input label="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} placeholder="411001" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Latitude" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="18.5204" />
              <Input label="Longitude" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="73.8567" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Radius (km)" type="number" value={form.radiusKm} onChange={(e) => setForm({ ...form, radiusKm: e.target.value })} placeholder="10" />
              <Input label="Commission %" type="number" value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: e.target.value })} placeholder="4" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button className="flex-1" onClick={submit} disabled={creating}>{creating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />} Register</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}