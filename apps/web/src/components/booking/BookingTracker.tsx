import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { MapPlaceholder } from "@/components/ui/map-placeholder";

const steps: { status: BookingStatus; label: string }[] = [
  { status: "PENDING", label: "Pending" },
  { status: "ACCEPTED", label: "Accepted" },
  { status: "EN_ROUTE", label: "En Route" },
  { status: "IN_PROGRESS", label: "In Progress" },
  { status: "COMPLETED", label: "Completed" },
];

interface BookingTrackerProps {
  status: BookingStatus;
  workerLatitude?: number;
  workerLongitude?: number;
  eta?: string;
  onCancel?: () => void;
}

export function BookingTracker({ status, workerLatitude, workerLongitude, eta, onCancel }: BookingTrackerProps) {
  const currentIdx = steps.findIndex((s) => s.status === status);
  const isCancelled = status === "CANCELLED";

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h3 className="mb-6 text-lg font-semibold text-gray-900">Booking Status</h3>

      {isCancelled ? (
        <div className="py-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <span className="text-2xl">✕</span>
          </div>
          <p className="mt-4 text-lg font-medium text-red-600">Booking Cancelled</p>
        </div>
      ) : (
        <>
          <div className="relative mb-8">
            <div className="absolute left-0 top-4 h-0.5 w-full bg-gray-200" />
            <div
              className="absolute left-0 top-4 h-0.5 bg-indigo-600 transition-all duration-500"
              style={{ width: `${(currentIdx / (steps.length - 1)) * 100}%` }}
            />
            <div className="relative flex justify-between">
              {steps.map((step, idx) => {
                const completed = idx <= currentIdx;
                return (
                  <div key={step.status} className="flex flex-col items-center">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                        completed
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-gray-300 bg-white text-gray-400"
                      )}
                    >
                      {completed ? <Check className="h-4 w-4" /> : idx + 1}
                    </div>
                    <span className={cn("mt-2 text-xs font-medium", completed ? "text-indigo-600" : "text-gray-400")}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {status === "EN_ROUTE" && (
            <div className="space-y-3">
              <MapPlaceholder lat={workerLatitude} lng={workerLongitude} height="200px" />
              {eta && (
                <p className="text-center text-sm text-gray-600">
                  Worker arriving in <span className="font-semibold text-indigo-600">{eta}</span>
                </p>
              )}
            </div>
          )}
        </>
      )}

      {!isCancelled && ["PENDING", "ACCEPTED"].includes(status) && onCancel && (
        <div className="mt-6 flex justify-center">
          <Button variant="danger" size="sm" onClick={onCancel}>
            Cancel Booking
          </Button>
        </div>
      )}
    </div>
  );
}
