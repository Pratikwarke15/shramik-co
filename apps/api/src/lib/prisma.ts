import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";
import { logger } from "./logger";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function connectDatabase(): Promise<void> {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await prisma.$connect();
      logger.info("Database connected successfully");
      return;
    } catch (err: any) {
      logger.error(`Database connection attempt ${attempt}/5 failed: ${err.message}`);
      if (attempt < 5) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
  }
  logger.error("Failed to connect to database after 5 attempts");
}

export default prisma;
