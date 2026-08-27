"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OtpInput } from "@/components/auth/OtpInput";
import { useToast } from "@/components/providers/ToastProvider";
import { useAuth } from "@/hooks/useAuth";
import { apiGet, apiPost } from "@/lib/api";
import { Check, Loader2, Shield, Phone, ArrowRight, AlertTriangle } from "lucide-react";

export default function ConsumerVerifyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Phone OTP
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  // DigiLocker
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [digilockerVerified, setDigilockerVerified] = useState(false);
  const [digilockerLoading, setDigilockerLoading] = useState(false);

  // Aadhaar OTP
  const [aadhaarOtpVerified, setAadhaarOtpVerified] = useState(false);
  const [aadhaarOtpLoading, setAadhaarOtpLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<any>("/verification/consumer/status")
      .then((res) => {
        if (res.success) {
          setStatus(res.data);
          if (res.data.phoneVerified) setOtpVerified(true);
          if (res.data.aadhaarVerified) { setDigilockerVerified(true); setAadhaarOtpVerified(true); }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sendOtp = async () => {
    if (!user) return;
    try {
      const res = await apiPost<any>("/auth/send-otp", { phone: user.phone });
      if (res.success) { setOtpSent(true); toast({ title: "OTP sent", variant: "success" }); }
      else toast({ title: res.error || "Failed", variant: "danger" });
    } catch { toast({ title: "Failed to send OTP", variant: "danger" }); }
  };

  const verifyOtp = async (otp: string) => {
    if (!user) return;
    try {
      const res = await apiPost<any>("/auth/verify-otp", { phone: user.phone, otp });
      if (res.success) { setOtpVerified(true); toast({ title: "Phone verified!", variant: "success" }); }
      else toast({ title: res.error || "Invalid OTP", variant: "danger" });
    } catch { toast({ title: "Verification failed", variant: "danger" }); }
  };

  const verifyDigilocker = async () => {
    setDigilockerLoading(true);
    try {
      const res = await apiPost<any>("/verification/digilocker", { aadhaarNumber });
      if (res.success && res.data.verified) {
        setDigilockerVerified(true);
        toast({ title: "DigiLocker verified!", variant: "success" });
      } else toast({ title: res.error || "Failed", variant: "danger" });
    } catch { toast({ title: "DigiLocker verification failed", variant: "danger" }); }
    finally { setDigilockerLoading(false); }
  };

  const verifyAadhaarOtp = async (otp: string) => {
    setAadhaarOtpLoading(true);
    try {
      const res = await apiPost<any>("/verification/aadhaar-otp", { aadhaarNumber, otp });
      if (res.success && res.data.verified) {
        setAadhaarOtpVerified(true);
        toast({ title: "Aadhaar OTP verified!", variant: "success" });
      } else toast({ title: res.error || "Invalid OTP", variant: "danger" });
    } catch { toast({ title: "Verification failed", variant: "danger" }); }
    finally { setAadhaarOtpLoading(false); }
  };

  const saveAndContinue = async () => {
    setSaving(true);
    try {
      const res = await apiPost<any>("/verification/consumer", {
        aadhaarNumber,
      });
      if (res.success) {
        toast({ title: "Verification complete!", variant: "success" });
        router.push("/consumer/book");
      } else toast({ title: res.error || "Failed", variant: "danger" });
    } catch { toast({ title: "Failed to save verification", variant: "danger" }); }
    finally { setSaving(false); }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  }

  const allVerified = otpVerified && digilockerVerified && aadhaarOtpVerified;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Identity Verification</h1>
          <p className="mt-2 text-sm text-gray-500">
            To hire workers securely, please verify your identity. This protects both you and our worker community.
          </p>
        </div>

        {status && status.fullyVerified && !allVerified && (
          <div className="rounded-lg bg-green-50 p-4 flex items-center gap-3">
            <Check className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-700">You are fully verified. Continue to booking.</p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Phone className="h-5 w-5 text-indigo-600" /> Phone Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!otpSent && !otpVerified ? (
              <Button onClick={sendOtp} className="w-full">Send OTP to {user?.phone}</Button>
            ) : !otpVerified ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">Enter the 6-digit OTP sent to your phone</p>
                <OtpInput length={6} onComplete={verifyOtp} />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-600"><Check className="h-5 w-5" /><span className="font-medium">Phone Verified</span></div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-indigo-600" /> DigiLocker & Aadhaar Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-xs text-blue-700">
                Mock verification in demo mode. Production uses real DigiLocker API + UIDAI OTP.
              </p>
            </div>
            <Input
              label="Aadhaar Number"
              value={aadhaarNumber}
              onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, "").slice(0, 12))}
              placeholder="12-digit Aadhaar number"
              disabled={digilockerVerified}
            />
            {aadhaarNumber.length === 12 && !digilockerVerified && (
              <Button onClick={verifyDigilocker} disabled={digilockerLoading} className="w-full">
                {digilockerLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                Verify with DigiLocker
              </Button>
            )}
            {digilockerVerified && (
              <div className="flex items-center gap-2 text-green-600"><Check className="h-5 w-5" /><span className="font-medium">DigiLocker Verified</span></div>
            )}

            {digilockerVerified && !aadhaarOtpVerified && (
              <div className="space-y-3 border-t pt-3">
                <p className="text-sm text-gray-500">Enter the 6-digit OTP sent to your Aadhaar-linked mobile (any code in demo)</p>
                <OtpInput length={6} onComplete={verifyAadhaarOtp} disabled={aadhaarOtpLoading} />
              </div>
            )}
            {aadhaarOtpVerified && (
              <div className="flex items-center gap-2 text-green-600"><Check className="h-5 w-5" /><span className="font-medium">Aadhaar OTP Verified</span></div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push("/consumer/dashboard")}>Skip for now</Button>
          <Button className="flex-1" onClick={saveAndContinue} disabled={!allVerified || saving} loading={saving}>
            {allVerified ? "Save & Go to Booking" : <><AlertTriangle className="mr-2 h-4 w-4" /> Complete Verification</>}
            {allVerified && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}