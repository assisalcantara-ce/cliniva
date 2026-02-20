"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  match?: "exact" | "prefix";
};

function isActive(pathname: string, item: NavItem) {
  if (item.match === "exact") return pathname === item.href;
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M21 21l-4.3-4.3" />
      <circle cx="11" cy="11" r="7" />
    </svg>
  );
}

export function AppSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  const nav: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", match: "exact" },
    { href: "/patients", label: "Pacientes", match: "prefix" },
    { href: "/materials", label: "Materiais", match: "prefix" },
    { href: "/sessions", label: "Sessões", match: "prefix" },
    { href: "/appointments", label: "Agendamentos", match: "prefix" },
    { href: "/support", label: "Suporte", match: "prefix" },
    { href: "/settings", label: "Configurações", match: "prefix" },
  ];

  return (
    <>
      {/* overlay mobile */}
      <button
        type="button"
        aria-label="Fechar menu"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/30 md:hidden",
          open ? "block" : "hidden"
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[260px] border-r border-white/10 bg-sidebar text-white md:z-10 md:block",
          "transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="px-6 py-6">
          <Image
            src="/img/Logor.png"
            alt="Cliniva"
            width={220}
            height={56}
            priority
            className="h-14 w-auto"
          />
          <div className="mt-1 text-xs text-white/70">Copiloto de Terapia</div>

          <div className="mt-5">
            <div className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-white/90 ring-1 ring-white/10">
              <SearchIcon className="h-4 w-4 text-white/70" />
              <input
                placeholder="Buscar"
                className="w-full bg-transparent text-sm outline-none placeholder:text-white/50"
              />
            </div>
          </div>
        </div>

        <nav className="px-3">
          <div className="space-y-1">
            {nav.map((item) => {
              const active = pathname ? isActive(pathname, item) : false;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onClose()}
                  className={cn(
                    "relative flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                    "transition-colors",
                    active
                      ? "bg-sidebar-hover text-white before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-r before:bg-sidebar-indicator"
                      : "text-white/80 hover:bg-sidebar-hover hover:text-white"
                  )}
                >
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>
    </>
  );
}
