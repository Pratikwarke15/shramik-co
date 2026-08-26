"use client";

import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const { user, token, isAuthenticated, isLoading } = useAuthStore();

  const isConsumer = user?.role === "CONSUMER";
  const isWorker = user?.role === "WORKER";
  const isCoopAdmin = user?.role === "COOP_ADMIN";
  const isSuperAdmin = user?.role === "MINISTRY_SUPER_ADMIN";

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    isConsumer,
    isWorker,
    isCoopAdmin,
    isSuperAdmin,
  };
}
