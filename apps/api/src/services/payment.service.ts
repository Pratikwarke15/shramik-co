import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { env } from "../config/env";
import { broadcastToWorker } from "../lib/websocket";
import { v4 as uuidv4 } from "uuid";
import Razorpay from "razorpay";
import crypto from "crypto";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function createOrder(amountInPaise: number, receipt: string) {
  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency: "INR",
    receipt,
  });
  return order;
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const body = orderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex");
  return expectedSignature === signature;
}

export async function processRefund(paymentId: string, amount?: number) {
  const refund = await razorpay.payments.refund(paymentId, amount ? { amount } : {});
  return refund;
}

export async function getPaymentDetails(paymentId: string) {
  return await razorpay.payments.fetch(paymentId);
}

export async function initiatePayment(bookingId: string): Promise<any> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: { include: { coop: true } } },
  });

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  if (booking.paymentStatus !== "PENDING" && booking.paymentStatus !== "FAILED") {
    throw new AppError("Payment already initiated or completed", 409);
  }

  const commissionRate = Math.min(Number(booking.commissionRate), env.MAX_COMMISSION_RATE);
  const finalPrice = booking.finalPrice || booking.quotedPrice;
  const commissionAmount = Number(finalPrice) * (commissionRate / 100);
  const workerPayout = Number(finalPrice) - commissionAmount;

  const mockVpa = `coopgig-${uuidv4().slice(0, 8)}@upi`;

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      paymentStatus: "HELD_IN_ESCROW",
      finalPrice: Number(finalPrice),
      commissionRate,
      commissionAmount,
      workerPayout,
      paymentRef: `UPI-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`,
    },
    include: {
      service: true,
      worker: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  return {
    bookingId: updated.id,
    bookingRef: updated.bookingRef,
    amount: Number(finalPrice),
    commissionAmount,
    workerPayout,
    paymentRef: updated.paymentRef,
    mockVpa,
    status: "HELD_IN_ESCROW",
  };
}

export async function confirmPayment(
  bookingId: string,
  paymentRef: string
): Promise<any> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { worker: true },
  });

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  if (booking.paymentStatus === "COMPLETED") {
    throw new AppError("Payment already confirmed", 409);
  }

  if (booking.paymentStatus !== "HELD_IN_ESCROW") {
    throw new AppError("Payment must be in escrow before confirmation", 400);
  }

  if (!booking.workerId || !booking.worker) {
    throw new AppError("No worker assigned to this booking", 400);
  }

  const workerPayout = Number(booking.workerPayout || 0);

  const result = await prisma.$transaction(async (tx) => {
    const updatedBooking = await tx.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: "COMPLETED",
        paymentRef,
      },
    });

    const currentWorker = await tx.workerProfile.findUnique({
      where: { id: booking.workerId! },
    });

    if (!currentWorker) {
      throw new AppError("Worker profile not found", 404);
    }

    const newBalance = Number(currentWorker.walletBalance) + workerPayout;

    await tx.workerProfile.update({
      where: { id: booking.workerId! },
      data: {
        walletBalance: newBalance,
        totalEarnings: Number(currentWorker.totalEarnings) + workerPayout,
        totalJobs: currentWorker.totalJobs + 1,
      },
    });

    const transaction = await tx.walletTransaction.create({
      data: {
        workerId: booking.workerId!,
        bookingId,
        type: "PAYMENT",
        amount: workerPayout,
        balanceAfter: newBalance,
        description: `Payment for booking ${booking.bookingRef}`,
        reference: paymentRef,
      },
    });

    return { updatedBooking, transaction, newBalance };
  });

  broadcastToWorker(booking.workerId!, {
    type: "payment_received",
    amount: workerPayout,
    bookingRef: booking.bookingRef,
    newBalance: result.newBalance,
  });

  return {
    bookingId: result.updatedBooking.id,
    paymentStatus: result.updatedBooking.paymentStatus,
    workerPayout,
    transactionId: result.transaction.id,
    newBalance: result.newBalance,
  };
}

export async function calculateCommission(
  amount: number,
  coopId: string
): Promise<{ commissionRate: number; commissionAmount: number; workerPayout: number }> {
  const coop = await prisma.coOp.findUnique({ where: { id: coopId } });

  if (!coop) {
    throw new AppError("Co-op not found", 404);
  }

  const commissionRate = Math.min(Number(coop.commissionRate), env.MAX_COMMISSION_RATE);
  const commissionAmount = Math.round(amount * (commissionRate / 100) * 100) / 100;
  const workerPayout = Math.round((amount - commissionAmount) * 100) / 100;

  return { commissionRate, commissionAmount, workerPayout };
}

export async function processPayout(
  workerId: string,
  amount: number
): Promise<any> {
  const worker = await prisma.workerProfile.findUnique({
    where: { id: workerId },
  });

  if (!worker) {
    throw new AppError("Worker profile not found", 404);
  }

  if (Number(worker.walletBalance) < amount) {
    throw new AppError("Insufficient wallet balance", 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const currentWorker = await tx.workerProfile.findUnique({
      where: { id: workerId },
    });

    if (!currentWorker) {
      throw new AppError("Worker not found", 404);
    }

    const newBalance = Number(currentWorker.walletBalance) - amount;

    const updatedWorker = await tx.workerProfile.update({
      where: { id: workerId },
      data: { walletBalance: newBalance },
    });

    const transaction = await tx.walletTransaction.create({
      data: {
        workerId,
        type: "PAYOUT",
        amount: -amount,
        balanceAfter: newBalance,
        description: `Payout to worker`,
        reference: `PO-${Date.now()}`,
      },
    });

    return { updatedWorker, transaction, newBalance };
  });

  return {
    workerId,
    amount,
    newBalance: result.newBalance,
    transactionId: result.transaction.id,
  };
}

export async function getWalletBalance(workerId: string): Promise<any> {
  const worker = await prisma.workerProfile.findUnique({
    where: { id: workerId },
    select: {
      walletBalance: true,
      totalEarnings: true,
    },
  });

  if (!worker) {
    throw new AppError("Worker profile not found", 404);
  }

  return {
    walletBalance: Number(worker.walletBalance),
    totalEarnings: Number(worker.totalEarnings),
  };
}

export async function getTransactionHistory(
  workerId: string,
  filters?: {
    type?: string;
    page?: number;
    limit?: number;
  }
): Promise<{ transactions: any[]; total: number; page: number; limit: number }> {
  const worker = await prisma.workerProfile.findUnique({
    where: { id: workerId },
  });

  if (!worker) {
    throw new AppError("Worker profile not found", 404);
  }

  const page = filters?.page || 1;
  const limit = Math.min(filters?.limit || 20, 100);
  const skip = (page - 1) * limit;

  const where: Prisma.WalletTransactionWhereInput = { workerId };

  if (filters?.type) {
    where.type = filters.type as Prisma.EnumTransactionTypeFilter["equals"];
  }

  const [transactions, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where,
      include: {
        booking: { select: { id: true, bookingRef: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.walletTransaction.count({ where }),
  ]);

  return {
    transactions: transactions.map((t) => ({
      ...t,
      amount: Number(t.amount),
      balanceAfter: Number(t.balanceAfter),
    })),
    total,
    page,
    limit,
  };
}

export default {
  initiatePayment,
  confirmPayment,
  calculateCommission,
  processPayout,
  getWalletBalance,
  getTransactionHistory,
  createOrder,
  verifyPaymentSignature,
  processRefund,
  getPaymentDetails,
};
