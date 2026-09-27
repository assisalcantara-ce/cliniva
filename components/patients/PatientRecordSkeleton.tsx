import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function PatientRecordSkeleton({ className }: { className?: string }) {
  return (
    <div className={`space-y-6 animate-pulse ${className ?? ""}`}>
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-5">
        <div className="space-y-2">
          <div className="h-4 w-28 rounded bg-muted/50" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-64 rounded-lg bg-muted/70" />
            <div className="h-6 w-16 rounded-full bg-muted/50" />
          </div>
          <div className="h-4 w-40 rounded bg-muted/40" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-28 rounded-lg bg-muted/50" />
          <div className="h-9 w-52 rounded-lg bg-muted/60" />
        </div>
      </div>

      {/* Clinical Context Skeleton */}
      <Card className="border-teal-200/60 bg-teal-50/20">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="h-4 w-48 rounded bg-muted/70" />
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          <div className="h-14 w-full rounded-md bg-muted/30" />
          <div className="flex gap-2">
            <div className="h-6 w-24 rounded-md bg-muted/50" />
            <div className="h-6 w-28 rounded-md bg-muted/50" />
            <div className="h-6 w-20 rounded-md bg-muted/50" />
          </div>
        </CardContent>
      </Card>

      {/* Timeline & Notes Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/60">
            <CardHeader className="border-b border-border/50 pb-3">
              <div className="h-5 w-40 rounded bg-muted/70" />
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="h-20 w-full rounded-lg bg-muted/30" />
              <div className="h-20 w-full rounded-lg bg-muted/30" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="border-b border-border/50 pb-3">
              <div className="h-5 w-28 rounded bg-muted/70" />
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-32 w-full rounded-lg bg-muted/30" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Anamnesis Skeleton */}
      <Card className="border-border/60">
        <CardHeader className="border-b border-border/50 pb-3">
          <div className="h-5 w-32 rounded bg-muted/70" />
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          <div className="h-10 w-full rounded-md bg-muted/30" />
          <div className="h-10 w-full rounded-md bg-muted/30" />
        </CardContent>
      </Card>
    </div>
  );
}
