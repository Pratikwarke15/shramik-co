import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { broadcastToBooking, broadcastToCoop } from "../lib/websocket";

export async function createDispute(
  bookingId: string,
  raisedBy: string,
  data: {
    category: string;
    description: string;
    priority?: string;
    evidence?: Record<string, unknown>;
  }
): Promise<any> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { worker: { select: { coopId: true } } },
  });

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  if (booking.status === "CANCELLED") {
    throw new AppError("Cannot dispute a cancelled booking", 400);
  }

  if (booking.status === "DISPUTED") {
    throw new AppError("Booking already has an active dispute", 409);
  }

  const dispute = await prisma.$transaction(async (tx) => {
    const newDispute = await tx.dispute.create({
      data: {
        bookingId,
        raisedBy,
        category: data.category,
        description: data.description,
        priority: (data.priority as any) || "MEDIUM",
        evidence: (data.evidence as any) || undefined,
        status: "OPEN",
      },
    });

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "DISPUTED", disputeId: newDispute.id },
    });

    return newDispute;
  });

  broadcastToBooking(bookingId, {
    type: "dispute_created",
    disputeId: dispute.id,
  });

  if (booking.worker?.coopId) {
    broadcastToCoop(booking.worker.coopId, {
      type: "new_dispute",
      disputeId: dispute.id,
      bookingId,
    });
  }

  return dispute;
}

export async function getDispute(disputeId: string): Promise<any> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      booking: {
        include: {
          service: { select: { name: true, categoryName: true } },
          worker: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
          consumer: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!dispute) {
    throw new AppError("Dispute not found", 404);
  }

  return dispute;
}

export async function updateDisputeStatus(
  disputeId: string,
  adminId: string,
  status: string,
  resolution?: string
): Promise<any> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      booking: {
        include: { worker: { select: { coopId: true } } },
      },
    },
  });

  if (!dispute) {
    throw new AppError("Dispute not found", 404);
  }

  const validStatuses = ["OPEN", "UNDER_REVIEW", "RESOLVED", "ESCALATED", "CLOSED"];
  if (!validStatuses.includes(status)) {
    throw new AppError("Invalid dispute status", 400);
  }

  if (status === "RESOLVED" && !resolution) {
    throw new AppError("Resolution is required when resolving a dispute", 400);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updateData: any = {
      status,
      resolvedBy: adminId,
    };

    if (resolution) {
      updateData.resolution = resolution;
    }

    if (status === "RESOLVED" || status === "CLOSED") {
      updateData.resolvedAt = new Date();
    }

    const updatedDispute = await tx.dispute.update({
      where: { id: disputeId },
      data: updateData,
    });

    if (status === "RESOLVED") {
      await tx.booking.update({
        where: { id: dispute.bookingId },
        data: { status: "COMPLETED" },
      });
    } else if (status === "CLOSED") {
      await tx.booking.update({
        where: { id: dispute.bookingId },
        data: { status: "COMPLETED" },
      });
    }

    return updatedDispute;
  });

  broadcastToBooking(dispute.bookingId, {
    type: "dispute_updated",
    disputeId,
    status,
  });

  return updated;
}

export async function getCoopDisputes(
  coopId: string,
  status?: string
): Promise<any[]> {
  const coop = await prisma.coOp.findUnique({ where: { id: coopId } });
  if (!coop) {
    throw new AppError("Co-op not found", 404);
  }

  const where: any = {
    booking: {
      worker: { coopId },
    },
  };

  if (status) {
    where.status = status;
  }

  const disputes = await prisma.dispute.findMany({
    where,
    include: {
      booking: {
        select: {
          id: true,
          bookingRef: true,
          status: true,
          address: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return disputes;
}

export default {
  createDispute,
  getDispute,
  updateDisputeStatus,
  getCoopDisputes,
};
