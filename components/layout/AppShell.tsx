"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";

export function AppShell({
  children,
  aiOnline: initialAiOnline,
  aiProvider,
}: {
  children: ReactNode;
  aiOnline: boolean;
  aiProvider: "openai" | "mock";
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiOnline, setAiOnline] = useState(initialAiOnline);

  useEffect(() => {
    async function refreshAiStatus() {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) {
          setAiOnline(false);
          return;
        }
        const json = (await res.json()) as { ai?: { has_key?: boolean } };
        const hasKey = Boolean(json.ai?.has_key);
        setAiOnline(aiProvider !== "mock" && hasKey);
      } catch {
        setAiOnline(false);
      }
    }

    void refreshAiStatus();
  }, [aiProvider]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-screen flex-col md:pl-[260px]">
        <AppTopbar aiOnline={aiOnline} onOpenSidebar={() => setSidebarOpen(true)} />

        <main className="mx-auto w-full max-w-[1400px] px-6 py-0">{children}</main>
      </div>
    </div>
  );
}
