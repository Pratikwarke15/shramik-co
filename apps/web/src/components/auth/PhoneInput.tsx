"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Smartphone } from "lucide-react";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onSendOtp?: () => void;
  error?: string;
  otpSent?: boolean;
  disabled?: boolean;
}

export function PhoneInput({ value, onChange, onSendOtp, error, otpSent, disabled }: PhoneInputProps) {
  const [otpCountdown, setOtpCountdown] = useState(0);

  const handleSendOtp = () => {
    onSendOtp?.();
    setOtpCountdown(30);
    const interval = setInterval(() => {
      setOtpCountdown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone Number</label>
      <div className="flex gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2">
          <Smartphone className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">+91</span>
        </div>
        <input
          type="tel"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="9876543210"
          disabled={disabled}
          className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {onSendOtp && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={otpCountdown > 0 || value.length < 10}
            onClick={handleSendOtp}
            className="shrink-0"
          >
            {otpCountdown > 0 ? `${otpCountdown}s` : otpSent ? "Resend" : "Send OTP"}
          </Button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
