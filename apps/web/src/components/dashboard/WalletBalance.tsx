"use client";

import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Wallet, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import type { WalletTransaction } from "@/lib/types";

interface WalletBalanceProps {
  balance: number;
  transactions?: WalletTransaction[];
  onTopUp?: () => void;
  onWithdraw?: () => void;
}

export function WalletBalance({ balance, transactions = [], onTopUp, onWithdraw }: WalletBalanceProps) {
  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="h-5 w-5 opacity-80" />
          <span className="text-sm opacity-80">Wallet Balance</span>
        </div>
        <p className="text-3xl font-bold">{formatCurrency(balance)}</p>
        <div className="mt-4 flex gap-2">
          {onTopUp && (
            <Button size="sm" className="bg-white/20 text-white hover:bg-white/30 border-0" onClick={onTopUp}>
              Top Up
            </Button>
          )}
          {onWithdraw && (
            <Button size="sm" className="bg-white/20 text-white hover:bg-white/30 border-0" onClick={onWithdraw}>
              Withdraw
            </Button>
          )}
        </div>
      </div>

      {transactions.length > 0 && (
        <div className="divide-y">
          <div className="px-4 py-3">
            <h4 className="text-sm font-medium text-gray-900">Recent Transactions</h4>
          </div>
          {transactions.slice(0, 5).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  ["PAYMENT", "WALLET_TOPUP", "DIVIDEND"].includes(tx.type)
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-red-100 text-red-600"
                }`}>
                  {["PAYMENT", "WALLET_TOPUP", "DIVIDEND"].includes(tx.type) ? (
                    <ArrowDownLeft className="h-4 w-4" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{tx.description || tx.type.replace("_", " ")}</p>
                  <p className="text-xs text-gray-400">{formatDateTime(tx.createdAt)}</p>
                </div>
              </div>
              <span className={`text-sm font-semibold ${
                ["PAYMENT", "WALLET_TOPUP", "DIVIDEND"].includes(tx.type) ? "text-emerald-600" : "text-red-600"
              }`}>
                {["PAYMENT", "WALLET_TOPUP", "DIVIDEND"].includes(tx.type) ? "+" : "-"}
                {formatCurrency(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
