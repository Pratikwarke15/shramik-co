import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import logger from "../lib/logger";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

function formatZodErrors(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};
  error.errors.forEach((err) => {
    const path = err.path.join(".");
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(err.message);
  });
  return formatted;
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    const formatted = formatZodErrors(err);
    res.status(400).json({
      success: false,
      error: "Validation failed",
      details: formatted,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2025":
        res.status(404).json({
          success: false,
          error: "Resource not found",
        });
        return;
      case "P2002": {
        const target = (err.meta?.target as string[]) || [];
        res.status(409).json({
          success: false,
          error: `Duplicate value for: ${target.join(", ")}`,
        });
        return;
      }
      case "P2003":
        res.status(400).json({
          success: false,
          error: "Foreign key constraint failed",
        });
        return;
      default:
        logger.error(`Prisma error ${err.code}:`, err);
        res.status(500).json({
          success: false,
          error: "Database error",
        });
        return;
    }
  }

  if (err.name === "PrismaClientInitializationError" || err.name === "PrismaClientRustPanicError") {
    logger.error("Prisma connection/initialization error:", err);
    res.status(503).json({
      success: false,
      error: "Service temporarily unavailable. Please try again.",
    });
    return;
  }

  logger.error("Unhandled error:", err);

  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message;

  res.status(500).json({
    success: false,
    error: message,
  });
}

export default errorHandler;
