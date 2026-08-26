import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import * as socialSecurityService from "../services/social-security.service";
import prisma from "../lib/prisma";

const router = Router();

router.get("/contributions", authenticate, authorize("WORKER"), asyncHandler(async (req, res) => {
  const wp = await prisma.workerProfile.findUnique({ where: { userId: req.user!.id } });
  if (!wp) { res.status(404).json({ success: false, error: "Worker profile not found" }); return; }
  const contributions = await socialSecurityService.getWorkerContributions(wp.id);
  res.json({ success: true, data: contributions });
}));

router.patch("/opt-in", authenticate, authorize("WORKER"), asyncHandler(async (req, res) => {
  const { fundType, optedIn } = req.body;
  if (!fundType || typeof optedIn !== "boolean") {
    res.status(400).json({ success: false, error: "fundType and optedIn required" }); return;
  }
  const wp = await prisma.workerProfile.findUnique({ where: { userId: req.user!.id } });
  if (!wp) { res.status(404).json({ success: false, error: "Worker profile not found" }); return; }
  const vault = await socialSecurityService.toggleOptIn(wp.id, fundType, optedIn);
  res.json({ success: true, message: optedIn ? "Opted in" : "Opted out", data: vault });
}));

router.get("/history/:fundType", authenticate, authorize("WORKER"), asyncHandler(async (req, res) => {
  const wp = await prisma.workerProfile.findUnique({ where: { userId: req.user!.id } });
  if (!wp) { res.status(404).json({ success: false, error: "Worker profile not found" }); return; }
  const history = await socialSecurityService.getContributionHistory(wp.id, req.params.fundType as any);
  res.json({ success: true, data: history });
}));

export default router;
