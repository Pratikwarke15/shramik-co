import { z } from "zod";

export const forecastQuerySchema = z.object({
  coopId: z.string().uuid().optional(),
  category: z.string().optional(),
  days: z.coerce.number().int().min(1).max(30).optional(),
  temperatureC: z.coerce.number().optional(),
  condition: z.enum(["CLEAR", "CLOUDY", "RAIN", "HEAVY_RAIN", "HEATWAVE", "COLD"]).optional(),
});

export type ForecastQuery = z.infer<typeof forecastQuerySchema>;
