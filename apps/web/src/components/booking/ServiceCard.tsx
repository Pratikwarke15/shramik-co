import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import type { Service } from "@/lib/types";
import { Wrench, Droplets, Zap, Truck, Brush, Home as HomeIcon } from "lucide-react";

const categoryIcons: Record<string, React.ElementType> = {
  plumbing: Droplets,
  electrical: Zap,
  plumbing_repair: Droplets,
  electrical_repair: Zap,
  cleaning: Brush,
  transport: Truck,
  home_repair: HomeIcon,
  default: Wrench,
};

interface ServiceCardProps {
  service: Service;
  selected?: boolean;
  onClick: () => void;
}

export function ServiceCard({ service, selected, onClick }: ServiceCardProps) {
  const Icon = categoryIcons[service.categorySlug] || categoryIcons.default;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all hover:shadow-md",
        selected
          ? "border-indigo-600 bg-indigo-50 shadow-md ring-2 ring-indigo-200"
          : "border-gray-200 bg-white hover:border-indigo-300"
      )}
    >
      <div className={cn("flex h-14 w-14 items-center justify-center rounded-full", selected ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-600")}>
        <Icon className="h-7 w-7" />
      </div>
      <div>
        <h3 className="font-medium text-gray-900">{service.name}</h3>
        {service.description && <p className="mt-1 text-xs text-gray-500 line-clamp-2">{service.description}</p>}
      </div>
      <span className="text-lg font-bold text-indigo-600">{formatCurrency(service.basePrice)}</span>
      <span className="text-xs text-gray-400">{service.categoryName}</span>
    </button>
  );
}
