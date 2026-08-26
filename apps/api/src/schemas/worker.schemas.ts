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

export type RegisterWorkerInput = z.infer<typeof registerWorkerSchema>;
export type UpdateWorkerLocationInput = z.infer<typeof updateWorkerLocationSchema>;
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;
