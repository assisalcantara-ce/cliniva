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
  const [aiMode, setAiMode] = useState<"openai" | "groq" | "offline">(
    initialAiOnline ? "openai" : "offline",
  );

  useEffect(() => {
    async function refreshAiStatus() {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) {
          setAiMode("offline");
          return;
        }
        const json = (await res.json()) as { ai?: { has_key?: boolean; has_groq?: boolean } };
        const hasKey = Boolean(json.ai?.has_key);
        const groqAvailable = Boolean(json.ai?.has_groq);
        if (aiProvider !== "mock" && hasKey) {
          setAiMode("openai");
        } else if (groqAvailable) {
          setAiMode("groq");
        } else {
          setAiMode("offline");
        }
      } catch {
        setAiMode("offline");
      }
    }

    void refreshAiStatus();

    function onVisible() {
      if (document.visibilityState === "visible") void refreshAiStatus();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", () => void refreshAiStatus());

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [aiProvider]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-screen flex-col md:pl-[260px]">
        <AppTopbar aiMode={aiMode} onOpenSidebar={() => setSidebarOpen(true)} />

        <main className="mx-auto w-full max-w-[1400px] px-6 py-0">{children}</main>
      </div>
    </div>
  );
}
