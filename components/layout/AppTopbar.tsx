"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

function titleFromPath(pathname: string | null) {
  if (!pathname) return "";
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname === "/patients") return "Pacientes";
  if (pathname.startsWith("/patients/")) return "Paciente";
  if (pathname === "/materials") return "Materiais";
  if (pathname === "/sessions") return "Sessões";
  if (pathname.startsWith("/sessions/")) return "Sessão";
  if (pathname === "/settings") return "Configurações";
  return "";
}

function MenuIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

function ChevronDown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function AppTopbar({
  aiOnline,
  onOpenSidebar,
}: {
  aiOnline: boolean;
  onOpenSidebar: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const title = useMemo(() => titleFromPath(pathname), [pathname]);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-4 px-6 py-2">
        <button
          type="button"
          onClick={onOpenSidebar}
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-white text-foreground",
            "shadow-sm shadow-black/5 hover:bg-background md:hidden"
          )}
          aria-label="Abrir menu"
        >
          <MenuIcon className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1"></div>

        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium shadow-sm shadow-black/5",
            aiOnline
              ? "border-green-300 bg-green-50 text-green-900"
              : "border-red-300 bg-red-50 text-red-900"
          )}
        >
          <div className={cn("h-2 w-2 rounded-full", aiOnline ? "bg-green-500" : "bg-red-500")} />
          <span>{aiOnline ? "IA online" : "IA offline"}</span>
        </div>

        <details className="relative">
          <summary className="list-none">
            <div className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-foreground shadow-sm shadow-black/5 hover:bg-background">
              <div className="h-7 w-7 rounded-full bg-primary/15" />
              <div className="hidden sm:block">Dra. Cristiane</div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </summary>
          <div className="absolute right-0 mt-2 w-44 rounded-md border border-border bg-card p-1 text-sm shadow-sm shadow-black/10">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-sm px-3 py-2 text-left text-red-600 hover:bg-red-50"
            >
              Sair
            </button>
          </div>
        </details>
      </div>
    </header>
  );
}
