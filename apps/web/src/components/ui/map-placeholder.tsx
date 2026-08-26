import { MapPin } from "lucide-react";

interface MapPlaceholderProps {
  lat?: number;
  lng?: number;
  height?: string;
  className?: string;
}

export function MapPlaceholder({ lat = 28.6139, lng = 77.209, height = "300px", className }: MapPlaceholderProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-gray-200 ${className}`}
      style={{ height }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-emerald-50 to-blue-100">
        <svg className="absolute inset-0 h-full w-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#4f46e5" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg animate-pulse">
            <MapPin className="h-6 w-6" />
          </div>
          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-700 shadow-sm">
            Live Map
          </span>
        </div>
      </div>
      <div className="absolute bottom-3 left-3 rounded-lg bg-white/90 px-3 py-1.5 text-xs text-gray-600 shadow-sm backdrop-blur-sm">
        {lat.toFixed(4)}, {lng.toFixed(4)}
      </div>
    </div>
  );
}
