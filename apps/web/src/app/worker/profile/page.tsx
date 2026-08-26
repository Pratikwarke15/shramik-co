"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Rating } from "@/components/ui/rating";

export default function WorkerProfilePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 font-heading">My Profile</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-700">R</div>
            <div>
              <CardTitle>Rajesh Kumar</CardTitle>
              <p className="text-sm text-gray-500">+91 9876543210</p>
            </div>
            <Badge variant="success" className="ml-auto">Verified</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Experience</span><p className="font-medium">5 years</p></div>
            <div><span className="text-gray-500">Total Jobs</span><p className="font-medium">234</p></div>
            <div><span className="text-gray-500">Total Earnings</span><p className="font-medium">₹1,56,000</p></div>
            <div><span className="text-gray-500">KYC Status</span><p className="font-medium">Aadhaar Verified ✓</p></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Skill Tags</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {["Plumbing", "AC Repair", "Pipe Fitting"].map((s) => (
              <Badge key={s} variant="info">{s}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Rating & Reviews</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">4.8</p>
              <Rating value={4.8} readonly size="sm" />
              <p className="mt-1 text-xs text-gray-400">234 reviews</p>
            </div>
          </div>
          <div className="space-y-3 border-t pt-4">
            {[
              { name: "Amit S.", rating: 5, comment: "Excellent work! Very professional." },
              { name: "Neha G.", rating: 4, comment: "Good job, came on time." },
            ].map((r, i) => (
              <div key={i} className="rounded-lg bg-gray-50 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{r.name}</span>
                  <Rating value={r.rating} readonly size="sm" />
                </div>
                <p className="mt-1 text-sm text-gray-600">{r.comment}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full">Edit Profile</Button>
    </div>
  );
}
