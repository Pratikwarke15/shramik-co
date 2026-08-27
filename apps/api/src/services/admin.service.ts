import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

export async function getMinistryStats(): Promise<any> {
  const [coopCount, workerCount, pendingWorkers, consumerCount, bookingCount, revenue] = await Promise.all([
    prisma.coOp.count({}),
    prisma.workerProfile.count({}),
    prisma.workerProfile.count({ where: { status: "PENDING_ADMIN_APPROVAL" } }),
    prisma.user.count({ where: { role: "CONSUMER" } }),
    prisma.booking.count({}),
    prisma.booking.aggregate({ _sum: { commissionAmount: true } }),
  ]);

  const verifiedWorkerCount = await prisma.workerProfile.count({ where: { status: "VERIFIED" } });
  const suspendedWorkerCount = await prisma.workerProfile.count({ where: { status: "SUSPENDED" } });

  return {
    totalCoops: coopCount,
    totalWorkers: workerCount,
    verifiedWorkers: verifiedWorkerCount,
    pendingWorkers,
    suspendedWorkers: suspendedWorkerCount,
    totalConsumers: consumerCount,
    totalBookings: bookingCount,
    platformRevenue: Number(revenue._sum.commissionAmount || 0),
  };
}

export async function listCoops(): Promise<any[]> {
  const coops = await prisma.coOp.findMany({
    include: {
      _count: { select: { workers: true, services: true } },
      admin: { select: { id: true, user: { select: { id: true, name: true, phone: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  return Promise.all(coops.map(async (c) => {
    const bookingStats = await prisma.booking.aggregate({
      where: { service: { coopId: c.id } },
      _count: true,
      _sum: { commissionAmount: true },
    });
    return {
      id: c.id, name: c.name, registrationNo: c.registrationNo, description: c.description,
      address: c.address, city: c.city, state: c.state, pincode: c.pincode,
      latitude: c.latitude, longitude: c.longitude, radiusKm: c.radiusKm,
      commissionRate: Number(c.commissionRate), isActive: c.isActive, createdAt: c.createdAt,
      admin: c.admin?.user ? { id: c.admin.user.id, name: c.admin.user.name, phone: c.admin.user.phone } : null,
      workerCount: c._count.workers,
      serviceCount: c._count.services,
      revenue: Number(bookingStats._sum.commissionAmount || 0),
    };
  }));
}

export async function listAllWorkers(status?: string, q?: string): Promise<any[]> {
  const where: any = {};
  if (status) {
    if (status === "ALL") {
      // no filter
    } else {
      where.status = status;
    }
  }
  if (q) {
    where.OR = [
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { phone: { contains: q } } },
      { workAddress: { contains: q, mode: "insensitive" } },
    ];
  }

  const profiles = await prisma.workerProfile.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, phone: true, avatarUrl: true, createdAt: true } },
      coop: { select: { id: true, name: true, city: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return profiles.map((p) => ({
    id: p.id,
    userId: p.userId,
    name: p.user.name,
    phone: p.user.phone,
    avatarUrl: p.user.avatarUrl,
    joinedAt: p.user.createdAt,
    status: p.status,
    skillTags: p.skillTags,
    bio: p.bio,
    workAddress: p.workAddress,
    latitude: p.latitude,
    longitude: p.longitude,
    phoneVerified: p.phoneVerified,
    kycStatus: p.kycStatus,
    kycDocumentUrl: p.kycDocumentUrl,
    aadhaarVerified: p.aadhaarVerified,
    avgRating: p.avgRating,
    totalJobs: p.totalJobs,
    coop: p.coop ? { id: p.coop.id, name: p.coop.name, city: p.coop.city } : null,
  }));
}

export async function approveWorkerByAdmin(workerId: string, note?: string): Promise<any> {
  const profile = await prisma.workerProfile.findUnique({ where: { id: workerId } });
  if (!profile) throw new AppError("Worker profile not found", 404);
  const updated = await prisma.workerProfile.update({
    where: { id: workerId },
    data: { status: "VERIFIED", kycStatus: "VERIFIED", aadhaarVerified: true },
    include: { user: { select: { id: true, name: true } } },
  });
  return {
    id: updated.id,
    name: updated.user.name,
    status: updated.status,
  };
}

export async function rejectWorkerByAdmin(workerId: string, reason: string): Promise<any> {
  const profile = await prisma.workerProfile.findUnique({ where: { id: workerId } });
  if (!profile) throw new AppError("Worker profile not found", 404);
  const updated = await prisma.workerProfile.update({
    where: { id: workerId },
    data: { status: "SUSPENDED", kycStatus: "REJECTED" },
    include: { user: { select: { id: true, name: true } } },
  });
  return {
    id: updated.id,
    name: updated.user.name,
    status: updated.status,
  };
}