import { z } from "zod";

export const registerWorkerSchema = z.object({
  skillTags: z
    .array(z.string().min(1).max(50))
    .min(1, "At least one skill tag is required")
    .max(20, "Maximum 20 skill tags allowed"),
  bio: z
    .string()
    .max(1000, "Bio must be at most 1000 characters")
    .optional(),
  experienceYears: z
    .number()
    .int()
    .min(0, "Experience years cannot be negative")
    .max(50, "Experience years cannot exceed 50")
    .optional(),
  coopId: z.string().uuid("Invalid co-op ID").optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  workAddress: z.string().min(5, "Work address is required").max(500).optional(),
  aadhaarNumber: z
    .string()
    .regex(/^\d{12}$/, "Aadhaar number must be exactly 12 digits"),
  aadhaarName: z.string().min(2).max(100).optional(),
  kycDocumentUrl: z.string().url("Invalid document URL").optional(),
  digilockerRef: z.string().max(100).optional(),
});

export const updateWorkerLocationSchema = z.object({
  latitude: z
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  longitude: z
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
});

export const updateAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
  isOnDuty: z.boolean(),
});

export const verifyDigilockerSchema = z.object({
  aadhaarNumber: z
    .string()
    .regex(/^\d{12}$/, "Aadhaar number must be exactly 12 digits"),
});

export const verifyAadhaarOtpSchema = z.object({
  aadhaarNumber: z
    .string()
    .regex(/^\d{12}$/, "Aadhaar number must be exactly 12 digits"),
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only digits"),
});

export type RegisterWorkerInput = z.infer<typeof registerWorkerSchema>;
export type UpdateWorkerLocationInput = z.infer<typeof updateWorkerLocationSchema>;
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;
export type VerifyDigilockerInput = z.infer<typeof verifyDigilockerSchema>;
export type VerifyAadhaarOtpInput = z.infer<typeof verifyAadhaarOtpSchema>;
