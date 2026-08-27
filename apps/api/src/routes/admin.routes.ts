import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/asyncHandler";
import {
  getMinistryStats,
  listCoops,
  listAllWorkers,
  approveWorkerByAdmin,
  rejectWorkerByAdmin,
} from "../services/admin.service";

const router = Router();

router.use(authenticate, authorize("MINISTRY_SUPER_ADMIN"));

router.get("/stats", asyncHandler(async (_req, res) => {
  const stats = await getMinistryStats();
  res.json({ success: true, data: stats });
}));

router.get("/coops", asyncHandler(async (_req, res) => {
  const coops = await listCoops();
  res.json({ success: true, data: coops });
}));

router.get("/workers", asyncHandler(async (req, res) => {
  const { status, q } = req.query as { status?: string; q?: string };
  const workers = await listAllWorkers(status, q);
  res.json({ success: true, data: workers });
}));

const approveSchema = z.object({
  note: z.string().optional(),
});

router.post("/workers/:workerId/approve", validate(approveSchema), asyncHandler(async (req, res) => {
  const { workerId } = req.params;
  const { note } = req.body;
  const worker = await approveWorkerByAdmin(workerId, note);
  res.json({ success: true, data: worker });
}));

const rejectSchema = z.object({
  reason: z.string().min(3, "Reason is required"),
});

router.post("/workers/:workerId/reject", validate(rejectSchema), asyncHandler(async (req, res) => {
  const { workerId } = req.params;
  const { reason } = req.body;
  const worker = await rejectWorkerByAdmin(workerId, reason);
  res.json({ success: true, data: worker });
}));

export default router;