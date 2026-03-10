import { Response } from "express";
import { User } from "@prisma/client";

export interface UserResponse {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  avatar_url: string | null;
  is_onboarded: boolean;
  subscription_status: string;
  created_at: string;
  updated_at: string;
}

export function formatUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    avatar_url: user.avatarUrl,
    is_onboarded: user.isOnboarded,
    subscription_status: user.subscriptionStatus,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
  };
}

export function sendSuccess(res: Response, data: unknown, statusCode: number = 200) {
  return res.status(statusCode).json({ success: true, data });
}
