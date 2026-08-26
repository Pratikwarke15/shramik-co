"use client";

import { useState } from "react";
import { DisputeList } from "@/components/dashboard/DisputeList";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Dispute } from "@/lib/types";

const mockDisputes: Dispute[] = [
  { id: "d1", bookingId: "b1", booking: { bookingRef: "CG-A1B2C3D4" } as any, raisedBy: "u1", status: "OPEN", priority: "HIGH", category: "Quality", description: "Worker did not complete the cleaning properly. Kitchen area was still dirty.", createdAt: new Date().toISOString() },
  { id: "d2", bookingId: "b2", booking: { bookingRef: "CG-E5F6G7H8" } as any, raisedBy: "u2", status: "UNDER_REVIEW", priority: "MEDIUM", category: "Pricing", description: "Charged extra for materials that were not discussed beforehand.", createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "d3", bookingId: "b3", booking: { bookingRef: "CG-I9J0K1L2" } as any, raisedBy: "u3", status: "RESOLVED", priority: "LOW", category: "Late Arrival", description: "Worker arrived 45 minutes late without prior communication.", createdAt: new Date(Date.now() - 172800000).toISOString(), resolution: "Partial refund of ₹100 issued to consumer." },
];

export default function DisputesPage() {
  const [filter, setFilter] = useState("ALL");

  const filtered = mockDisputes.filter((d) => filter === "ALL" || d.status === filter);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 font-heading">Dispute Management</h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="ESCALATED">Escalated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DisputeList
        disputes={filtered}
        onResolve={(id, resolution) => alert(`Resolved dispute ${id}: ${resolution}`)}
        onEscalate={(id) => alert(`Escalated dispute ${id}`)}
      />
    </div>
  );
}
