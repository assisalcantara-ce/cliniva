"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  subtitle: string;
  match?: "exact" | "prefix";
  badge?: string | number;
  icon: (props: { className?: string; active?: boolean }) => React.JSX.Element;
};

// ==========================================
// ÍCONES SVG MODERNOS & MINIMALISTAS (LUCIDE STYLE)
// ==========================================

function ClinivaBrandLogo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3 select-none", collapsed ? "justify-center" : "")}>
      {/* Símbolo do Cérebro / Perfil Inteligente */}
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400/20 via-cyan-500/15 to-transparent border border-cyan-400/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-cyan-400" stroke="currentColor" strokeWidth="1.75">
          {/* Perfil Humano / Cabeça */}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.5 19C8.5 16.5 10 15 11 14C10 13 9.5 11.5 10 9.5C10.8 6.5 13 5 16.5 5.5C19.5 6 20.5 8.5 20.5 11C20.5 13.5 19 15 18 16V17.5C18 18.5 17 19.5 16 20L15 20.5H10.5C9.5 20.5 8.5 19.8 8.5 19Z"
          />
          {/* Conexões Neurais e Ponto de Diálogo */}
          <circle cx="14" cy="9.5" r="1" fill="#00D2C4" stroke="none" />
          <circle cx="17" cy="9" r="1" fill="#00D2C4" stroke="none" />
          <circle cx="16" cy="12" r="1" fill="#00D2C4" stroke="none" />
          <path d="M14 9.5L17 9M17 9L16 12M14 9.5L16 12" stroke="#00D2C4" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </div>

      {!collapsed && (
        <div className="min-w-0 flex-1 animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-extrabold tracking-tight text-white font-sans">
              Cliniva
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase">
              — COPILOT —
            </span>
          </div>
          <p className="text-[10px] text-slate-400/90 leading-none mt-1">
            <span className="font-semibold text-cyan-300">IA que apoia.</span> Você que lidera.
          </p>
        </div>
      )}
    </div>
  );
}

