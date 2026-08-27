import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { verifyAadhaar, fetchDigilockerDocument } from "../lib/digilocker";
import { logger } from "../lib/logger";

// ---------- DigiLocker verification (dummy — any 12-digit Aadhaar passes) ----------
// In production, replace this with the real DigiLocker API call.
// The current mock returns { verified: true } for any valid 12-digit number.
// Future integration: call DigiLocker REST API with OAuth2 token, Aadhaar number, document type.
export async function verifyDigilocker(aadhaarNumber: string): Promise<{
  verified: boolean;
  name: string;
  dob: string;
  gender: string;
  address: string;
  digilockerRef: string;
}> {
  const result = await verifyAadhaar(aadhaarNumber);
  if (!result.verified) {
    throw new AppError("DigiLocker verification failed: invalid Aadhaar number", 400);
  }
  // Fetch mock document data (in production, fetch from DigiLocker API)
  const docResult = await fetchDigilockerDocument("AADHAAR", aadhaarNumber);
  const ref = `DL-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  logger.info(`DigiLocker verification: Aadhaar ${aadhaarNumber.slice(0, 4)}**** verified, ref=${ref}`);
  return {
    verified: true,
    name: docResult.data?.name as string || result.name,
    dob: docResult.data?.dob as string || result.dob,
    gender: (docResult.data?.gender as string) || "M",
    address: (docResult.data?.address as string) || "Address on file",
    digilockerRef: ref,
  };
}

// ---------- Aadhaar OTP verification (dummy — any 6-digit OTP passes) ----------
// In production, replace with UIDAI Aadhaar OTP API:
//   1. Send OTP via UIDAI: POST https://api.uidai.gov.in/aadhaar/api/v2/otp/send
//   2. Verify OTP: POST https://api.uidai.gov.in/aadhaar/api/v2/otp/verify
// The current mock returns verified: true for any 6-digit code.
export async function verifyAadhaarOtp(aadhaarNumber: string, otp: string): Promise<{
  verified: boolean;
  name: string;
  dob: string;
}> {
  if (!/^\d{12}$/.test(aadhaarNumber)) {
    throw new AppError("Invalid Aadhaar number format", 400);
  }
  if (!/^\d{6}$/.test(otp)) {
    throw new AppError("OTP must be exactly 6 digits", 400);
  }
  // Dummy: accept any 6-digit OTP
  // In production: call UIDAI API to verify the OTP against the Aadhaar number
  const result = await verifyAadhaar(aadhaarNumber);
  logger.info(`Aadhaar OTP verification: ${aadhaarNumber.slice(0, 4)}**** OTP=${otp.slice(0, 2)}**** verified`);
  return {
    verified: true,
    name: result.name,
    dob: result.dob,
  };
}

// ---------- Consumer profile verification ----------
export async function verifyConsumerProfile(
  userId: string,
  data: {
    aadhaarNumber: string;
    kycDocumentUrl?: string;
    latitude?: number;
    longitude?: number;
    defaultAddress?: string;
  }
): Promise<any> {
  const profile = await prisma.consumerProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError("Consumer profile not found", 404);

  const digilockerResult = await verifyAadhaar(data.aadhaarNumber);
  const updated = await prisma.consumerProfile.update({
    where: { userId },
    data: {
      aadhaarNumber: data.aadhaarNumber,
      aadhaarVerified: digilockerResult.verified,
      aadhaarName: digilockerResult.name,
      aadhaarDob: digilockerResult.dob,
      digilockerRef: `DL-${Date.now()}`,
      kycDocumentUrl: data.kycDocumentUrl || profile.kycDocumentUrl,
      kycStatus: data.kycDocumentUrl ? "VERIFIED" : profile.kycStatus,
      phoneVerified: true,
      latitude: data.latitude ?? profile.latitude,
      longitude: data.longitude ?? profile.longitude,
      defaultAddress: data.defaultAddress ?? profile.defaultAddress,
    },
    include: { user: { select: { id: true, name: true, phone: true } } },
  });
  logger.info(`Consumer ${userId} verified: Aadhaar=${data.aadhaarNumber.slice(0, 4)}****`);
  return updated;
}

// ---------- Get consumer verification status ----------
export async function getConsumerVerificationStatus(userId: string): Promise<any> {
  const profile = await prisma.consumerProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError("Consumer profile not found", 404);
  return {
    phoneVerified: profile.phoneVerified,
    kycStatus: profile.kycStatus,
    aadhaarVerified: profile.aadhaarVerified,
    digilockerRef: profile.digilockerRef,
    fullyVerified: profile.phoneVerified && profile.aadhaarVerified,
  };
}

export default { verifyDigilocker, verifyAadhaarOtp, verifyConsumerProfile, getConsumerVerificationStatus };
