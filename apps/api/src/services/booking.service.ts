import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { broadcastToWorker, broadcastToBooking } from "../lib/websocket";

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeSkill(skill: string): string {
  return skill.trim().toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
}

function matchesSkills(workerSkills: string[], requiredSkills?: string[]): boolean {
  if (!requiredSkills || requiredSkills.length === 0) return true;
  const workerSet = new Set(workerSkills.map(normalizeSkill));
  return requiredSkills.some((skill) => workerSet.has(normalizeSkill(skill)));
}

function workerMatchScore(worker: {
  avgRating: number;
  totalJobs: number;
  distanceKm: number;
}, radiusKm: number): number {
  const distanceScore = Math.max(0, 1 - worker.distanceKm / Math.max(radiusKm, 1)) * 60;
  const ratingScore = (Number(worker.avgRating || 0) / 5) * 25;
  const trackRecordScore = Math.min(Number(worker.totalJobs || 0) / 200, 1) * 15;
  return Math.round((distanceScore + ratingScore + trackRecordScore) * 10) / 10;
}

function generateBookingRef(): string {
  const now = new Date();
  const dateStr =
    now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, "0") +
    now.getDate().toString().padStart(2, "0");
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BG-${dateStr}-${code}`;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["EN_ROUTE", "CANCELLED"],
  EN_ROUTE: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "DISPUTED"],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: ["RESOLVED"],
};

export async function createBooking(
  consumerId: string,
  data: {
    serviceId: string;
    workerId?: string;
    address: string;
    description?: string;
    scheduledAt?: string;
    latitude: number;
    longitude: number;
  }
): Promise<any> {
  const service = await prisma.service.findUnique({
    where: { id: data.serviceId },
    include: { coop: true },
  });

  if (!service || !service.isActive) {
    throw new AppError("Service not found or inactive", 404);
  }

  const quotedPrice = Number(service.basePrice);
  const commissionRate = Math.min(Number(service.coop.commissionRate), 5);
  const serviceSkills = [service.categorySlug, service.categoryName];
  const radiusKm = service.coop.radiusKm || 10;

  const booking = await prisma.$transaction(async (tx) => {
    const candidates = await tx.workerProfile.findMany({
      where: {
        coopId: service.coopId,
        status: "VERIFIED",
        isAvailable: true,
        isOnDuty: true,
        latitude: { not: null },
        longitude: { not: null },
        user: { isActive: true },
      },
      include: { user: { select: { id: true, name: true, phone: true } } },
    });

    let matchedWorkers = candidates.map((c) => {
      const d = haversineDistance(data.latitude, data.longitude, c.latitude!, c.longitude!);
      const distanceKm = Math.round(d * 100) / 100;
      return {
        worker: c,
        distanceKm,
        matchScore: workerMatchScore(
          { avgRating: Number(c.avgRating), totalJobs: c.totalJobs, distanceKm },
          radiusKm
        ),
      };
    })
      .filter((entry) => entry.distanceKm <= radiusKm)
      .filter((entry) => matchesSkills(entry.worker.skillTags, serviceSkills));

    if (data.workerId) {
      const selected = matchedWorkers.find((entry) => entry.worker.id === data.workerId);
      if (!selected) {
        throw new AppError("Selected worker is unavailable, out of range, or not skilled for this service", 400);
      }
      matchedWorkers = [selected];
    }

    const nearest = matchedWorkers.sort(
      (a, b) => b.matchScore - a.matchScore || a.distanceKm - b.distanceKm
    )[0]?.worker || null;

    const bookingRef = generateBookingRef();
    const workerId = nearest?.id || null;

    const newBooking = await tx.booking.create({
      data: {
        bookingRef,
        consumerId,
        workerId,
        serviceId: data.serviceId,
        status: "PENDING",
        address: data.address,
        description: data.description,
        quotedPrice,
        commissionRate,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        consumerLatitude: data.latitude,
        consumerLongitude: data.longitude,
      },
      include: {
        service: true,
        worker: { include: { user: { select: { id: true, name: true, phone: true } } } },
        consumer: { select: { id: true, name: true, phone: true } },
      },
    });

    if (workerId) {
      broadcastToWorker(workerId, {
        type: "new_booking",
        booking: { id: newBooking.id, bookingRef: newBooking.bookingRef },
      });
    }

    return newBooking;
  });

  return formatBooking(booking);
}

export async function getBooking(bookingId: string): Promise<any> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: true,
      worker: {
        include: {
          user: { select: { id: true, name: true, phone: true } },
        },
      },
      consumer: { select: { id: true, name: true, phone: true } },
      reviews: true,
      disputes: true,
      walletTransactions: true,
    },
  });

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  return formatBooking(booking);
}

export async function getUserBookings(
  userId: string,
  role: string
): Promise<any[]> {
  const where =
    role === "WORKER"
      ? { worker: { userId } }
      : { consumerId: userId };

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      service: { select: { id: true, name: true, categoryName: true } },
      worker: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
      consumer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return bookings.map(formatBooking);
}

export async function updateBookingStatus(
  bookingId: string,
  workerId: string,
  status: string
): Promise<any> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { worker: true, service: { include: { coop: true } } },
  });

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  if (booking.workerId !== workerId) {
    throw new AppError("You are not assigned to this booking", 403);
  }

  const allowed = VALID_TRANSITIONS[booking.status];
  if (!allowed || !allowed.includes(status)) {
    throw new AppError(
      `Cannot transition from ${booking.status} to ${status}`,
      400
    );
  }

  const updateData: Prisma.BookingUpdateInput = {
    status: status as any,
  };

  if (status === "IN_PROGRESS") {
    updateData.startedAt = new Date();
  } else if (status === "COMPLETED") {
    updateData.completedAt = new Date();
    updateData.finalPrice = booking.quotedPrice;

    const commissionRate = Math.min(Number(booking.commissionRate), 5);
    const commissionAmount = Number(booking.quotedPrice) * (commissionRate / 100);
    const workerPayout = Number(booking.quotedPrice) - commissionAmount;

    updateData.commissionAmount = commissionAmount;
    updateData.workerPayout = workerPayout;
    updateData.paymentStatus = "HELD_IN_ESCROW";
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: updateData,
    include: {
      service: true,
      worker: {
        include: { user: { select: { id: true, name: true } } },
      },
      consumer: { select: { id: true, name: true } },
    },
  });

  broadcastToBooking(bookingId, {
    type: "status_update",
    status,
    bookingId,
  });

  return formatBooking(updated);
}

export async function rateBooking(
  bookingId: string,
  userId: string,
  rating: number,
  comment?: string
): Promise<any> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { worker: true, reviews: true },
  });

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  if (booking.status !== "COMPLETED") {
    throw new AppError("Can only rate completed bookings", 400);
  }

  if (booking.consumerId !== userId) {
    throw new AppError("Only the consumer can rate this booking", 403);
  }

  if (!booking.workerId) {
    throw new AppError("Cannot rate a booking without an assigned worker", 400);
  }

  const existingReview = booking.reviews.find((r) => r.authorId === userId);
  if (existingReview) {
    throw new AppError("You have already rated this booking", 409);
  }

  const review = await prisma.$transaction(async (tx) => {
    const newReview = await tx.review.create({
      data: {
        bookingId,
        authorId: userId,
        workerId: booking.workerId!,
        rating,
        comment,
      },
    });

    const workerReviews = await tx.review.findMany({
      where: { workerId: booking.workerId! },
    });

    const avgRating =
      workerReviews.reduce((sum, r) => sum + r.rating, 0) /
      workerReviews.length;

    await tx.workerProfile.update({
      where: { id: booking.workerId! },
      data: { avgRating: Math.round(avgRating * 10) / 10 },
    });

    return newReview;
  });

  broadcastToWorker(booking.workerId!, {
    type: "new_review",
    bookingId,
    rating,
  });

  return review;
}

export async function getNearbyWorkers(
  lat: number,
  lng: number,
  radiusKm: number,
  skillTags?: string[],
  coopId?: string
): Promise<any[]> {
  const where: any = {
    status: "VERIFIED",
    isAvailable: true,
    isOnDuty: true,
    latitude: { not: null },
    longitude: { not: null },
    user: { isActive: true },
  };

  if (coopId) where.coopId = coopId;

  const candidates = await prisma.workerProfile.findMany({
    where,
    include: { user: { select: { id: true, name: true } } },
    take: 100,
  });

  const workers = candidates
    .map((w) => {
      const distanceKm = haversineDistance(lat, lng, w.latitude!, w.longitude!);
      return {
        workerId: w.id,
        workerName: w.user.name,
        skillTags: w.skillTags,
        avgRating: Number(w.avgRating),
        totalJobs: w.totalJobs,
        bio: w.bio,
        experienceYears: w.experienceYears,
        distanceKm: Math.round(distanceKm * 100) / 100,
      };
    })
    .filter((w) => matchesSkills(w.skillTags, skillTags))
    .filter((w) => w.distanceKm <= radiusKm)
    .map((w) => ({
      ...w,
      etaMinutes: Math.max(10, Math.round(w.distanceKm * 5)),
      matchScore: workerMatchScore(w, radiusKm),
    }))
    .sort((a, b) => b.matchScore - a.matchScore || a.distanceKm - b.distanceKm)
    .slice(0, 50);

  return workers;
}

export async function cancelBooking(
  bookingId: string,
  userId: string,
  reason: string
): Promise<any> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  if (booking.consumerId !== userId) {
    throw new AppError("Only the consumer can cancel a booking", 403);
  }

  const nonCancellable = ["COMPLETED", "CANCELLED", "DISPUTED"];
  if (nonCancellable.includes(booking.status)) {
    throw new AppError(`Cannot cancel a booking with status ${booking.status}`, 400);
  }

  if (booking.status !== "PENDING") {
    const minutesSinceCreation =
      (Date.now() - booking.createdAt.getTime()) / (1000 * 60);
    if (minutesSinceCreation > 15) {
      throw new AppError(
        "Cannot cancel after 15 minutes of booking acceptance",
        400
      );
    }
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CANCELLED",
      cancelReason: reason,
    },
    include: {
      service: true,
      worker: {
        include: { user: { select: { id: true, name: true } } },
      },
      consumer: { select: { id: true, name: true } },
    },
  });

  if (booking.workerId) {
    broadcastToWorker(booking.workerId, {
      type: "booking_cancelled",
      bookingId,
    });
  }

  return formatBooking(updated);
}

function formatBooking(booking: any): any {
  return {
    ...booking,
    quotedPrice: booking.quotedPrice ? Number(booking.quotedPrice) : null,
    finalPrice: booking.finalPrice ? Number(booking.finalPrice) : null,
    commissionRate: booking.commissionRate ? Number(booking.commissionRate) : null,
    commissionAmount: booking.commissionAmount ? Number(booking.commissionAmount) : null,
    workerPayout: booking.workerPayout ? Number(booking.workerPayout) : null,
  };
}

export default {
  createBooking,
  getBooking,
  getUserBookings,
  updateBookingStatus,
  rateBooking,
  getNearbyWorkers,
  cancelBooking,
};
