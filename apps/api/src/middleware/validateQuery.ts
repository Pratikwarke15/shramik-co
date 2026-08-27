import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formatted: Record<string, string[]> = {};
        error.errors.forEach((err) => {
          const path = err.path.join(".");
          if (!formatted[path]) formatted[path] = [];
          formatted[path].push(err.message);
        });
        _res.status(400).json({
          success: false,
          error: "Validation failed",
          details: formatted,
        });
        return;
      }
      next(error);
    }
  };
}

export default validateQuery;
