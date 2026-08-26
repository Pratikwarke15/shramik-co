import { Server as SocketIOServer } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { logger } from "./logger";

let io: SocketIOServer;

export function setupWebSocket(server: http.Server): void {
  io = new SocketIOServer(server, {
    cors: {
      origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN,
      methods: ["GET", "POST"],
    },
    path: "/ws",
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) return next(new Error("Authentication required"));
    try {
      const decoded = jwt.verify(token as string, env.JWT_SECRET) as {
        id: string;
        phone: string;
        role: string;
      };
      (socket as any).userId = decoded.id;
      (socket as any).phone = decoded.phone;
      (socket as any).userRole = decoded.role;
      logger.info(`Socket.IO authenticated: user ${decoded.id}`);
      next();
    } catch {
      logger.warn("Socket.IO authentication failed — invalid token");
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = (socket as any).userId;
    const role = (socket as any).userRole;
    logger.info(`Client connected: ${userId}`);

    socket.join(`role:${role}`);

    socket.on("join:worker", (workerId: string) => {
      socket.join(`worker:${workerId}`);
      logger.debug(`Socket joined worker room: ${workerId}`);
    });

    socket.on("join:booking", (bookingId: string) => {
      socket.join(`booking:${bookingId}`);
      logger.debug(`Socket joined booking room: ${bookingId}`);
    });

    socket.on("join:coop", (coopId: string) => {
      socket.join(`coop:${coopId}`);
      logger.debug(`Socket joined coop room: ${coopId}`);
    });

    socket.on("leave:worker", (workerId: string) => {
      socket.leave(`worker:${workerId}`);
    });

    socket.on("leave:booking", (bookingId: string) => {
      socket.leave(`booking:${bookingId}`);
    });

    socket.on("leave:coop", (coopId: string) => {
      socket.leave(`coop:${coopId}`);
    });

    socket.on("disconnect", () => {
      logger.info(`Client disconnected: ${userId}`);
    });
  });

  logger.info("WebSocket (Socket.IO) initialized on /ws");
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

export function broadcastToWorker(workerId: string, data: unknown): void {
  io?.to(`worker:${workerId}`).emit("worker_update", data);
}

export function broadcastToBooking(bookingId: string, data: unknown): void {
  io?.to(`booking:${bookingId}`).emit("booking_update", data);
}

export function broadcastToCoop(coopId: string, data: unknown): void {
  io?.to(`coop:${coopId}`).emit("coop_update", data);
}

export function broadcastToAll(type: string, data: unknown): void {
  io?.emit(type, data);
}

export default setupWebSocket;
