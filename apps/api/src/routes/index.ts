import { Router } from "express";
import authRoutes from "./auth.routes";
import bookingRoutes from "./booking.routes";
import workerRoutes from "./worker.routes";
import coopRoutes from "./coop.routes";
import paymentRoutes from "./payment.routes";
import disputeRoutes from "./dispute.routes";
import socialSecurityRoutes from "./social-security.routes";
import uploadRoutes from "./upload.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/bookings", bookingRoutes);
router.use("/workers", workerRoutes);
router.use("/coops", coopRoutes);
router.use("/payments", paymentRoutes);
router.use("/disputes", disputeRoutes);
router.use("/social-security", socialSecurityRoutes);
router.use("/uploads", uploadRoutes);

export default router;
