"use client";

import { WalletBalance } from "@/components/dashboard/WalletBalance";
import type { WalletTransaction } from "@/lib/types";

const mockTransactions: WalletTransaction[] = [
  { id: "t1", workerId: "w1", type: "WALLET_TOPUP", amount: 2000, balanceAfter: 5000, description: "UPI Top-up", createdAt: new Date().toISOString() },
  { id: "t2", workerId: "w1", type: "PAYMENT", amount: 500, balanceAfter: 3000, description: "Booking CG-A1B2C3D4", createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "t3", workerId: "w1", type: "PAYMENT", amount: 350, balanceAfter: 2500, description: "Booking CG-E5F6G7H8", createdAt: new Date(Date.now() - 172800000).toISOString() },
];

export default function ConsumerWalletPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 font-heading">My Wallet</h1>
      <WalletBalance
        balance={3000}
        transactions={mockTransactions}
        onTopUp={() => alert("UPI integration coming soon!")}
      />
    </div>
  );
}
