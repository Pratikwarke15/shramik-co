import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Prisma, UserRole } from "@prisma/client";
import prisma from "../lib/prisma";
import { env } from "../config/env";
import { AppError } from "../middleware/errorHandler";
import { redis } from "../lib/redis";
import { logger } from "../lib/logger";
import { sendOTPSms } from "./sms.service";

function generateJwtToken(user: { id: string; phone: string; role: UserRole }): string {
  return jwt.sign(
    { id: user.id, phone: user.phone, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
  );
}

export async function generateOTP(
  phone: string
): Promise<{ otp: string; expiresAt: Date }> {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otpVerification.create({
    data: {
      phone,
      otp,
      purpose: "LOGIN",
      expiresAt,
    },
  });

  const sent = await sendOTPSms(phone, otp);
  if (!sent) {
    logger.warn(`Failed to send OTP to ${phone}, but record created`);
  }

  return { otp, expiresAt };
}

export async function verifyOTP(
  phone: string,
  otp: string
): Promise<{ verified: boolean; token?: string; user?: any }> {
  const record = await prisma.otpVerification.findFirst({
    where: {
      phone,
      purpose: "LOGIN",
      verified: false,
      expiresAt: { gte: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new AppError("Invalid or expired OTP", 400);
  }

  if (record.otp !== otp) {
    throw new AppError("Incorrect OTP", 400);
  }

  await prisma.otpVerification.update({
    where: { id: record.id },
    data: { verified: true },
  });

  const existingUser = await prisma.user.findUnique({ where: { phone } });

  if (existingUser) {
    const token = generateJwtToken(existingUser);
    return {
      verified: true,
      token,
      user: {
        id: existingUser.id,
        phone: existingUser.phone,
        name: existingUser.name,
        role: existingUser.role,
      },
    };
  }

  return { verified: true };
}

export async function register(data: {
  phone: string;
  name: string;
  email?: string;
  password: string;
  role: "CONSUMER" | "WORKER";
}): Promise<{ token: string; user: any }> {
  const existingUser = await prisma.user.findUnique({
    where: { phone: data.phone },
  });

  if (existingUser) {
    throw new AppError("Phone number already registered", 409);
  }

  if (data.email) {
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      throw new AppError("Email already registered", 409);
    }
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      phone: data.phone,
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role as UserRole,
    },
  });

  if (data.role === "CONSUMER") {
    await prisma.consumerProfile.create({
      data: { userId: user.id },
    });
  }

  const token = generateJwtToken(user);

  return {
    token,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

export async function login(
  phone: string,
  password: string
): Promise<{ token: string; user: any }> {
  const user = await prisma.user.findUnique({ where: { phone } });

  if (!user) {
    throw new AppError("Invalid phone or password", 401);
  }

  if (!user.isActive) {
    throw new AppError("Account is deactivated", 403);
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    throw new AppError("Invalid phone or password", 401);
  }

  const token = generateJwtToken(user);

  return {
    token,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

export async function refreshToken(
  token: string
): Promise<{ token: string; user: any }> {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string;
      phone: string;
      role: string;
    };

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      throw new AppError("User not found", 404);
    }
    if (!user.isActive) {
      throw new AppError("Account is deactivated", 403);
    }

    const newToken = generateJwtToken(user);

    return {
      token: newToken,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Invalid token", 401);
  }
}

export async function getProfile(userId: string): Promise<any> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      consumerProfile: true,
      workerProfile: true,
      coopAdminProfile: true,
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    locale: user.locale,
    isActive: user.isActive,
    createdAt: user.createdAt,
    consumerProfile: user.consumerProfile,
    workerProfile: user.workerProfile
      ? {
          ...user.workerProfile,
          totalEarnings: Number(user.workerProfile.totalEarnings),
          walletBalance: Number(user.workerProfile.walletBalance),
        }
      : null,
    coopAdminProfile: user.coopAdminProfile,
  };
}

export async function blacklistToken(token: string, expiresIn: number): Promise<void> {
  const key = `blacklist:${token}`;
  await redis.set(key, "1", "EX", expiresIn);
  logger.info(`Token blacklisted with TTL ${expiresIn}s`);
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const key = `blacklist:${token}`;
  const result = await redis.get(key);
  return result === "1";
}

export default {
  generateOTP,
  verifyOTP,
  register,
  login,
  refreshToken,
  getProfile,
  blacklistToken,
  isTokenBlacklisted,
};
