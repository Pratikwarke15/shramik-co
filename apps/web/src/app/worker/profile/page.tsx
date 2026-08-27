"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { Rating } from "@/components/ui/rating";
import { formatCurrency } from "@/lib/utils";
import { apiGet } from "@/lib/api";
import { useToast } from "@/components/providers/ToastProvider";
import type { WorkerProfile, WorkerStatus } from "@/lib/types";

interface ProfileResp {
  id: string;
  status: WorkerStatus;
  skillTags: string[];
  bio?: string;
  experienceYears: number;
  avgRating: number;
  totalJobs: number;
  totalEarnings: number;
  walletBalance: number;
  aadhaarVerified?: boolean;
  coop?: { name: string };
  user?: { name: string; phone: string; avatarUrl?: string };
  reviewsReceived?: { id: string; rating: number; comment?: string; author: { name: string } }[];
}

function statusBadge(status: WorkerStatus) {
  if (status === "VERIFIED") return <Badge variant="success">Verified</Badge>;
  if (status === "PENDING_ADMIN_APPROVAL") return <Badge variant="warning">Pending Approval</Badge>;
  return <Badge variant="danger">{status.replace(/_/g, " ")}</Badge>;
}

export default function WorkerProfilePage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileResp | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await apiGet<{ success: boolean; data: ProfileResp; error?: string }>("/workers/profile");
      if (res.success && res.data) setProfile(res.data);
      else toast({ title: res.error || "Could not load profile", variant: "danger" });
    } catch {
      toast({ title: "Failed to load profile", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  }
  if (!profile) {
    return <div className="py-24 text-center text-gray-500">Profile not found. Please complete onboarding.</div>;
  }

  const initial = (profile.user?.name || "W").charAt(0).toUpperCase();
  const reviews = profile.reviewsReceived || [];

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 font-heading">My Profile</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-700">{initial}</div>
            <div>
              <CardTitle>{profile.user?.name}</CardTitle>
              <p className="text-sm text-gray-500">{profile.user?.phone}</p>
              {profile.coop?.name && <p className="text-xs text-gray-400">{profile.coop.name}</p>}
            </div>
            {statusBadge(profile.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.bio && <p className="text-sm text-gray-600">{profile.bio}</p>}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Experience</span><p className="font-medium">{profile.experienceYears} years</p></div>
            <div><span className="text-gray-500">Total Jobs</span><p className="font-medium">{profile.totalJobs}</p></div>
            <div><span className="text-gray-500">Total Earnings</span><p className="font-medium">{formatCurrency(profile.totalEarnings)}</p></div>
            <div><span className="text-gray-500">Wallet Balance</span><p className="font-medium">{formatCurrency(profile.walletBalance)}</p></div>
            <div><span className="text-gray-500">KYC Status</span><p className="font-medium">{profile.aadhaarVerified ? "Aadhaar Verified ✓" : "Not verified"}</p></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Skill Tags</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(profile.skillTags || []).map((s) => <Badge key={s} variant="info">{s}</Badge>)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Rating & Reviews</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">{profile.avgRating ? profile.avgRating.toFixed(1) : "—"}</p>
              <Rating value={profile.avgRating || 0} readonly size="sm" />
              <p className="mt-1 text-xs text-gray-400">{profile.totalJobs} jobs</p>
            </div>
          </div>
          {reviews.length > 0 ? (
            <div className="space-y-3 border-t pt-4">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{r.author?.name}</span>
                    <Rating value={r.rating} readonly size="sm" />
                  </div>
                  {r.comment && <p className="mt-1 text-sm text-gray-600">{r.comment}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="border-t pt-4 text-sm text-gray-400">No reviews yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
