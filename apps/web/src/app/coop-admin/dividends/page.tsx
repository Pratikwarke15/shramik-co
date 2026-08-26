"use client";

import { useState } from "react";
import { DividendCard } from "@/components/dashboard/DividendCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Calculator } from "lucide-react";
import type { Dividend } from "@/lib/types";

const mockDividends: Dividend[] = [
  { id: "d1", workerId: "w1", period: "Q3 2026", periodStart: "2026-07-01", periodEnd: "2026-09-30", jobsCompleted: 45, totalEarnings: 28000, patronagePoints: 450, dividendAmount: 1200, status: "PENDING" },
  { id: "d2", workerId: "w2", period: "Q3 2026", periodStart: "2026-07-01", periodEnd: "2026-09-30", jobsCompleted: 38, totalEarnings: 24000, patronagePoints: 380, dividendAmount: 960, status: "PENDING" },
  { id: "d3", workerId: "w3", period: "Q3 2026", periodStart: "2026-07-01", periodEnd: "2026-09-30", jobsCompleted: 52, totalEarnings: 34000, patronagePoints: 520, dividendAmount: 1400, status: "PENDING" },
  { id: "d4", workerId: "w1", period: "Q2 2026", periodStart: "2026-04-01", periodEnd: "2026-06-30", jobsCompleted: 38, totalEarnings: 24000, patronagePoints: 380, dividendAmount: 960, status: "PAID", paidAt: "2026-07-15" },
  { id: "d5", workerId: "w2", period: "Q2 2026", periodStart: "2026-04-01", periodEnd: "2026-06-30", jobsCompleted: 30, totalEarnings: 19000, patronagePoints: 300, dividendAmount: 760, status: "PAID", paidAt: "2026-07-15" },
];

export default function DividendsPage() {
  const [calculating, setCalculating] = useState(false);

  const handleCalculate = () => {
    setCalculating(true);
    setTimeout(() => {
      setCalculating(false);
      alert("Dividends calculated for Q3 2026!");
    }, 2000);
  };

  const totalPending = mockDividends.filter((d) => d.status === "PENDING").reduce((sum, d) => sum + d.dividendAmount, 0);
  const totalPaid = mockDividends.filter((d) => d.status === "PAID").reduce((sum, d) => sum + d.dividendAmount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 font-heading">Dividend Management</h1>
        <Button onClick={handleCalculate} loading={calculating}>
          <Calculator className="mr-1 h-4 w-4" /> Calculate Dividends
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-sm text-gray-500">Total Pending</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{formatCurrency(totalPending)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-sm text-gray-500">Total Paid (Q2)</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold text-gray-900">Current Period (Q3 2026)</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mockDividends.filter((d) => d.status === "PENDING").map((d) => (
          <DividendCard key={d.id} dividend={d} />
        ))}
      </div>

      <h2 className="text-lg font-semibold text-gray-900">History</h2>
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-600">Worker</th>
              <th className="px-4 py-3 font-medium text-gray-600">Period</th>
              <th className="px-4 py-3 font-medium text-gray-600">Jobs</th>
              <th className="px-4 py-3 font-medium text-gray-600">Points</th>
              <th className="px-4 py-3 font-medium text-gray-600">Amount</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 font-medium text-gray-600">Paid At</th>
            </tr>
          </thead>
          <tbody>
            {mockDividends.map((d) => (
              <tr key={d.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{d.workerId}</td>
                <td className="px-4 py-3">{d.period}</td>
                <td className="px-4 py-3">{d.jobsCompleted}</td>
                <td className="px-4 py-3">{d.patronagePoints}</td>
                <td className="px-4 py-3 font-bold">{formatCurrency(d.dividendAmount)}</td>
                <td className="px-4 py-3"><Badge variant={d.status === "PAID" ? "success" : "warning"}>{d.status}</Badge></td>
                <td className="px-4 py-3 text-gray-500">{d.paidAt ? formatDate(d.paidAt) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
