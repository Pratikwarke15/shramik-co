import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

export async function getMinistryStats(): Promise<any> {
  // Supabase pooler exposes a single connection (connection_limit=1), so queries
  // MUST run sequentially; parallel Promise.all calls contend for one connection
  // and time out with Prisma P2024.
  const run = async <T>(fn: () => Promise<T>): Promise<T> => fn();
  const coopCount = await run(() => prisma.coOp.count({}));
  const workerCount = await run(() => prisma.workerProfile.count({}));
  const pendingWorkers = await run(() =>
    prisma.workerProfile.count({ where: { status: "PENDING_ADMIN_APPROVAL" } })
  );
  const consumerCount = await run(() =>
    prisma.user.count({ where: { role: "CONSUMER" } })
  );
  const bookingCount = await run(() => prisma.booking.count({}));
  const revenue = await run(() =>
    prisma.booking.aggregate({ _sum: { commissionAmount: true } })
  );
  const verifiedWorkerCount = await run(() =>
    prisma.workerProfile.count({ where: { status: "VERIFIED" } })
  );
  const suspendedWorkerCount = await run(() =>
    prisma.workerProfile.count({ where: { status: "SUSPENDED" } })
  );

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

  // Sequential to avoid P2024 under Supabase's single-connection pooler.
  const result: any[] = [];
  for (const c of coops) {
    const bookingStats = await prisma.booking.aggregate({
      where: { service: { coopId: c.id } },
      _count: true,
      _sum: { commissionAmount: true },
    });
    result.push({
      id: c.id, name: c.name, registrationNo: c.registrationNo, description: c.description,
      address: c.address, city: c.city, state: c.state, pincode: c.pincode,
      latitude: c.latitude, longitude: c.longitude, radiusKm: c.radiusKm,
      commissionRate: Number(c.commissionRate), isActive: c.isActive, createdAt: c.createdAt,
      admin: c.admin?.user ? { id: c.admin.user.id, name: c.admin.user.name, phone: c.admin.user.phone } : null,
      workerCount: c._count.workers,
      serviceCount: c._count.services,
      revenue: Number(bookingStats._sum.commissionAmount || 0),
    });
  }
  return result;
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