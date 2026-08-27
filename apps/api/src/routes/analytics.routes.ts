import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validateQuery } from "../middleware/validateQuery";
import { asyncHandler } from "../middleware/asyncHandler";
import { forecastQuerySchema } from "../schemas/forecast.schemas";
import * as forecastService from "../services/forecast.service";

const router = Router();

router.get(
  "/demand-forecast",
  authenticate,
  authorize("COOP_ADMIN", "MINISTRY_SUPER_ADMIN"),
  validateQuery(forecastQuerySchema),
  asyncHandler(async (req, res) => {
    const { coopId, category, days, temperatureC, condition } = req.query as Record<string, any>;
    const result = await forecastService.forecastDemand({
      coopId,
      category,
      days: days ? Number(days) : undefined,
      weather:
        temperatureC !== undefined || condition
          ? { temperatureC: temperatureC !== undefined ? Number(temperatureC) : undefined, condition }
          : undefined,
    });
    res.json({ success: true, data: result });
  })
);

export default router;
