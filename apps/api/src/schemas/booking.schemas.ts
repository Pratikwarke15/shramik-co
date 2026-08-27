import { z } from "zod";

export const createBookingSchema = z.object({
  serviceId: z.string().uuid("Invalid service ID"),
  workerId: z.string().uuid("Invalid worker ID").optional(),
  address: z
    .string()
    .min(5, "Address must be at least 5 characters")
    .max(500, "Address must be at most 500 characters"),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters")
    .optional(),
  scheduledAt: z
    .string()
    .datetime("Invalid datetime format")
    .optional(),
  latitude: z
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  longitude: z
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(
    ["PENDING", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "COMPLETED", "CANCELLED", "DISPUTED"],
    { errorMap: () => ({ message: "Invalid booking status" }) }
  ),
});

export const rateBookingSchema = z.object({
  rating: z
    .number()
    .int("Rating must be an integer")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
  comment: z
    .string()
    .max(1000, "Comment must be at most 1000 characters")
    .optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
export type RateBookingInput = z.infer<typeof rateBookingSchema>;
