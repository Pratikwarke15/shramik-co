"use client";

import { WalletBalance } from "@/components/dashboard/WalletBalance";
import { DividendCard } from "@/components/dashboard/DividendCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import type { WalletTransaction, Dividend } from "@/lib/types";

const mockTransactions: WalletTransaction[] = [
  { id: "t1", workerId: "w1", type: "PAYMENT", amount: 500, balanceAfter: 12000, description: "Plumbing repair", createdAt: new Date().toISOString() },
  { id: "t2", workerId: "w1", type: "PAYOUT", amount: 3000, balanceAfter: 11500, description: "Bank transfer", createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "t3", workerId: "w1", type: "COMMISSION", amount: 20, balanceAfter: 14500, description: "Commission deduction", createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: "t4", workerId: "w1", type: "SOCIAL_SECURITY_DEDUCTION", amount: 50, balanceAfter: 14520, description: "Health insurance", createdAt: new Date(Date.now() - 259200000).toISOString() },
];

const mockDividends: Dividend[] = [
  { id: "d1", workerId: "w1", period: "Q3 2026", periodStart: "2026-07-01", periodEnd: "2026-09-30", jobsCompleted: 45, totalEarnings: 28000, patronagePoints: 450, dividendAmount: 1200, status: "PENDING" },
  { id: "d2", workerId: "w1", period: "Q2 2026", periodStart: "2026-04-01", periodEnd: "2026-06-30", jobsCompleted: 38, totalEarnings: 24000, patronagePoints: 380, dividendAmount: 960, status: "PAID", paidAt: "2026-07-15" },
];

export default function WorkerEarningsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 font-heading">Earnings</h1>

      <WalletBalance
        balance={12000}
        transactions={mockTransactions}
        onWithdraw={() => alert("Withdrawal coming soon!")}
      />

      <RevenueChart title="Earnings Overview" />

      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Dividends</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {mockDividends.map((d) => (
            <DividendCard key={d.id} dividend={d} />
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Social Security Contributions</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { type: "Health Insurance", contributed: 2400, match: 1200 },
            { type: "Emergency Fund", contributed: 1800, match: 900 },
            { type: "Retirement", contributed: 3000, match: 1500 },
          ].map((s) => (
            <div key={s.type} className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900">{s.type}</p>
              <p className="mt-1 text-xs text-gray-500">Your: ₹{s.contributed.toLocaleString()} | Match: ₹{s.match.toLocaleString()}</p>
              <div className="mt-2 h-1.5 rounded-full bg-gray-200">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, (s.contributed / 5000) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
