"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { apiGet } from "@/lib/api";
import { Clock, Shield, FileCheck, Phone, ArrowRight } from "lucide-react";

export default function PendingApprovalPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    apiGet<any>("/workers/profile").then((res) => {
      if (res.success) setProfile(res.data);
    }).catch(() => {});
  }, []);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-lg w-full">
        <CardContent className="p-8 text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Profile Under Review</h1>
            <p className="mt-2 text-sm text-gray-500">
              Your worker registration has been submitted successfully. A cooperative administrator
              will review your documents and approve your profile.
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-4 text-left space-y-2 text-sm">
            <p className="font-medium text-gray-700">Verification Status:</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="info">Phone Verified</Badge>
                <Phone className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="info">DigiLocker Verified</Badge>
                <Shield className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="info">Aadhaar Verified</Badge>
                <FileCheck className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="warning">Admin Approval Pending</Badge>
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          </div>

          {profile && (
            <div className="rounded-lg bg-gray-50 p-4 text-left text-sm space-y-1">
              <p><span className="text-gray-500">Status:</span> <span className="font-medium text-amber-600">{profile.status}</span></p>
              {profile.coop && <p><span className="text-gray-500">Co-op:</span> <span className="font-medium">{profile.coop.name}</span></p>}
              <p><span className="text-gray-500">Skills:</span> <span className="font-medium">{profile.skillTags?.join(", ")}</span></p>
            </div>
          )}

          <div className="space-y-3">
            <Link href="/worker/dashboard">
              <Button className="w-full">
                Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <p className="text-xs text-gray-400">
              You can view your profile but cannot accept jobs until approved.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
