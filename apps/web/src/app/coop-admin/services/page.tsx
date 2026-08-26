"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/utils";
import { Plus, Edit2 } from "lucide-react";
import type { Service } from "@/lib/types";

const mockServices: Service[] = [
  { id: "s1", coopId: "c1", categoryName: "Plumbing", categorySlug: "plumbing", name: "Plumbing Repair", description: "Fix leaks, install fittings", basePrice: 400, unit: "fixed", isActive: true },
  { id: "s2", coopId: "c1", categoryName: "Electrical", categorySlug: "electrical", name: "Electrical Work", description: "Wiring, switch repair", basePrice: 350, unit: "fixed", isActive: true },
  { id: "s3", coopId: "c1", categoryName: "Cleaning", categorySlug: "cleaning", name: "Home Cleaning", description: "Deep cleaning services", basePrice: 300, unit: "fixed", isActive: false },
  { id: "s4", coopId: "c1", categoryName: "Transport", categorySlug: "transport", name: "Local Transport", description: "Goods transport", basePrice: 500, unit: "per_hour", isActive: true },
];

export default function ServicesPage() {
  const [services, setServices] = useState(mockServices);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [form, setForm] = useState({ name: "", categoryName: "", basePrice: "", description: "" });

  const toggleActive = (id: string) => {
    setServices((prev) => prev.map((s) => s.id === id ? { ...s, isActive: !s.isActive } : s));
  };

  const openAdd = () => {
    setEditService(null);
    setForm({ name: "", categoryName: "", basePrice: "", description: "" });
    setDialogOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditService(s);
    setForm({ name: s.name, categoryName: s.categoryName, basePrice: String(s.basePrice), description: s.description || "" });
    setDialogOpen(true);
  };

  const save = () => {
    if (editService) {
      setServices((prev) => prev.map((s) => s.id === editService.id ? { ...s, name: form.name, categoryName: form.categoryName, basePrice: Number(form.basePrice), description: form.description } : s));
    } else {
      setServices((prev) => [...prev, { id: `s${Date.now()}`, coopId: "c1", categoryName: form.categoryName, categorySlug: form.name.toLowerCase().replace(/\s+/g, "_"), name: form.name, basePrice: Number(form.basePrice), description: form.description, unit: "fixed", isActive: true }]);
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 font-heading">Service Management</h1>
        <Button onClick={openAdd}><Plus className="mr-1 h-4 w-4" /> Add Service</Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 font-medium text-gray-600">Category</th>
              <th className="px-4 py-3 font-medium text-gray-600">Price</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.description}</p>
                </td>
                <td className="px-4 py-3"><Badge>{s.categoryName}</Badge></td>
                <td className="px-4 py-3 font-medium">{formatCurrency(s.basePrice)}</td>
                <td className="px-4 py-3">
                  <Switch checked={s.isActive} onCheckedChange={() => toggleActive(s.id)} />
                </td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(s)}><Edit2 className="h-3.5 w-3.5" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editService ? "Edit Service" : "Add Service"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input label="Service Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Category" value={form.categoryName} onChange={(e) => setForm({ ...form, categoryName: e.target.value })} />
            <Input label="Base Price (₹)" type="number" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} />
            <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
