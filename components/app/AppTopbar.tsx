"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

function titleFromPath(pathname: string | null) {
  if (!pathname) return "";
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname === "/patients") return "Pacientes";
  if (pathname.startsWith("/patients/")) return "Paciente";
  if (pathname === "/materials") return "Materiais";
  if (pathname.startsWith("/sessions/")) return "Sessão";
  return "";
}

export function AppTopbar({ aiOnline }: { aiOnline: boolean }) {
  const pathname = usePathname();
  const title = useMemo(() => titleFromPath(pathname), [pathname]);

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-screen-2xl items-center gap-4 px-6 py-4">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground">{title}</div>
        </div>

        <div className="hidden w-[360px] md:block">
          <Input placeholder="Buscar..." />
        </div>

        <Badge variant={aiOnline ? "secondary" : "muted"}>{aiOnline ? "IA online" : "IA offline"}</Badge>
      </div>
    </header>
  );
}