function HomeIcon({ className = "h-5 w-5", active }: { className?: string; active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.75"} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UsersIcon({ className = "h-5 w-5", active }: { className?: string; active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.75"} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function SessionsIcon({ className = "h-5 w-5", active }: { className?: string; active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.75"} className={className}>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="16" x2="16" y1="2" y2="6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="8" x2="8" y1="2" y2="6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="3" x2="21" y1="10" y2="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 14v4M10 16h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AppointmentsIcon({ className = "h-5 w-5", active }: { className?: string; active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.75"} className={className}>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="16" x2="16" y1="2" y2="6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="8" x2="8" y1="2" y2="6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="3" x2="21" y1="10" y2="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MaterialsIcon({ className = "h-5 w-5", active }: { className?: string; active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.75"} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="16" y1="13" x2="8" y2="13" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="16" y1="17" x2="8" y2="17" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="10" y1="9" x2="8" y2="9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SupportIcon({ className = "h-5 w-5", active }: { className?: string; active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.75"} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}

function SettingsIcon({ className = "h-5 w-5", active }: { className?: string; active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.75"} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrownIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5ZM19 19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V18H19V19Z" />
    </svg>
  );
}

function ChevronRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
    </svg>
  );
}

function ChevronDownIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ChevronsLeftIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m11 17-5-5 5-5m7 10-5-5 5-5" />
    </svg>
  );
}

function ChevronsRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 17 5-5-5-5m7 10 5-5-5-5" />
    </svg>
  );
}

function UserIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LogOutIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "DC";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function isItemActive(pathname: string | null, item: NavItem): boolean {
  if (!pathname) return false;
  if (item.match === "exact") return pathname === item.href;
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

// ==========================================
// COMPONENTE PRINCIPAL APPSIDEBAR
// ==========================================

export interface AppSidebarProps {
  open?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AppSidebar({
  open = false,
  onClose,
  collapsed = false,
  onToggleCollapse,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const mainNavItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      subtitle: "Visão geral da sua prática",
      match: "exact",
      icon: HomeIcon,
    },
    {
      href: "/patients",
      label: "Pacientes",
      subtitle: "Gestão de pacientes",
      match: "prefix",
      icon: UsersIcon,
    },
    {
      href: "/sessions",
      label: "Sessões",
      subtitle: "Atendimentos e histórico",
      match: "prefix",
      icon: SessionsIcon,
    },
    {
      href: "/appointments",
      label: "Agendamentos",
      subtitle: "Sua agenda e compromissos",
      match: "prefix",
      icon: AppointmentsIcon,
    },
    {
      href: "/materials",
      label: "Materiais",
      subtitle: "Recursos e documentos",
      match: "prefix",
      icon: MaterialsIcon,
    },
    {
      href: "/support",
      label: "Suporte",
      subtitle: "Ajuda e atendimento",
      match: "prefix",
      icon: SupportIcon,
    },
  ];

  const configNavItems: NavItem[] = [
    {
      href: "/settings",
      label: "Configurações",
      subtitle: "Sua conta e preferências",
      match: "prefix",
      icon: SettingsIcon,
    },
  ];

  async function handleLogout() {
    try {
      if (logout) {
        await logout();
      } else {
        await fetch("/api/auth/logout", { method: "POST" });
      }
      router.push("/login");
    } catch (err) {
      console.error("Logout error:", err);
      router.push("/login");
    }
  }

  const userName = user?.name || "Dra. Cristiane";
  const userInitials = getInitials(userName);

  return (
    <>
      {/* Overlay Backdrop para Mobile */}
      <button
        type="button"
        aria-label="Fechar menu lateral"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-300 md:hidden",
          open ? "opacity-100 block" : "opacity-0 pointer-events-none hidden"
        )}
      />

      {/* Sidebar Principal (Design Dark Navy Sofisticado & Flutuante) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-[#081726] text-white border-r border-[#132D42]",
          "transition-all duration-300 ease-in-out select-none shadow-2xl md:shadow-none",
          // Largura responsiva (compacto vs expandido)
          collapsed ? "w-[80px]" : "w-[280px]",
          // Visibilidade Mobile vs Desktop
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Ambient Glow Background Pattern */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="absolute top-1/2 -right-24 h-64 w-64 rounded-full bg-teal-500/15 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-blue-600/15 blur-3xl" />
        </div>

        {/* 1. Header do Sidebar (Logo + Botão de Recolher/Expandir) */}
        <div
          className={cn(
            "relative z-10 border-b border-white/[0.07] shrink-0 transition-all duration-300",
            collapsed
              ? "flex flex-col items-center gap-3 px-2 py-4 justify-center"
              : "flex items-center justify-between px-5 py-5"
          )}
        >
          <Link
            href="/dashboard"
            onClick={() => onClose?.()}
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
          >
            <ClinivaBrandLogo collapsed={collapsed} />
          </Link>

          {/* Botão de Toggle Desktop (Expandir / Recolher) */}
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            className={cn(
              "hidden md:flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.1] transition-all cursor-pointer shadow-2xs",
              collapsed ? "w-7 h-7" : ""
            )}
          >
            {collapsed ? (
              <ChevronsRightIcon className="h-4 w-4 text-cyan-400" />
            ) : (
              <ChevronsLeftIcon className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* 2. Área de Navegação com Scroll Discreto */}
        <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden px-3.5 py-4 space-y-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* Seção Principal */}
          <nav className="space-y-1.5" aria-label="Navegação principal">
            {mainNavItems.map((item) => {
              const active = isItemActive(pathname, item);
              const IconComponent = item.icon;

              return (
                <div key={item.href} className="relative group">
                  <Link
                    href={item.href}
                    onClick={() => onClose?.()}
                    className={cn(
                      "relative flex items-center rounded-xl transition-all duration-200",
                      collapsed
                        ? "justify-center p-3 h-12 w-12 mx-auto"
                        : "gap-3 px-3.5 py-2.5 w-full",
                      active
                        ? "bg-gradient-to-r from-[#0E354B] to-[#0A2638] border border-cyan-500/40 text-white shadow-[0_0_15px_rgba(6,182,212,0.12)] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3.5px] before:rounded-r-full before:bg-cyan-400 before:shadow-[0_0_10px_#06b6d4]"
                        : "text-slate-300 hover:text-white hover:bg-white/[0.06] border border-transparent"
                    )}
                  >
                    {/* Ícone com Container Suave */}
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                        active
                          ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/40"
                          : "bg-white/[0.04] text-slate-400 group-hover:text-white group-hover:bg-white/[0.08]"
                      )}
                    >
                      <IconComponent active={active} className="h-4 w-4" />
                    </div>

                    {/* Texto (Expandido) */}
                    {!collapsed && (
                      <div className="min-w-0 flex-1 flex items-center justify-between gap-1">
                        <div className="min-w-0">
                          <span
                            className={cn(
                              "block text-xs font-semibold leading-tight truncate",
                              active ? "text-white" : "text-slate-200 group-hover:text-white"
                            )}
                          >
                            {item.label}
                          </span>
                          <span
                            className={cn(
                              "block text-[10px] leading-tight truncate mt-0.5",
                              active ? "text-cyan-200/70" : "text-slate-400/70 group-hover:text-slate-300"
                            )}
                          >
                            {item.subtitle}
                          </span>
                        </div>

                        {/* Chevron ou Badge */}
                        <div className="flex items-center gap-1.5 shrink-0 pl-1">
                          {item.badge && (
                            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500/90 px-1.5 text-[10px] font-bold text-white shadow-xs">
                              {item.badge}
                            </span>
                          )}
                          <ChevronRightIcon
                            className={cn(
                              "h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5",
                              active ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </Link>

                  {/* Tooltip para Estado Compacto */}
                  {collapsed && (
                    <div className="pointer-events-none absolute left-[76px] top-1/2 -translate-y-1/2 z-50 hidden md:group-hover:flex items-center">
                      <div className="rounded-lg bg-[#0D2438] border border-cyan-500/30 px-3 py-1.5 text-xs font-semibold text-white shadow-xl whitespace-nowrap">
                        {item.label}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {item.subtitle}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Seção Secundária (Configuração) */}
          <div className="pt-2 border-t border-white/[0.07] space-y-1.5">
            {!collapsed && (
              <div className="px-3 py-1">
                <span className="text-[10px] font-bold tracking-widest text-slate-400/70 uppercase">
                  Configuração
                </span>
              </div>
            )}

            {configNavItems.map((item) => {
              const active = isItemActive(pathname, item);
              const IconComponent = item.icon;

              return (
                <div key={item.href} className="relative group">
                  <Link
                    href={item.href}
                    onClick={() => onClose?.()}
                    className={cn(
                      "relative flex items-center rounded-xl transition-all duration-200",
                      collapsed
                        ? "justify-center p-3 h-12 w-12 mx-auto"
                        : "gap-3 px-3.5 py-2.5 w-full",
                      active
                        ? "bg-gradient-to-r from-[#0E354B] to-[#0A2638] border border-cyan-500/40 text-white shadow-[0_0_15px_rgba(6,182,212,0.12)] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3.5px] before:rounded-r-full before:bg-cyan-400 before:shadow-[0_0_10px_#06b6d4]"
                        : "text-slate-300 hover:text-white hover:bg-white/[0.06] border border-transparent"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                        active
                          ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/40"
                          : "bg-white/[0.04] text-slate-400 group-hover:text-white group-hover:bg-white/[0.08]"
                      )}
                    >
                      <IconComponent active={active} className="h-4 w-4" />
                    </div>

                    {!collapsed && (
                      <div className="min-w-0 flex-1 flex items-center justify-between gap-1">
                        <div className="min-w-0">
                          <span
                            className={cn(
                              "block text-xs font-semibold leading-tight truncate",
                              active ? "text-white" : "text-slate-200 group-hover:text-white"
                            )}
                          >
                            {item.label}
                          </span>
                          <span
                            className={cn(
                              "block text-[10px] leading-tight truncate mt-0.5",
                              active ? "text-cyan-200/70" : "text-slate-400/70 group-hover:text-slate-300"
                            )}
                          >
                            {item.subtitle}
                          </span>
                        </div>

                        <ChevronRightIcon
                          className={cn(
                            "h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5",
                            active ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"
                          )}
                        />
                      </div>
                    )}
                  </Link>

                  {collapsed && (
                    <div className="pointer-events-none absolute left-[76px] top-1/2 -translate-y-1/2 z-50 hidden md:group-hover:flex items-center">
                      <div className="rounded-lg bg-[#0D2438] border border-cyan-500/30 px-3 py-1.5 text-xs font-semibold text-white shadow-xl whitespace-nowrap">
                        {item.label}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {item.subtitle}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Área Inferior (Cliniva Premium + Perfil do Terapeuta) */}
        <div
          className={cn(
            "relative z-10 border-t border-white/[0.07] space-y-3 bg-[#07131F]/70 shrink-0 transition-all duration-300",
            collapsed ? "p-2.5" : "p-3.5"
          )}
        >
          {/* Card Cliniva Premium */}
          {collapsed ? (
            <div className="relative group flex justify-center">
              <Link
                href="/planos"
                onClick={() => onClose?.()}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-600/10 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/25 transition-all shadow-sm"
              >
                <CrownIcon className="h-5 w-5 text-cyan-300" />
              </Link>
              <div className="pointer-events-none absolute left-[76px] top-1/2 -translate-y-1/2 z-50 hidden md:group-hover:flex items-center">
                <div className="rounded-lg bg-[#0D2438] border border-cyan-500/30 px-3 py-1.5 text-xs font-semibold text-cyan-300 shadow-xl whitespace-nowrap">
                  Cliniva Premium
                  <span className="block text-[10px] text-slate-400 font-normal">
                    Recursos avançados ativos
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <Link
              href="/planos"
              onClick={() => onClose?.()}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-br from-[#0B2A3B] to-[#071E2B] border border-cyan-500/25 hover:border-cyan-500/45 transition-all shadow-sm group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shadow-2xs">
                  <CrownIcon className="h-4 w-4 text-cyan-300" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-cyan-300 leading-tight">
                    Cliniva Premium
                  </span>
                  <span className="block text-[10px] text-slate-400/85 leading-tight truncate mt-0.5">
                    Mais recursos para sua prática
                  </span>
                </div>
              </div>
              <ChevronRightIcon className="h-4 w-4 text-cyan-500/60 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          )}

          {/* Card do Perfil do Terapeuta */}
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                title={userName}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-100 to-white text-[#0B1E2E] font-bold text-xs ring-2 ring-cyan-500/30 shadow-xs cursor-default"
              >
                {userInitials}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Sair da conta"
                aria-label="Sair da conta"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
              >
                <LogOutIcon className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex w-full items-center justify-between p-2.5 text-left hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-100 to-white text-[#0B1E2E] font-bold text-xs ring-2 ring-cyan-500/30 shadow-xs">
                    {userInitials}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-white truncate leading-tight">
                      {userName}
                    </span>
                    <span className="block text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                      Psicóloga Clínica
                    </span>
                  </div>
                </div>

                <ChevronDownIcon
                  className={cn(
                    "h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0",
                    profileMenuOpen ? "rotate-180 text-white" : ""
                  )}
                />
              </button>

              {/* Menu Acordeon do Perfil */}
              {profileMenuOpen && (
                <div className="border-t border-white/[0.08] p-2 space-y-1 bg-black/20 animate-in fade-in duration-150 text-xs">
                  <Link
                    href="/settings"
                    onClick={() => onClose?.()}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                    <span>Meu perfil</span>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => onClose?.()}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <SettingsIcon className="h-3.5 w-3.5 text-slate-400" />
                    <span>Preferências</span>
                  </Link>

                  <div className="h-px bg-white/[0.08] my-1" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors font-medium text-left cursor-pointer"
                  >
                    <LogOutIcon className="h-3.5 w-3.5 text-rose-400" />
                    <span>Sair da conta</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
