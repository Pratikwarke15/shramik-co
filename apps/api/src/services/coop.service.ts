import { Dividend, Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../lib/logger";

export async function createCoop(data: {
  name: string;
  registrationNo: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  radiusKm?: number;
  commissionRate?: number;
}): Promise<any> {
  const existing = await prisma.coOp.findUnique({
    where: { registrationNo: data.registrationNo },
  });

  if (existing) {
    throw new AppError("Registration number already exists", 409);
  }

  const commissionRate = Math.min(data.commissionRate ?? 5, 5);

  const coop = await prisma.coOp.create({
    data: {
      name: data.name,
      registrationNo: data.registrationNo,
      description: data.description,
      address: data.address,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      latitude: data.latitude,
      longitude: data.longitude,
      radiusKm: data.radiusKm ?? 10,
      commissionRate,
      maxCommissionRate: 5,
    },
  });

  return formatCoop(coop);
}

export async function getCoop(coopId: string): Promise<any> {
  const coop = await prisma.coOp.findUnique({
    where: { id: coopId },
    include: {
      _count: {
        select: {
          workers: true,
          services: true,
        },
      },
    },
  });

  if (!coop) {
    throw new AppError("Co-op not found", 404);
  }

  return formatCoop({
    ...coop,
    workerCount: coop._count.workers,
    serviceCount: coop._count.services,
  });
}

export async function getCoopByAdmin(userId: string): Promise<any> {
  const admin = await prisma.coopAdminProfile.findUnique({
    where: { userId },
    include: {
      coop: {
        include: {
          _count: { select: { workers: true, services: true } },
        },
      },
    },
  });
  if (!admin || !admin.coop) {
    throw new AppError("No co-op found for this admin", 404);
  }
  const counts = (admin.coop as any)._count as { workers: number; services: number };
  return formatCoop({
    ...admin.coop,
    workerCount: counts.workers,
    serviceCount: counts.services,
  });
}

export async function assertCoopAccess(
  userId: string,
  role: string,
  coopId: string
): Promise<void> {
  if (role === "MINISTRY_SUPER_ADMIN") return;
  if (role !== "COOP_ADMIN") {
    throw new AppError("Insufficient permissions", 403);
  }
  const admin = await prisma.coopAdminProfile.findUnique({
    where: { userId },
    select: { coopId: true },
  });
  if (!admin || admin.coopId !== coopId) {
    throw new AppError("You can only manage your assigned co-op", 403);
  }
}

export async function listServices(filters?: {
  coopId?: string;
  category?: string;
  activeOnly?: boolean;
}): Promise<any[]> {
  const services = await prisma.service.findMany({
    where: {
      ...(filters?.coopId ? { coopId: filters.coopId } : {}),
      ...(filters?.category ? { categorySlug: filters.category } : {}),
      ...(filters?.activeOnly !== false ? { isActive: true, coop: { isActive: true } } : {}),
    },
    include: {
      coop: {
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          latitude: true,
          longitude: true,
          radiusKm: true,
          commissionRate: true,
          maxCommissionRate: true,
          isActive: true,
        },
      },
    },
    orderBy: [{ categoryName: "asc" }, { name: "asc" }],
  });

  return services.map((service) => ({
    ...service,
    basePrice: Number(service.basePrice),
    pricePerUnit: service.pricePerUnit ? Number(service.pricePerUnit) : undefined,
    minPrice: service.minPrice ? Number(service.minPrice) : undefined,
    maxPrice: service.maxPrice ? Number(service.maxPrice) : undefined,
    coop: service.coop
      ? {
          ...service.coop,
          commissionRate: Number(service.coop.commissionRate),
          maxCommissionRate: Number(service.coop.maxCommissionRate),
        }
      : null,
  }));
}

