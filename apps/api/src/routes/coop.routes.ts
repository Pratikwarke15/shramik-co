import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/asyncHandler";
import { createCoopSchema, updateCoopSettingsSchema, approveWorkerSchema, rejectWorkerSchema } from "../schemas/coop.schemas";
import * as coopService from "../services/coop.service";
import * as disputeService from "../services/dispute.service";
import * as workerService from "../services/worker.service";

const router = Router();

router.post("/", authenticate, authorize("MINISTRY_SUPER_ADMIN"), validate(createCoopSchema), asyncHandler(async (req, res) => {
  const coop = await coopService.createCoop(req.body);
  res.status(201).json({ success: true, message: "Co-op created", data: coop });
}));

router.get("/me", authenticate, authorize("COOP_ADMIN", "MINISTRY_SUPER_ADMIN"), asyncHandler(async (req, res) => {
  const coop = await coopService.getCoopByAdmin(req.user!.id);
  res.json({ success: true, data: coop });
}));

router.get("/services", asyncHandler(async (req, res) => {
  const services = await coopService.listServices({
    coopId: req.query.coopId as string | undefined,
    category: req.query.category as string | undefined,
  });
  res.json({ success: true, data: services });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const coop = await coopService.getCoop(req.params.id);
  res.json({ success: true, data: coop });
}));

router.get("/:id/workers", authenticate, authorize("COOP_ADMIN", "MINISTRY_SUPER_ADMIN"), asyncHandler(async (req, res) => {
  await coopService.assertCoopAccess(req.user!.id, req.user!.role, req.params.id);
  const workers = await coopService.getCoopWorkers(req.params.id, req.query.status as string | undefined);
  res.json({ success: true, data: workers });
}));

router.get("/:id/dashboard", authenticate, authorize("COOP_ADMIN", "MINISTRY_SUPER_ADMIN"), asyncHandler(async (req, res) => {
  await coopService.assertCoopAccess(req.user!.id, req.user!.role, req.params.id);
  const dashboard = await coopService.getCoopDashboard(req.params.id);
  res.json({ success: true, data: dashboard });
}));

router.patch("/:id/settings", authenticate, authorize("COOP_ADMIN", "MINISTRY_SUPER_ADMIN"), validate(updateCoopSettingsSchema), asyncHandler(async (req, res) => {
  await coopService.assertCoopAccess(req.user!.id, req.user!.role, req.params.id);
  const coop = await coopService.updateCoopSettings(req.params.id, req.body);
  res.json({ success: true, message: "Settings updated", data: coop });
}));

router.get("/:id/disputes", authenticate, authorize("COOP_ADMIN", "MINISTRY_SUPER_ADMIN"), asyncHandler(async (req, res) => {
  await coopService.assertCoopAccess(req.user!.id, req.user!.role, req.params.id);
  const disputes = await disputeService.getCoopDisputes(req.params.id, req.query.status as string | undefined);
  res.json({ success: true, data: disputes });
}));

router.post("/:id/dividends", authenticate, authorize("COOP_ADMIN", "MINISTRY_SUPER_ADMIN"), asyncHandler(async (req, res) => {
  await coopService.assertCoopAccess(req.user!.id, req.user!.role, req.params.id);
  const { period } = req.body;
  if (!period) { res.status(400).json({ success: false, error: "Period is required" }); return; }
  const dividends = await coopService.calculateDividends(req.params.id, period);
  res.json({ success: true, message: "Dividends calculated", data: dividends });
}));

router.post("/:id/workers/:workerId/approve", authenticate, authorize("COOP_ADMIN", "MINISTRY_SUPER_ADMIN"), validate(approveWorkerSchema), asyncHandler(async (req, res) => {
  await coopService.assertCoopAccess(req.user!.id, req.user!.role, req.params.id);
  const worker = await workerService.approveWorker(req.params.workerId, req.params.id, req.body.note);
  res.json({ success: true, message: "Worker approved", data: worker });
}));

router.post("/:id/workers/:workerId/reject", authenticate, authorize("COOP_ADMIN", "MINISTRY_SUPER_ADMIN"), validate(rejectWorkerSchema), asyncHandler(async (req, res) => {
  await coopService.assertCoopAccess(req.user!.id, req.user!.role, req.params.id);
  const worker = await workerService.rejectWorker(req.params.workerId, req.params.id, req.body.reason);
  res.json({ success: true, message: "Worker rejected", data: worker });
}));

export default router;
