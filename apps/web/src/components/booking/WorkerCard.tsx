import { Star, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WorkerProfile } from "@/lib/types";

interface WorkerCardProps {
  worker: WorkerProfile;
  distance?: number;
  onBook: () => void;
}

export function WorkerCard({ worker, distance, onBook }: WorkerCardProps) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-700">
              {worker.user?.name?.charAt(0) || "W"}
            </div>
            {worker.isAvailable && (
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
            )}
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{worker.user?.name}</h4>
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="text-sm text-gray-600">{worker.avgRating.toFixed(1)}</span>
              <span className="text-xs text-gray-400">({worker.totalJobs} jobs)</span>
            </div>
          </div>
        </div>
        {worker.isAvailable ? (
          <Badge variant="success">Available</Badge>
        ) : (
          <Badge variant="default">Busy</Badge>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {worker.skillTags?.slice(0, 4).map((tag) => (
          <Badge key={tag} variant="info">{tag}</Badge>
        ))}
        {(worker.skillTags?.length || 0) > 4 && (
          <Badge variant="default">+{(worker.skillTags?.length || 0) - 4}</Badge>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t pt-3">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          {distance != null && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {distance.toFixed(1)} km
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            ~{Math.max(10, Math.round((distance || 2) * 5))} min
          </span>
        </div>
        <Button size="sm" onClick={onBook} disabled={!worker.isAvailable}>
          Book Now
        </Button>
      </div>
    </div>
  );
}
