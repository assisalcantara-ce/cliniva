"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from "recharts";

export function DonutCard({
  title,
  value,
  label,
}: {
  title: string;
  value: number; // 0..100
  label: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const v = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  const data = [
    { name: "ok", value: v },
    { name: "rest", value: 100 - v },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-2">
          <div className="h-[220px]">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    innerRadius={62}
                    outerRadius={86}
                    paddingAngle={2}
                    stroke="rgba(0,0,0,0)"
                  >
                    <Cell fill="var(--color-primary)" />
                    <Cell fill="rgba(15, 23, 42, 0.08)" />
                  </Pie>
                  <Tooltip formatter={(x) => `${x}%`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full" />
            )}
          </div>

          <div>
            <div className="text-4xl font-semibold tracking-tight text-foreground">{Math.round(v)}%</div>
            <div className="mt-2 text-sm text-muted-foreground">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
