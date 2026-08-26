import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/asyncHandler";
import { createBookingSchema, updateBookingStatusSchema, rateBookingSchema } from "../schemas/booking.schemas";
import * as bookingService from "../services/booking.service";
import prisma from "../lib/prisma";

const router = Router();

router.post("/", authenticate, authorize("CONSUMER"), validate(createBookingSchema), asyncHandler(async (req, res) => {
  const booking = await bookingService.createBooking(req.user!.id, req.body);
  res.status(201).json({ success: true, message: "Booking created", data: booking });
}));

router.get("/", authenticate, asyncHandler(async (req, res) => {
  const bookings = await bookingService.getUserBookings(req.user!.id, req.user!.role);
  res.json({ success: true, data: bookings });
}));

router.get("/nearby-workers", asyncHandler(async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radius = parseFloat(req.query.radius as string) || 10;
  const skills = req.query.skills ? (req.query.skills as string).split(",").map(s => s.trim()) : undefined;
  const coopId = req.query.coopId as string | undefined;
  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ success: false, error: "lat and lng are required" });
    return;
  }
  const workers = await bookingService.getNearbyWorkers(lat, lng, radius, skills, coopId);
  res.json({ success: true, data: workers });
}));

router.get("/:id", authenticate, asyncHandler(async (req, res) => {
  const booking = await bookingService.getBooking(req.params.id);
  res.json({ success: true, data: booking });
}));

router.patch("/:id/status", authenticate, authorize("WORKER"), validate(updateBookingStatusSchema), asyncHandler(async (req, res) => {
  const workerProfile = await prisma.workerProfile.findUnique({ where: { userId: req.user!.id } });
  if (!workerProfile) { res.status(404).json({ success: false, error: "Worker profile not found" }); return; }
  const booking = await bookingService.updateBookingStatus(req.params.id, workerProfile.id, req.body.status);
  res.json({ success: true, message: "Status updated", data: booking });
}));

router.post("/:id/rate", authenticate, authorize("CONSUMER"), validate(rateBookingSchema), asyncHandler(async (req, res) => {
  const review = await bookingService.rateBooking(req.params.id, req.user!.id, req.body.rating, req.body.comment);
  res.status(201).json({ success: true, message: "Review submitted", data: review });
}));

router.post("/:id/cancel", authenticate, authorize("CONSUMER"), asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason) { res.status(400).json({ success: false, error: "Reason is required" }); return; }
  const booking = await bookingService.cancelBooking(req.params.id, req.user!.id, reason);
  res.json({ success: true, message: "Booking cancelled", data: booking });
}));

export default router;
