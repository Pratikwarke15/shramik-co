import { Router } from "express";
import multer from "multer";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { uploadFile } from "../lib/storage";
import prisma from "../lib/prisma";

const router = Router();

const kycUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    cb(null, allowed.includes(file.mimetype));
  },
});

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png"];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.post("/kyc", authenticate, authorize("WORKER"), kycUpload.single("file"), asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: "No file provided" });
    return;
  }
  const wp = await prisma.workerProfile.findUnique({ where: { userId: req.user!.id } });
  if (!wp) {
    res.status(404).json({ success: false, error: "Worker profile not found" });
    return;
  }
  const { url, path } = await uploadFile("kyc-documents", req.file.buffer, req.file.originalname, req.file.mimetype);
  const fileUpload = await prisma.fileUpload.create({
    data: {
      userId: req.user!.id,
      fileName: path,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url,
      bucket: "kyc-documents",
      purpose: "KYC",
    },
  });
  await prisma.workerProfile.update({
    where: { id: wp.id },
    data: { kycDocumentUrl: url, kycStatus: "UNDER_REVIEW" },
  });
  res.json({ success: true, data: { url, fileUpload } });
}));

router.post("/profile-photo", authenticate, photoUpload.single("file"), asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: "No file provided" });
    return;
  }
  const { url, path } = await uploadFile("profile-photos", req.file.buffer, req.file.originalname, req.file.mimetype);
  const fileUpload = await prisma.fileUpload.create({
    data: {
      userId: req.user!.id,
      fileName: path,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url,
      bucket: "profile-photos",
      purpose: "PROFILE_PHOTO",
    },
  });
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { avatarUrl: url },
  });
  res.json({ success: true, data: { url, fileUpload } });
}));

export default router;
