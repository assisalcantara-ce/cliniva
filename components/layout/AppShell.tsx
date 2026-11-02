"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  aiOnline: initialAiOnline,
  initialAiMode = "verificando",
  aiProvider,
}: {
  children: ReactNode;
  aiOnline?: boolean;
  initialAiMode?: "openai" | "groq" | "offline" | "verificando";
  aiProvider: "openai" | "mock";
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [aiMode, setAiMode] = useState<"openai" | "groq" | "offline" | "verificando">(
    initialAiMode !== "verificando"
      ? initialAiMode
      : initialAiOnline
      ? "openai"
      : "verificando",
  );

  // Carrega preferência do sidebar (compacto vs expandido) do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cliniva_sidebar_collapsed");
      if (saved !== null) {
        const shouldCollapse = saved === "true";
        queueMicrotask(() => {
          setIsCollapsed(shouldCollapse);
        });
      }
    } catch {
      // Ignora erro de acesso ao localStorage
    }
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("cliniva_sidebar_collapsed", String(next));
      } catch {
        // Ignora
      }
      return next;
    });
  };

  useEffect(() => {
    async function refreshAiStatus() {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) {
          // Se for erro de autenticação explícito (401), o copiloto não está acessível
          if (res.status === 401) {
            setAiMode("offline");
          }
          // Em caso de falha transitória de servidor (500, 502, 503) ou outros erros de rede,
          // preserva o modo anterior e NÃO força para offline levianamente
          return;
        }
        const json = (await res.json()) as { ai?: { has_key?: boolean; has_groq?: boolean } };
        const hasKey = Boolean(json.ai?.has_key);
        const groqAvailable = Boolean(json.ai?.has_groq);

        // Prioridade: chave individual configurada do profissional > groq > offline
        if (hasKey) {
          setAiMode("openai");
        } else if (groqAvailable) {
          setAiMode("groq");
        } else if (aiProvider === "mock") {
          // Modo mock exclusivo para desenvolvimento/testes quando configurado
          setAiMode("offline");
        } else {
          setAiMode("offline");
        }
      } catch (err) {
        // Falha de rede (offline local do navegador ou timeout de conexão):
        // Não assume que o copiloto está offline se já tínhamos um modo definido ou se é transitório
        console.warn("[AppShell] Falha na verificação de rede para status do copiloto:", err);
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
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-300 ease-in-out",
          isCollapsed ? "md:pl-[80px]" : "md:pl-[280px]"
        )}
      >
        <AppTopbar aiMode={aiMode} onOpenSidebar={() => setSidebarOpen(true)} />

        <main className="mx-auto w-full max-w-[1400px] px-6 py-0">{children}</main>
      </div>
    </div>
  );
}
