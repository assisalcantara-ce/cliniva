"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

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
  aiMode,
  onOpenSidebar,
}: {
  aiMode: "openai" | "groq" | "offline" | "verificando";
  onOpenSidebar: () => void;
}) {
  const router = useRouter();

  const aiLabel =
    aiMode === "openai"
      ? "Copiloto Premium ativado"
      : aiMode === "groq"
      ? "Copiloto gratuito ativado"
      : aiMode === "verificando"
      ? "Verificando Copiloto..."
      : "Copiloto offline";

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-[#E2E8F0]/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-8 py-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#25463E]",
            "shadow-2xs hover:bg-[#F7F2EB] md:hidden cursor-pointer"
          )}
          aria-label="Abrir menu"
        >
          <MenuIcon className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1"></div>

        <div className="flex items-center gap-3">
          {/* Badge Copiloto Ativado conforme Mockup */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-xs font-semibold text-[#205F52] shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{aiLabel}</span>
          </div>

          {/* Sino de Notificações conforme Mockup */}
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:text-[#25463E] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            aria-label="Notificações"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          {/* Menu Terapeuta conforme Mockup */}
          <details className="relative">
            <summary className="list-none cursor-pointer">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 pr-2.5 text-xs font-semibold text-[#25463E] shadow-2xs hover:bg-slate-50 transition-colors">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EAF5ED] text-[#205F52] font-bold text-[11px]">
                  DC
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </div>
            </summary>
            <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-lg z-50">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-lg px-3 py-2 text-left font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"
              >
                Sair da conta
              </button>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
