"use client";

import { useState, useEffect, useCallback } from "react";
import { WalletBalance } from "@/components/dashboard/WalletBalance";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { Loader2 } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { WalletTransaction } from "@/lib/types";

interface Contribution { fundType: string; totalContributed: number; employerMatch: number; balance: number; isOptedIn: boolean }
interface TransactionsRes { transactions: WalletTransaction[] }

export default function WorkerEarningsPage() {
  const [wallet, setWallet] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [w, t, c] = await Promise.all([
        apiGet<{ success: boolean; data: { walletBalance: number } }>("/payments/wallet"),
        apiGet<{ success: boolean; data: TransactionsRes }>("/payments/transactions"),
        apiGet<{ success: boolean; data: Contribution[] }>("/social-security/contributions"),
      ]);
      if (w.success && w.data) setWallet(w.data.walletBalance || 0);
      if (t.success && t.data) setTransactions(t.data.transactions || []);
      if (c.success) setContributions(c.data || []);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 font-heading">Earnings</h1>

      <WalletBalance balance={wallet} transactions={transactions} />

      <RevenueChart title="Earnings Overview" />

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Social Security Contributions</h3>
        {contributions.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {contributions.map((s) => (
              <div key={s.fundType} className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-900">{s.fundType.replace(/_/g, " ")}</p>
                <p className="mt-1 text-xs text-gray-500">
                  Your: ₹{s.totalContributed.toLocaleString()} | Match: ₹{s.employerMatch.toLocaleString()}
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-gray-200">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, (s.totalContributed / 5000) * 100)}%` }} />
                </div>
                {s.isOptedIn ? (
                  <p className="mt-2 text-xs font-medium text-emerald-600">Opted In</p>
                ) : (
                  <p className="mt-2 text-xs text-gray-400">Not opted in</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No social security contributions yet.</p>
        )}
      </div>
    </div>
  );
}
