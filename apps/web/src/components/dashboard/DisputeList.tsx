"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStatusColor, formatDateTime } from "@/lib/utils";
import type { Dispute } from "@/lib/types";

interface DisputeListProps {
  disputes: Dispute[];
  onResolve?: (id: string, resolution: string) => void;
  onEscalate?: (id: string) => void;
}

export function DisputeList({ disputes, onResolve, onEscalate }: DisputeListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");

  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-600">Booking Ref</th>
              <th className="px-4 py-3 font-medium text-gray-600">Category</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 font-medium text-gray-600">Priority</th>
              <th className="px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {disputes.map((d) => (
              <DisputeRow
                key={d.id}
                dispute={d}
                expanded={expandedId === d.id}
                onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
                resolution={resolution}
                onResolutionChange={setResolution}
                onResolve={onResolve}
                onEscalate={onEscalate}
              />
            ))}
            {disputes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  <AlertTriangle className="mx-auto mb-2 h-8 w-8" />
                  No disputes found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DisputeRow({
  dispute,
  expanded,
  onToggle,
  resolution,
  onResolutionChange,
  onResolve,
  onEscalate,
}: {
  dispute: Dispute;
  expanded: boolean;
  onToggle: () => void;
  resolution: string;
  onResolutionChange: (v: string) => void;
  onResolve?: (id: string, resolution: string) => void;
  onEscalate?: (id: string) => void;
}) {
  return (
    <>
      <tr className="border-b hover:bg-gray-50">
        <td className="px-4 py-3 font-mono text-xs">{dispute.booking?.bookingRef || "—"}</td>
        <td className="px-4 py-3">{dispute.category}</td>
        <td className="px-4 py-3">
          <Badge className={getStatusColor(dispute.status)}>{dispute.status}</Badge>
        </td>
        <td className="px-4 py-3">
          <Badge className={getStatusColor(dispute.priority)}>{dispute.priority}</Badge>
        </td>
        <td className="px-4 py-3 text-gray-500">{formatDateTime(dispute.createdAt)}</td>
        <td className="px-4 py-3">
          <button onClick={onToggle} className="text-indigo-600 hover:underline">
            {expanded ? "Hide" : "View"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50 animate-fade-in">
          <td colSpan={6} className="px-4 py-4">
            <p className="text-sm text-gray-700">{dispute.description}</p>
            {dispute.resolution && (
              <p className="mt-2 text-sm text-emerald-700">
                <strong>Resolution:</strong> {dispute.resolution}
              </p>
            )}
            {onResolve && dispute.status !== "RESOLVED" && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="Enter resolution..."
                  value={resolution}
                  onChange={(e) => onResolutionChange(e.target.value)}
                  className="flex-1 rounded-lg border px-3 py-1.5 text-sm"
                />
                <Button size="sm" variant="secondary" onClick={() => { onResolve(dispute.id, resolution); onResolutionChange(""); }}>
                  Resolve
                </Button>
                {onEscalate && (
                  <Button size="sm" variant="danger" onClick={() => onEscalate(dispute.id)}>
                    Escalate
                  </Button>
                )}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
