"use client";

import { useState, useEffect } from "react";
import { useBookingStore } from "@/store/bookingStore";
import { ServiceCard } from "@/components/booking/ServiceCard";
import { WorkerCard } from "@/components/booking/WorkerCard";
import { MapPlaceholder } from "@/components/ui/map-placeholder";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { Service, WorkerProfile } from "@/lib/types";

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const mockServices: Service[] = [
  { id: "1", coopId: "c1", categoryName: "Plumbing", categorySlug: "plumbing", name: "Plumbing Repair", description: "Fix leaks, install fittings, pipe work", basePrice: 400, unit: "fixed", isActive: true },
  { id: "2", coopId: "c1", categoryName: "Electrical", categorySlug: "electrical", name: "Electrical Work", description: "Wiring, switch repair, fan installation", basePrice: 350, unit: "fixed", isActive: true },
  { id: "3", coopId: "c1", categoryName: "Cleaning", categorySlug: "cleaning", name: "Home Cleaning", description: "Deep cleaning, regular maintenance", basePrice: 300, unit: "fixed", isActive: true },
  { id: "4", coopId: "c1", categoryName: "Transport", categorySlug: "transport", name: "Local Transport", description: "Goods transport, moving services", basePrice: 500, unit: "per_hour", isActive: true },
  { id: "5", coopId: "c1", categoryName: "Carpentry", categorySlug: "carpentry", name: "Carpentry", description: "Furniture repair, woodwork", basePrice: 450, unit: "fixed", isActive: true },
  { id: "6", coopId: "c1", categoryName: "AC Repair", categorySlug: "ac_repair", name: "AC Service", description: "AC installation, repair, gas refill", basePrice: 600, unit: "fixed", isActive: true },
];

const mockWorkers: WorkerProfile[] = [
  { id: "w1", userId: "u1", user: { id: "u1", name: "Rajesh Kumar", phone: "9876543210", role: "WORKER", locale: "en", isActive: true, createdAt: "", updatedAt: "" }, status: "VERIFIED", skillTags: ["Plumbing", "AC Repair"], experienceYears: 5, isAvailable: true, isOnDuty: true, avgRating: 4.8, totalJobs: 234, totalEarnings: 156000, walletBalance: 12000, kycStatus: "VERIFIED", aadhaarVerified: true },
  { id: "w2", userId: "u2", user: { id: "u2", name: "Priya Devi", phone: "9876543211", role: "WORKER", locale: "en", isActive: true, createdAt: "", updatedAt: "" }, status: "VERIFIED", skillTags: ["Cleaning", "Carpentry"], experienceYears: 3, isAvailable: true, isOnDuty: true, avgRating: 4.6, totalJobs: 156, totalEarnings: 89000, walletBalance: 8000, kycStatus: "VERIFIED", aadhaarVerified: true },
  { id: "w3", userId: "u3", user: { id: "u3", name: "Suresh Patel", phone: "9876543212", role: "WORKER", locale: "en", isActive: true, createdAt: "", updatedAt: "" }, status: "VERIFIED", skillTags: ["Electrical", "Plumbing"], experienceYears: 7, isAvailable: false, isOnDuty: false, avgRating: 4.9, totalJobs: 412, totalEarnings: 298000, walletBalance: 34000, kycStatus: "VERIFIED", aadhaarVerified: true },
];

const steps = ["Select Service", "Location & Details", "Choose Worker", "Confirm"];

export default function BookPage() {
  const { step, selectedService, setStep, setSelectedService, bookingAddress, setBookingAddress } = useBookingStore();
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfile | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  const handlePay = async () => {
    if (!selectedService) return;
    setPaying(true);
    try {
      const amountInPaise = selectedService.basePrice * 100;

      const orderRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ amount: amountInPaise, receipt: `booking-${Date.now()}` }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.error);

      const keyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/key`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const keyData = await keyRes.json();
      if (!keyData.success) throw new Error(keyData.error);

      const options = {
        key: keyData.data.keyId,
        amount: orderData.data.amount,
        currency: orderData.data.currency,
        name: "CoopGig",
        description: `Payment for ${selectedService.name}`,
        order_id: orderData.data.id,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                bookingId: orderData.data.receipt,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              alert("Booking confirmed and payment successful!");
              setStep(1);
            } else {
              alert("Payment verification failed: " + verifyData.error);
            }
          } catch {
            alert("Payment verification failed. Please contact support.");
          }
        },
        prefill: { name: "", contact: "" },
        theme: { color: "#4f46e5" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        alert("Payment failed. Please try again.");
      });
      rzp.open();
    } catch (err: any) {
      alert("Error: " + (err.message || "Something went wrong"));
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 font-heading">Book a Service</h1>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 shrink-0">
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold", i + 1 <= step ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500")}>
              {i + 1 < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn("text-sm font-medium", i + 1 <= step ? "text-gray-900" : "text-gray-400")}>{s}</span>
            {i < steps.length - 1 && <div className="w-8 h-0.5 bg-gray-200" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="animate-slide-up">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Choose a Service</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mockServices.map((s) => (
              <ServiceCard
                key={s.id}
                service={s}
                selected={selectedService?.id === s.id}
                onClick={() => { setSelectedService(s); setStep(2); }}
              />
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="max-w-2xl space-y-4 animate-slide-up">
          <h2 className="text-lg font-semibold text-gray-900">Enter Location & Details</h2>
          <Input label="Address" placeholder="Enter your address" value={bookingAddress} onChange={(e) => setBookingAddress(e.target.value)} />
          <MapPlaceholder lat={28.6139} lng={77.209} />
          <Input label="Description (optional)" placeholder="Describe the issue..." />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)} disabled={!bookingAddress}>Continue</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 animate-slide-up">
          <h2 className="text-lg font-semibold text-gray-900">Nearby Workers</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {mockWorkers.filter(w => w.isAvailable).map((w) => (
              <WorkerCard
                key={w.id}
                worker={w}
                distance={Math.random() * 5 + 0.5}
                onBook={() => { setSelectedWorker(w); setStep(4); }}
              />
            ))}
          </div>
          <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
        </div>
      )}

      {step === 4 && (
        <div className="max-w-lg space-y-4 animate-slide-up">
          <h2 className="text-lg font-semibold text-gray-900">Confirm Booking</h2>
          <Card>
            <CardHeader><CardTitle className="text-base">Booking Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Service</span><span className="font-medium">{selectedService?.name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Worker</span><span className="font-medium">{selectedWorker?.user?.name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Address</span><span className="font-medium text-right max-w-[60%]">{bookingAddress}</span></div>
              <div className="border-t pt-3">
                <div className="flex justify-between"><span className="text-gray-500">Service Price</span><span className="font-medium">{formatCurrency(selectedService?.basePrice || 0)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-400">Commission (4%)</span><span className="text-gray-400">{formatCurrency((selectedService?.basePrice || 0) * 0.04)}</span></div>
                <div className="flex justify-between text-lg font-bold mt-2"><span>Total</span><span className="text-indigo-600">{formatCurrency(selectedService?.basePrice || 0)}</span></div>
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
            <Button className="flex-1" onClick={handlePay} disabled={paying}>
              {paying ? "Processing..." : `Confirm & Pay ${formatCurrency(selectedService?.basePrice || 0)}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
