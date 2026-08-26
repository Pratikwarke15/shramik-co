import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Dividend } from "@/lib/types";
import { Coins } from "lucide-react";

interface DividendCardProps {
  dividend: Dividend;
}

export function DividendCard({ dividend }: DividendCardProps) {
  const isPaid = dividend.status === "PAID";

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{dividend.period}</h4>
            <p className="text-xs text-gray-500">
              {formatDate(dividend.periodStart)} - {formatDate(dividend.periodEnd)}
            </p>
          </div>
        </div>
        <Badge variant={isPaid ? "success" : "warning"}>
          {isPaid ? "Paid" : "Pending"}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-lg font-bold text-gray-900">{dividend.jobsCompleted}</p>
          <p className="text-xs text-gray-500">Jobs</p>
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900">{dividend.patronagePoints.toFixed(0)}</p>
          <p className="text-xs text-gray-500">Points</p>
        </div>
        <div>
          <p className="text-lg font-bold text-emerald-600">{formatCurrency(dividend.dividendAmount)}</p>
          <p className="text-xs text-gray-500">Dividend</p>
        </div>
      </div>

      {dividend.paidAt && (
        <p className="mt-3 text-xs text-center text-gray-400">Paid on {formatDate(dividend.paidAt)}</p>
      )}
    </div>
  );
}
