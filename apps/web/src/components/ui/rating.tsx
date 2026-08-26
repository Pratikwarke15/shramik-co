"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface RatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeMap = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-7 w-7" };

export function Rating({ value, onChange, readonly = false, size = "md" }: RatingProps) {
  const [hover, setHover] = useState(0);
  const display = hover || value;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= Math.floor(display);
        const half = !filled && i - 0.5 <= display;

        return (
          <button
            key={i}
            type="button"
            disabled={readonly}
            className={cn(
              "relative focus:outline-none",
              readonly ? "cursor-default" : "cursor-pointer"
            )}
            onClick={() => !readonly && onChange?.(i)}
            onMouseEnter={() => !readonly && setHover(i)}
            onMouseLeave={() => !readonly && setHover(0)}
          >
            <Star
              className={cn(
                sizeMap[size],
                "transition-colors",
                filled ? "fill-amber-400 text-amber-400" : half ? "fill-amber-400/50 text-amber-400" : "fill-gray-200 text-gray-300"
              )}
            />
          </button>
        );
      })}
      {!readonly && value > 0 && <span className="ml-1 text-sm text-gray-600">{value}/5</span>}
    </div>
  );
}
