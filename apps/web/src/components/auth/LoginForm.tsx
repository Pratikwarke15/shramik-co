"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "./PhoneInput";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/i18n/I18nProvider";

const loginSchema = z.object({
  phone: z.string().length(10, "Enter a valid 10-digit phone number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const { toast } = useToast();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "", password: "" },
  });

  const phone = watch("phone");

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      const { apiPost } = await import("@/lib/api");
      const res = await apiPost<{ success: boolean; data?: { user: any; token: string }; error?: string }>("/auth/login", data);
      if (res.success && res.data) {
        login(res.data.user, res.data.token);
        toast({ title: "Welcome back!", variant: "success" });
        const role = res.data.user.role;
        if (role === "WORKER") router.push("/worker/dashboard");
        else if (role === "COOP_ADMIN") router.push("/coop-admin/dashboard");
        else if (role === "MINISTRY_SUPER_ADMIN") router.push("/admin/dashboard");
        else router.push("/consumer/dashboard");
      } else {
        toast({ title: res.error || "Login failed", variant: "danger" });
      }
    } catch {
      toast({ title: "Network error. Please try again.", variant: "danger" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 font-heading">{t("auth.welcomeBack")}</h1>
        <p className="mt-2 text-sm text-gray-500">{t("auth.signInSubtitle")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <PhoneInput
          value={phone}
          onChange={(v) => setValue("phone", v, { shouldValidate: true })}
          error={errors.phone?.message}
          disabled={loading}
          label={t("auth.phone")}
          placeholder={t("auth.phonePlaceholder")}
        />

        <Input
          label={t("auth.password")}
          type="password"
          placeholder={t("auth.password")}
          {...register("password")}
          error={errors.password?.message}
          disabled={loading}
        />

        <Button type="submit" className="w-full" loading={loading}>
          {t("auth.signIn")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        {t("auth.dontHave")}{" "}
        <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
          {t("auth.createOne")}
        </Link>
      </p>
    </div>
  );
}
