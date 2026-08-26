import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, CheckCircle, Ban, MessageSquare } from "lucide-react";
import type { WorkerProfile } from "@/lib/types";
import { getStatusColor } from "@/lib/utils";

interface WorkerGridProps {
  workers: WorkerProfile[];
  onVerify?: (id: string) => void;
  onSuspend?: (id: string) => void;
  onMessage?: (id: string) => void;
}

export function WorkerGrid({ workers, onVerify, onSuspend, onMessage }: WorkerGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {workers.map((w) => (
        <div key={w.id} className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
              {w.user?.name?.charAt(0) || "W"}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="truncate text-sm font-medium text-gray-900">{w.user?.name}</h4>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="text-xs text-gray-500">{w.avgRating.toFixed(1)}</span>
                <span className="text-xs text-gray-400">· {w.totalJobs} jobs</span>
              </div>
            </div>
            <Badge className={getStatusColor(w.status)}>{w.status.replace("_", " ")}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {w.skillTags?.slice(0, 3).map((t) => (
              <Badge key={t} variant="info">{t}</Badge>
            ))}
          </div>
          <div className="mt-3 flex gap-2 border-t pt-3">
            {onVerify && w.status === "PENDING_VERIFICATION" && (
              <Button size="sm" variant="secondary" onClick={() => onVerify(w.id)}>
                <CheckCircle className="mr-1 h-3 w-3" /> Verify
              </Button>
            )}
            {onSuspend && w.status === "VERIFIED" && (
              <Button size="sm" variant="danger" onClick={() => onSuspend(w.id)}>
                <Ban className="mr-1 h-3 w-3" /> Suspend
              </Button>
            )}
            {onMessage && (
              <Button size="sm" variant="ghost" onClick={() => onMessage(w.id)}>
                <MessageSquare className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
