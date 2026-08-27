import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import * as paymentService from "../services/payment.service";
import prisma from "../lib/prisma";

const router = Router();

router.post("/initiate", authenticate, asyncHandler(async (req, res) => {
  const { bookingId } = req.body;
  if (!bookingId) { res.status(400).json({ success: false, error: "bookingId required" }); return; }
  const payment = await paymentService.initiatePayment(bookingId);
  res.json({ success: true, message: "Payment initiated", data: payment });
}));

router.post("/confirm", authenticate, asyncHandler(async (req, res) => {
  const { bookingId, paymentRef } = req.body;
  if (!bookingId || !paymentRef) { res.status(400).json({ success: false, error: "bookingId and paymentRef required" }); return; }
  const result = await paymentService.confirmPayment(bookingId, paymentRef);
  res.json({ success: true, message: "Payment confirmed", data: result });
}));

router.get("/wallet", authenticate, authorize("WORKER"), asyncHandler(async (req, res) => {
  const wp = await prisma.workerProfile.findUnique({ where: { userId: req.user!.id } });
  if (!wp) { res.status(404).json({ success: false, error: "Worker profile not found" }); return; }
  const balance = await paymentService.getWalletBalance(wp.id);
  res.json({ success: true, data: balance });
}));

router.get("/transactions", authenticate, authorize("WORKER"), asyncHandler(async (req, res) => {
  const wp = await prisma.workerProfile.findUnique({ where: { userId: req.user!.id } });
  if (!wp) { res.status(404).json({ success: false, error: "Worker profile not found" }); return; }
  const transactions = await paymentService.getTransactionHistory(wp.id, {
    type: req.query.type as string | undefined,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  });
  res.json({ success: true, data: transactions });
}));

router.post("/create-order", authenticate, asyncHandler(async (req, res) => {
  const { amount, receipt } = req.body;
  if (!amount || !receipt) {
    res.status(400).json({ success: false, error: "amount (in paise) and receipt are required" });
    return;
  }
  const order = await paymentService.createOrder(amount, receipt);
  res.json({ success: true, data: order });
}));

router.post("/verify", authenticate, asyncHandler(async (req, res) => {
  const { orderId, paymentId, signature, bookingId } = req.body;
  if (!orderId || !paymentId || !signature || !bookingId) {
    res.status(400).json({ success: false, error: "orderId, paymentId, signature, and bookingId are required" });
    return;
  }
  const isValid = paymentService.verifyPaymentSignature(orderId, paymentId, signature);
  if (!isValid) {
    res.status(400).json({ success: false, error: "Invalid payment signature" });
    return;
  }
  const result = await paymentService.confirmPayment(bookingId, paymentId);
  res.json({ success: true, message: "Payment verified and confirmed", data: result });
}));

router.get("/key", (_req, res) => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) {
    res.status(500).json({ success: false, error: "Razorpay key not configured" });
    return;
  }
  res.json({ success: true, data: { keyId } });
});

// Dedicated signature-verification endpoint (used by the frontend checkout before confirming).
router.post("/verify-signature", authenticate, asyncHandler(async (req, res) => {
  const { orderId, paymentId, signature } = req.body;
  if (!orderId || !paymentId || !signature) {
    res.status(400).json({ success: false, error: "orderId, paymentId, and signature are required" });
    return;
  }
  const valid = paymentService.verifyPaymentSignature(orderId, paymentId, signature);
  if (!valid) {
    res.status(400).json({ success: false, error: "Invalid payment signature" });
    return;
  }
  res.json({ success: true, valid: true, message: "Signature verified" });
}));

export default router;
