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
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nProvider";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().length(10, "Enter a valid 10-digit phone number"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["CONSUMER", "WORKER"]),
  skillTags: z.array(z.string()).optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const skillOptions = ["Plumbing", "Electrical", "Cleaning", "Transport", "Carpentry", "Painting", "AC Repair", "Home Security"];

export function RegisterForm() {
  const router = useRouter();
  const authLogin = useAuthStore((s) => s.login);
  const { toast } = useToast();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", phone: "", email: "", password: "", role: "CONSUMER", skillTags: [] },
  });

  const phone = watch("phone");
  const role = watch("role");

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) => {
      const next = prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill];
      setValue("skillTags", next);
      return next;
    });
  };

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    try {
      const { apiPost } = await import("@/lib/api");
      const res = await apiPost<{ success: boolean; data?: { user: any; token: string }; error?: string }>("/auth/register", {
        ...data,
        skillTags: data.role === "WORKER" ? selectedSkills : undefined,
      });
      if (res.success && res.data) {
        authLogin(res.data.user, res.data.token);
        toast({ title: "Account created!", variant: "success" });
        const role = res.data.user.role;
        if (role === "WORKER") router.push("/worker/dashboard");
        else if (role === "COOP_ADMIN") router.push("/coop-admin/dashboard");
        else if (role === "MINISTRY_SUPER_ADMIN") router.push("/admin/dashboard");
        else router.push("/consumer/dashboard");
      } else {
        toast({ title: res.error || "Registration failed", variant: "danger" });
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
        <h1 className="text-2xl font-bold text-gray-900 font-heading">{t("auth.createAccount")}</h1>
        <p className="mt-2 text-sm text-gray-500">{t("auth.createAccountSubtitle")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label={t("auth.name")}
          placeholder={t("auth.namePlaceholder")}
          {...register("name")}
          error={errors.name?.message}
          disabled={loading}
        />

        <PhoneInput
          value={phone}
          onChange={(v) => setValue("phone", v, { shouldValidate: true })}
          error={errors.phone?.message}
          disabled={loading}
          label={t("auth.phone")}
          placeholder={t("auth.phonePlaceholder")}
        />

        <Input
          label={t("auth.email")}
          type="email"
          placeholder={t("auth.emailPlaceholder")}
          {...register("email")}
          error={errors.email?.message}
          disabled={loading}
        />

        <Input
          label={t("auth.password")}
          type="password"
          placeholder="Min 6 characters"
          {...register("password")}
          error={errors.password?.message}
          disabled={loading}
        />

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">{t("auth.iWantTo")}</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setValue("role", "CONSUMER")}
              className={`rounded-lg border-2 p-4 text-center transition-all ${
                role === "CONSUMER" ? "border-indigo-600 bg-indigo-50" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <span className="text-2xl">🛒</span>
              <p className="mt-1 text-sm font-medium">{t("auth.hireWorkers")}</p>
            </button>
            <button
              type="button"
              onClick={() => setValue("role", "WORKER")}
              className={`rounded-lg border-2 p-4 text-center transition-all ${
                role === "WORKER" ? "border-emerald-600 bg-emerald-50" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <span className="text-2xl">🔧</span>
              <p className="mt-1 text-sm font-medium">{t("auth.workAndEarn")}</p>
            </button>
          </div>
        </div>

        {role === "WORKER" && (
          <div className="animate-fade-in">
            <label className="mb-2 block text-sm font-medium text-gray-700">Your Skills</label>
            <div className="flex flex-wrap gap-2">
              {skillOptions.map((skill) => (
                <Badge
                  key={skill}
                  variant={selectedSkills.includes(skill) ? "info" : "default"}
                  className="cursor-pointer"
                  onClick={() => toggleSkill(skill)}
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Button type="submit" className="w-full" loading={loading}>
          {t("auth.createAccount")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        {t("auth.alreadyHave")}{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          {t("auth.signIn")}
        </Link>
      </p>
    </div>
  );
}
