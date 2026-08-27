"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { WorkerRegistrationForm } from "@/components/auth/WorkerRegistrationForm";
import { apiGet } from "@/lib/api";

export default function WorkerOnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If the worker already has a profile, skip onboarding
    apiGet<any>("/workers/profile")
      .then((res) => {
        if (res.success && res.data) {
          if (res.data.status === "VERIFIED") {
            router.push("/worker/dashboard");
          } else {
            router.push("/worker/pending-approval");
          }
        }
      })
      .catch(() => {});
  }, [router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Complete Your Worker Profile</h1>
          <p className="mt-2 text-sm text-gray-500">
            Complete the verification steps below to start working. Your profile is reviewed by
            a cooperative administrator before you can accept jobs.
          </p>
        </div>
        <WorkerRegistrationForm user={user} />
      </div>
    </div>
  );
}