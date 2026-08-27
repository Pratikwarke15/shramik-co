"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { UserRole } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}

export function AuthGuard({ allowedRoles, children }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, sessionValidated, user } = useAuthStore();

  useEffect(() => {
    if (isLoading || !sessionValidated) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      router.replace("/unauthorized");
    }
  }, [isLoading, sessionValidated, isAuthenticated, user, allowedRoles, router]);

  // Block until the session has been confirmed against the API: never render
  // dashboard content on the strength of localStorage alone.
  if (isLoading || !sessionValidated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return <>{children}</>;
}

export default AuthGuard;