export async function getCoopWorkers(coopId: string, status?: string): Promise<any[]> {
  const coop = await prisma.coOp.findUnique({ where: { id: coopId } });
  if (!coop) {
    throw new AppError("Co-op not found", 404);
  }

  const workers = await prisma.workerProfile.findMany({
    where: { coopId, ...(status && status !== "ALL" ? { status: status as any } : {}) },
    include: {
      user: { select: { id: true, name: true, phone: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return workers.map((w) => ({
    ...w,
    totalEarnings: Number(w.totalEarnings),
    walletBalance: Number(w.walletBalance),
  }));
}

export async function updateCoopSettings(
  coopId: string,
  settings: {
    radiusKm?: number;
    commissionRate?: number;
    isActive?: boolean;
  }
): Promise<any> {
  const coop = await prisma.coOp.findUnique({ where: { id: coopId } });
  if (!coop) {
    throw new AppError("Co-op not found", 404);
  }

  const updateData: Prisma.CoOpUpdateInput = {};

  if (settings.radiusKm !== undefined) {
    updateData.radiusKm = settings.radiusKm;
  }
  if (settings.commissionRate !== undefined) {
    updateData.commissionRate = Math.min(settings.commissionRate, 5);
  }
  if (settings.isActive !== undefined) {
    updateData.isActive = settings.isActive;
  }

  const updated = await prisma.coOp.update({
    where: { id: coopId },
    data: updateData,
  });

  return formatCoop(updated);
}

export async function getCoopDashboard(coopId: string): Promise<any> {
  const coop = await prisma.coOp.findUnique({ where: { id: coopId } });
  if (!coop) {
    throw new AppError("Co-op not found", 404);
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // Sequential to avoid P2024 under Supabase's single-connection pooler.
  const totalWorkers = await prisma.workerProfile.count({ where: { coopId } });
  const activeWorkers = await prisma.workerProfile.count({
    where: { coopId, isAvailable: true, isOnDuty: true },
  });
  const totalBookings = await prisma.booking.count({
    where: { worker: { coopId } },
  });
  const monthlyBookings = await prisma.booking.count({
    where: {
      worker: { coopId },
      createdAt: { gte: startOfMonth },
    },
  });
  const completedBookings = await prisma.booking.findMany({
    where: {
      worker: { coopId },
      status: "COMPLETED",
    },
    select: {
      finalPrice: true,
      commissionAmount: true,
      workerPayout: true,
      completedAt: true,
    },
  });
  const totalRevenue = await prisma.booking.aggregate({
    where: { worker: { coopId }, status: "COMPLETED" },
    _sum: { finalPrice: true, commissionAmount: true },
  });
  const monthlyRevenue = await prisma.booking.aggregate({
    where: {
      worker: { coopId },
      status: "COMPLETED",
      completedAt: { gte: startOfMonth },
    },
    _sum: { finalPrice: true, commissionAmount: true },
  });
  const totalServices = await prisma.service.count({ where: { coopId, isActive: true } });

  const yearRevenue = completedBookings
    .filter((b) => b.completedAt && b.completedAt >= startOfYear)
    .reduce((sum, b) => sum + Number(b.commissionAmount || 0), 0);

  const monthlyRevenueAmount = Number(monthlyRevenue._sum.commissionAmount || 0);

  return {
    coop: formatCoop(coop),
    stats: {
      totalWorkers,
      activeWorkers,
      totalBookings,
      monthlyBookings,
      completedBookings: completedBookings.length,
      totalRevenue: Number(totalRevenue._sum.finalPrice || 0),
      totalCommission: Number(totalRevenue._sum.commissionAmount || 0),
      monthlyRevenue: monthlyRevenueAmount,
      yearlyCommission: yearRevenue,
      totalServices,
    },
  };
}

export async function calculateDividends(
  coopId: string,
  period: string
): Promise<any[]> {
  const coop = await prisma.coOp.findUnique({ where: { id: coopId } });
  if (!coop) {
    throw new AppError("Co-op not found", 404);
  }

  const periodMatch = period.match(/^(\d{4})-(Q[1-4]|M\d{2})$/);
  if (!periodMatch) {
    throw new AppError("Invalid period format. Use YYYY-Q1 or YYYY-M01", 400);
  }

  const year = parseInt(periodMatch[1], 10);
  const periodPart = periodMatch[2];

  let periodStart: Date;
  let periodEnd: Date;

  if (periodPart.startsWith("Q")) {
    const quarter = parseInt(periodPart[1], 10);
    periodStart = new Date(year, (quarter - 1) * 3, 1);
    periodEnd = new Date(year, quarter * 3, 0, 23, 59, 59);
  } else {
    const month = parseInt(periodPart.slice(1), 10);
    periodStart = new Date(year, month - 1, 1);
    periodEnd = new Date(year, month, 0, 23, 59, 59);
  }

  const workers = await prisma.workerProfile.findMany({
    where: { coopId, status: "VERIFIED" },
  });

  const totalCoopRevenue = await prisma.booking.aggregate({
    where: {
      worker: { coopId },
      status: "COMPLETED",
      completedAt: { gte: periodStart, lte: periodEnd },
    },
    _sum: { commissionAmount: true },
  });

  const poolAmount = Number(totalCoopRevenue._sum.commissionAmount || 0) * 0.3;

  const dividends: Dividend[] = [];

  for (const worker of workers) {
    const workerBookings = await prisma.booking.findMany({
      where: {
        workerId: worker.id,
        status: "COMPLETED",
        completedAt: { gte: periodStart, lte: periodEnd },
      },
      select: {
        workerPayout: true,
        finalPrice: true,
      },
    });

    if (workerBookings.length === 0) continue;

    const jobsCompleted = workerBookings.length;
    const totalEarnings = workerBookings.reduce(
      (sum, b) => sum + Number(b.workerPayout || 0),
      0
    );

    const patronagePoints = totalEarnings * 0.1;

    const existingDividend = await prisma.dividend.findFirst({
      where: {
        workerId: worker.id,
        period,
      },
    });

    let dividendAmount = 0;
    if (poolAmount > 0 && totalCoopRevenue._sum.commissionAmount) {
      const workerShare = totalEarnings / Number(totalCoopRevenue._sum.commissionAmount);
      dividendAmount = Math.round(poolAmount * workerShare * 100) / 100;
    }

    if (existingDividend) {
      const updated = await prisma.dividend.update({
        where: { id: existingDividend.id },
        data: {
          jobsCompleted,
          totalEarnings,
          patronagePoints,
          dividendAmount,
        },
      });
      dividends.push(updated);
    } else {
      const created = await prisma.dividend.create({
        data: {
          workerId: worker.id,
          period,
          periodStart,
          periodEnd,
          jobsCompleted,
          totalEarnings,
          patronagePoints,
          dividendAmount,
          status: "PENDING",
        },
      });
      dividends.push(created);
    }
  }

  return dividends.map((d) => ({
    ...d,
    totalEarnings: Number(d.totalEarnings),
    patronagePoints: Number(d.patronagePoints),
    dividendAmount: Number(d.dividendAmount),
  }));
}

function formatCoop(coop: any): any {
  return {
    ...coop,
    commissionRate: Number(coop.commissionRate),
    maxCommissionRate: Number(coop.maxCommissionRate),
  };
}

export default {
  createCoop,
  getCoop,
  getCoopByAdmin,
  assertCoopAccess,
  listServices,
  getCoopWorkers,
  updateCoopSettings,
  getCoopDashboard,
  calculateDividends,
};
