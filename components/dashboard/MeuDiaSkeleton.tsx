"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export function MeuDiaSkeleton({ className }: { className?: string }) {
  return (
    <div className={`space-y-6 animate-pulse ${className ?? ""}`}>
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 rounded bg-muted/60" />
        <div className="h-4 w-72 rounded bg-muted/40" />
      </div>

      {/* Hero Next Appointment Skeleton */}
      <Card className="border-border/60">
        <div className="border-b border-border/50 bg-muted/30 px-6 py-3.5 flex justify-between items-center">
          <div className="h-4 w-36 rounded bg-muted/70" />
          <div className="h-4 w-24 rounded bg-muted/50" />
        </div>
        <CardContent className="p-6 space-y-4">
          <div className="h-4 w-28 rounded bg-muted/60" />
          <div className="h-7 w-64 rounded bg-muted/80" />
          <div className="h-16 w-full rounded bg-muted/30" />
          <div className="h-8 w-44 rounded bg-muted/50" />
        </CardContent>
      </Card>

      {/* Grid Timeline + Sidebar Skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/60 p-6 space-y-4">
            <div className="h-5 w-40 rounded bg-muted/70" />
            <div className="h-20 w-full rounded bg-muted/30" />
            <div className="h-20 w-full rounded bg-muted/30" />
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="border-border/60 p-4 space-y-3">
            <div className="h-4 w-32 rounded bg-muted/70" />
            <div className="h-12 w-full rounded bg-muted/30" />
          </Card>
        </div>
      </div>
    </div>
  );
}
