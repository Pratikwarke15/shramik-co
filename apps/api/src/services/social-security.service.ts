import { SocialSecurityFundType } from "@prisma/client";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { env } from "../config/env";

const FUND_TYPES: SocialSecurityFundType[] = [
  "EMERGENCY_HEALTH",
  "INSURANCE",
  "WELFARE",
  "EDUCATION",
  "RETIREMENT",
];

export async function getWorkerContributions(workerId: string): Promise<any[]> {
  const worker = await prisma.workerProfile.findUnique({
    where: { id: workerId },
  });

  if (!worker) {
    throw new AppError("Worker profile not found", 404);
  }

  let vaults = await prisma.socialSecurityVault.findMany({
    where: { workerId },
  });

  if (vaults.length === 0) {
    vaults = await Promise.all(
      FUND_TYPES.map((fundType) =>
        prisma.socialSecurityVault.create({
          data: {
            workerId,
            fundType,
            totalContributed: 0,
            employerMatch: 0,
            balance: 0,
            isOptedIn: false,
          },
        })
      )
    );
  }

  return vaults.map((v) => ({
    ...v,
    totalContributed: Number(v.totalContributed),
    employerMatch: Number(v.employerMatch),
    balance: Number(v.balance),
  }));
}

export async function toggleOptIn(
  workerId: string,
  fundType: SocialSecurityFundType,
  optedIn: boolean
): Promise<any> {
  const worker = await prisma.workerProfile.findUnique({
    where: { id: workerId },
  });

  if (!worker) {
    throw new AppError("Worker profile not found", 404);
  }

  if (!FUND_TYPES.includes(fundType)) {
    throw new AppError("Invalid fund type", 400);
  }

  let vault = await prisma.socialSecurityVault.findUnique({
    where: {
      workerId_fundType: { workerId, fundType },
    },
  });

  if (!vault) {
    vault = await prisma.socialSecurityVault.create({
      data: {
        workerId,
        fundType,
        totalContributed: 0,
        employerMatch: 0,
        balance: 0,
        isOptedIn: optedIn,
      },
    });
  } else {
    vault = await prisma.socialSecurityVault.update({
      where: { id: vault.id },
      data: { isOptedIn: optedIn },
    });
  }

  return {
    ...vault,
    totalContributed: Number(vault.totalContributed),
    employerMatch: Number(vault.employerMatch),
    balance: Number(vault.balance),
  };
}

export async function deductContribution(
  bookingId: string,
  workerId: string,
  workerPayoutAmount: number
): Promise<{ totalDeducted: number; deductions: any[] }> {
  const worker = await prisma.workerProfile.findUnique({
    where: { id: workerId },
  });

  if (!worker) {
    throw new AppError("Worker profile not found", 404);
  }

  const vaults = await prisma.socialSecurityVault.findMany({
    where: { workerId, isOptedIn: true },
  });

  if (vaults.length === 0) {
    return { totalDeducted: 0, deductions: [] };
  }

  const rate = env.SOCIAL_SECURITY_RATE;
  const deductions: any[] = [];
  let totalDeducted = 0;

  for (const vault of vaults) {
    const deductionAmount = Math.round(workerPayoutAmount * rate * 100) / 100;

    if (deductionAmount <= 0) continue;

    const employerMatch = Math.round(deductionAmount * 0.5 * 100) / 100;
    const newBalance =
      Number(vault.balance) + deductionAmount + employerMatch;
    const newTotalContributed =
      Number(vault.totalContributed) + deductionAmount;
    const newEmployerMatch = Number(vault.employerMatch) + employerMatch;

    await prisma.socialSecurityVault.update({
      where: { id: vault.id },
      data: {
        balance: newBalance,
        totalContributed: newTotalContributed,
        employerMatch: newEmployerMatch,
      },
    });

    await prisma.walletTransaction.create({
      data: {
        workerId,
        bookingId,
        type: "SOCIAL_SECURITY_DEDUCTION",
        amount: -deductionAmount,
        balanceAfter: Number(worker.walletBalance) - totalDeducted - deductionAmount,
        description: `Social security contribution: ${vault.fundType}`,
        reference: `SS-${vault.fundType}-${Date.now()}`,
      },
    });

    totalDeducted += deductionAmount;
    deductions.push({
      fundType: vault.fundType,
      deducted: deductionAmount,
      employerMatch,
      newBalance,
    });
  }

  return { totalDeducted, deductions };
}

export async function getContributionHistory(
  workerId: string,
  fundType: SocialSecurityFundType
): Promise<any> {
  const worker = await prisma.workerProfile.findUnique({
    where: { id: workerId },
  });

  if (!worker) {
    throw new AppError("Worker profile not found", 404);
  }

  const vault = await prisma.socialSecurityVault.findUnique({
    where: {
      workerId_fundType: { workerId, fundType },
    },
  });

  if (!vault) {
    throw new AppError("No vault found for this fund type", 404);
  }

  const transactions = await prisma.walletTransaction.findMany({
    where: {
      workerId,
      type: "SOCIAL_SECURITY_DEDUCTION",
      reference: { contains: fundType },
    },
    include: {
      booking: { select: { id: true, bookingRef: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    vault: {
      ...vault,
      totalContributed: Number(vault.totalContributed),
      employerMatch: Number(vault.employerMatch),
      balance: Number(vault.balance),
    },
    transactions: transactions.map((t) => ({
      ...t,
      amount: Number(t.amount),
      balanceAfter: Number(t.balanceAfter),
    })),
  };
}

export default {
  getWorkerContributions,
  toggleOptIn,
  deductContribution,
  getContributionHistory,
};
