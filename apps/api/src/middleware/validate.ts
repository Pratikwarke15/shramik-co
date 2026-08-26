import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formatted: Record<string, string[]> = {};
        error.errors.forEach((err) => {
          const path = err.path.join(".");
          if (!formatted[path]) {
            formatted[path] = [];
          }
          formatted[path].push(err.message);
        });

        res.status(400).json({
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

export default validate;
