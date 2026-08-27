import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/asyncHandler";
import { sendOtpSchema, verifyOtpSchema, registerSchema, loginSchema } from "../schemas/auth.schemas";
import * as authService from "../services/auth.service";

const router = Router();

router.post("/send-otp", validate(sendOtpSchema), asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const result = await authService.generateOTP(phone);
  res.json({ success: true, message: "OTP sent successfully", data: { expiresAt: result.expiresAt } });
}));

router.post("/verify-otp", validate(verifyOtpSchema), asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  const result = await authService.verifyOTP(phone, otp);
  if (result.token) {
    res.json({ success: true, message: "OTP verified and logged in", data: { token: result.token, user: result.user } });
  } else {
    res.json({ success: true, message: "OTP verified. Please complete registration.", data: { verified: true } });
  }
}));

router.post("/register", validate(registerSchema), asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json({ success: true, message: "User registered successfully", data: result });
}));

router.post("/login", validate(loginSchema), asyncHandler(async (req, res) => {
  const { phone, password } = req.body;
  const result = await authService.login(phone, password);
  res.json({ success: true, message: "Login successful", data: result });
}));

router.post("/refresh", asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    res.status(400).json({ success: false, error: "Token is required" });
    return;
  }
  const result = await authService.refreshToken(token);
  res.json({ success: true, message: "Token refreshed", data: result });
}));

router.get("/me", authenticate, asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user!.id);
  res.json({ success: true, data: user });
}));

export default router;
