import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import * as disputeService from "../services/dispute.service";

const router = Router();

router.post("/", authenticate, asyncHandler(async (req, res) => {
  const { bookingId, category, description, priority, evidence } = req.body;
  if (!bookingId || !category || !description) {
    res.status(400).json({ success: false, error: "bookingId, category, and description required" });
    return;
  }
  const dispute = await disputeService.createDispute(bookingId, req.user!.id, { category, description, priority, evidence });
  res.status(201).json({ success: true, message: "Dispute created", data: dispute });
}));

router.get("/:id", authenticate, asyncHandler(async (req, res) => {
  const dispute = await disputeService.getDispute(req.params.id);
  res.json({ success: true, data: dispute });
}));

router.patch("/:id/status", authenticate, authorize("COOP_ADMIN", "MINISTRY_SUPER_ADMIN"), asyncHandler(async (req, res) => {
  const { status, resolution } = req.body;
  if (!status) { res.status(400).json({ success: false, error: "status required" }); return; }
  const dispute = await disputeService.updateDisputeStatus(req.params.id, req.user!.id, status, resolution);
  res.json({ success: true, message: "Dispute updated", data: dispute });
}));

export default router;
