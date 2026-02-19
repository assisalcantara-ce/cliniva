"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonClasses } from "@/lib/ui/button";

type NavItem = {
  href: string;
  label: string;
  match?: "exact" | "prefix";
};

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function isActive(pathname: string, item: NavItem) {
  if (item.match === "exact") return pathname === item.href;
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const nav: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", match: "exact" },
    { href: "/patients", label: "Pacientes", match: "prefix" },
    { href: "/materials", label: "Materiais", match: "prefix" },
  ];

  return (
    <div className="min-h-screen bg-amber-50 text-stone-900">
      <div className="mx-auto flex min-h-screen w-full max-w-screen-2xl flex-col md:flex-row">
        {/* Left sidebar */}
        <aside className="border-b border-amber-200 bg-amber-100 text-stone-900 md:w-64 md:border-b-0 md:border-r md:border-amber-200">
          <div className="flex items-center justify-between px-5 py-4 md:block">
            <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
              Cliniva
            </Link>
            <div className="text-xs text-stone-600 md:mt-1">Copiloto de Terapia</div>
          </div>

          <nav className="px-3 pb-4 md:pt-2">
            <div className="grid grid-cols-3 gap-2 md:grid-cols-1">
              {nav.map((item) => {
                const active = pathname ? isActive(pathname, item) : false;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={classNames(
                      "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-amber-300 text-stone-950"
                        : "text-stone-700 hover:bg-amber-200/70 hover:text-stone-950"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-stone-700">
              <div className="font-medium text-stone-900">Modo</div>
              <div className="mt-1">MVP local. IA pode estar em modo mock.</div>
            </div>
          </nav>
        </aside>

        {/* Main + right rail */}
        <div className="flex min-w-0 flex-1 flex-col lg:flex-row">
          <main className="min-w-0 flex-1 px-6 py-8">{children}</main>

          <aside className="hidden w-[360px] shrink-0 border-l border-stone-200 bg-amber-50 px-5 py-6 lg:block">
            <div className="text-sm font-semibold text-stone-900">Ações rápidas</div>
            <div className="mt-2 space-y-2">
              <Link
                href="/patients"
                className={buttonClasses({ variant: "secondary", className: "w-full" })}
              >
                Ver / criar pacientes
              </Link>
              <Link
                href="/materials"
                className={buttonClasses({ variant: "secondary", className: "w-full" })}
              >
                Adicionar materiais
              </Link>
              <Link
                href="/dashboard"
                className={buttonClasses({ variant: "ghost", className: "w-full" })}
              >
                Ir para dashboard
              </Link>
            </div>

            <div className="mt-6 rounded-md border border-stone-200 bg-amber-100/40 p-3 text-xs text-stone-700">
              <div className="font-medium text-stone-900">Dica</div>
              <div className="mt-1">
                Em sessões, use “Gerar suporte (IA)” para sugestões estruturadas (sem diagnóstico).
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
