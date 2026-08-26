import { z } from "zod";

export const createCoopSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(200, "Name must be at most 200 characters"),
  registrationNo: z
    .string()
    .min(3, "Registration number must be at least 3 characters")
    .max(50, "Registration number must be at most 50 characters"),
  description: z
    .string()
    .max(2000, "Description must be at most 2000 characters")
    .optional(),
  address: z
    .string()
    .min(5, "Address must be at least 5 characters")
    .max(500, "Address must be at most 500 characters"),
  city: z
    .string()
    .min(2, "City must be at least 2 characters")
    .max(100, "City must be at most 100 characters"),
  state: z
    .string()
    .min(2, "State must be at least 2 characters")
    .max(100, "State must be at most 100 characters"),
  pincode: z
    .string()
    .regex(/^\d{6}$/, "Pincode must be exactly 6 digits"),
  latitude: z
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  longitude: z
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
  radiusKm: z
    .number()
    .min(1, "Radius must be at least 1 km")
    .max(100, "Radius must be at most 100 km")
    .optional()
    .default(10),
  commissionRate: z
    .number()
    .min(0, "Commission rate cannot be negative")
    .max(5, "Commission rate cannot exceed 5%")
    .optional()
    .default(5),
});

export const updateCoopSettingsSchema = z.object({
  radiusKm: z
    .number()
    .min(1, "Radius must be at least 1 km")
    .max(100, "Radius must be at most 100 km")
    .optional(),
  commissionRate: z
    .number()
    .min(0, "Commission rate cannot be negative")
    .max(5, "Commission rate cannot exceed 5%")
    .optional(),
  isActive: z.boolean().optional(),
});

export type CreateCoopInput = z.infer<typeof createCoopSchema>;
export type UpdateCoopSettingsInput = z.infer<typeof updateCoopSettingsSchema>;
