"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";

export function AppShell({ children, aiOnline: initialAiOnline }: { children: ReactNode; aiOnline: boolean }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiOnline, setAiOnline] = useState(initialAiOnline);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-screen flex-col md:pl-[260px]">
        <AppTopbar aiOnline={aiOnline} onToggleAIStatus={() => setAiOnline(!aiOnline)} onOpenSidebar={() => setSidebarOpen(true)} />

        <main className="mx-auto w-full max-w-[1400px] px-6 py-0">{children}</main>
      </div>
    </div>
  );
}
