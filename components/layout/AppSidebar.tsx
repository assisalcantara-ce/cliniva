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
      {/* Símbolo Cliniva Folha / Bem-estar Clínico */}
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white border border-white/20 shadow-xs">
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-white" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L15 8L21 9L16.5 14L18 20L12 17L6 20L7.5 14L3 9L9 8L12 2Z" className="hidden" />
          <path d="M11 20A7 7 0 0 1 4 13C4 9.13 7.13 6 11 6c4.97 0 9 4.03 9 9 0 2.12-.74 4.07-1.97 5.61" />
          <path d="M12 10a4 4 0 0 0-4 4c0 1.66 1.01 3.08 2.45 3.68" />
          <path d="M21 3v6h-6" />
        </svg>
      </div>

      {!collapsed && (
        <div className="min-w-0 flex-1 animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-bold tracking-tight text-white font-sans">
              Cliniva
            </span>
          </div>
          <p className="text-[11px] font-medium text-emerald-100/90 leading-tight">
            Copilot Clínico
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
      label: "Meu Consultório",
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
      label: "Atendimentos",
      subtitle: "Atendimentos e histórico",
      match: "prefix",
      icon: SessionsIcon,
    },
    {
      href: "/appointments",
      label: "Agenda",
      subtitle: "Sua agenda e compromissos",
      match: "prefix",
      icon: AppointmentsIcon,
    },
    {
      href: "/materials",
      label: "Materiais e Recursos",
      subtitle: "Recursos e documentos",
      match: "prefix",
      icon: MaterialsIcon,
    },
    {
      href: "/support",
      label: "Relatórios",
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

      {/* Sidebar Principal (Design Consultório Acolhedor / Mockup Aprovado) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-[#F7F2EB] text-[#25463E] border-r border-[#E5DEC9]",
          "transition-all duration-300 ease-in-out select-none shadow-2xl md:shadow-none",
          // Largura responsiva (compacto 76px vs expandido 256px)
          collapsed ? "w-[76px]" : "w-[256px]",
          // Visibilidade Mobile vs Desktop
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Imagem de Fundo Decorativa (bg_lateral.png: poltrona, planta e luminária na base) */}
        <div
          className="absolute inset-0 pointer-events-none z-0 bg-no-repeat bg-bottom bg-cover opacity-85"
          style={{
            backgroundImage: "url('/img/bg_lateral.png')",
            backgroundPosition: "center bottom",
          }}
        />

        {/* Overlay sutil para garantir legibilidade absoluta dos itens de navegação */}
        <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-b from-[#F7F2EB] via-[#F7F2EB]/95 to-transparent h-[450px]" />

        {/* 1. Header do Sidebar (Bloco Verde da Marca + Botão de Recolher/Expandir) */}
        <div
          className={cn(
            "relative z-10 shrink-0 transition-all duration-300 bg-[#205F52] text-white shadow-sm",
            collapsed
              ? "flex flex-col items-center gap-2 px-2 py-4 justify-center min-h-[80px]"
              : "flex items-center justify-between px-5 py-4 min-h-[88px]"
          )}
        >
          <Link
            href="/dashboard"
            onClick={() => onClose?.()}
            className="flex items-center gap-3 transition-opacity hover:opacity-95"
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
              "hidden md:flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer",
              collapsed ? "h-7 w-7 mt-1" : ""
            )}
          >
            {collapsed ? (
              <ChevronsRightIcon className="h-4 w-4 text-emerald-200" />
            ) : (
              <ChevronsLeftIcon className="h-4 w-4 text-white" />
            )}
          </button>
        </div>

        {/* 2. Área de Navegação com Scroll Discreto */}
        <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden px-3 pt-4 pb-2 space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
                      "relative flex items-center rounded-xl transition-all duration-200 text-sm font-semibold",
                      collapsed
                        ? "justify-center p-2.5 h-11 w-11 mx-auto"
                        : "gap-3 px-3.5 py-2.5 w-full min-h-[44px]",
                      active
                        ? "bg-[#D9EEE2] text-[#205F52] shadow-xs border-l-[3px] border-[#2C927B]"
                        : "text-[#355D54] hover:text-[#205F52] hover:bg-[#EAF5ED]/90"
                    )}
                  >
                    {/* Ícone com Container Suave */}
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                        active
                          ? "text-[#205F52]"
                          : "text-[#355D54] group-hover:text-[#205F52]"
                      )}
                    >
                      <IconComponent active={active} className="h-4 w-4" />
                    </div>

                    {/* Texto (Expandido) */}
                    {!collapsed && (
                      <div className="min-w-0 flex-1 flex items-center justify-between gap-1">
                        <span className="block text-[13px] font-semibold leading-tight truncate">
                          {item.label}
                        </span>

                        {/* Chevron ou Badge */}
                        <div className="flex items-center gap-1.5 shrink-0 pl-1">
                          {item.badge && (
                            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white shadow-xs">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </Link>

                  {/* Tooltip para Estado Compacto */}
                  {collapsed && (
                    <div className="pointer-events-none absolute left-[76px] top-1/2 -translate-y-1/2 z-50 hidden md:group-hover:flex items-center">
                      <div className="rounded-lg bg-[#205F52] text-white px-3 py-1.5 text-xs font-semibold shadow-xl whitespace-nowrap">
                        {item.label}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Seção Secundária (Configurações) */}
          <div className="pt-2 border-t border-[#E5DEC9]/80 space-y-1.5">
            {configNavItems.map((item) => {
              const active = isItemActive(pathname, item);
              const IconComponent = item.icon;

              return (
                <div key={item.href} className="relative group">
                  <Link
                    href={item.href}
                    onClick={() => onClose?.()}
                    className={cn(
                      "relative flex items-center rounded-xl transition-all duration-200 text-sm font-semibold",
                      collapsed
                        ? "justify-center p-2.5 h-11 w-11 mx-auto"
                        : "gap-3 px-3.5 py-2.5 w-full min-h-[44px]",
                      active
                        ? "bg-[#D9EEE2] text-[#205F52] shadow-xs border-l-[3px] border-[#2C927B]"
                        : "text-[#355D54] hover:text-[#205F52] hover:bg-[#EAF5ED]/90"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                        active
                          ? "text-[#205F52]"
                          : "text-[#355D54] group-hover:text-[#205F52]"
                      )}
                    >
                      <IconComponent active={active} className="h-4 w-4" />
                    </div>

                    {!collapsed && (
                      <div className="min-w-0 flex-1 flex items-center justify-between gap-1">
                        <span className="block text-[13px] font-semibold leading-tight truncate">
                          {item.label}
                        </span>
                      </div>
                    )}
                  </Link>

                  {collapsed && (
                    <div className="pointer-events-none absolute left-[76px] top-1/2 -translate-y-1/2 z-50 hidden md:group-hover:flex items-center">
                      <div className="rounded-lg bg-[#205F52] text-white px-3 py-1.5 text-xs font-semibold shadow-xl whitespace-nowrap">
                        {item.label}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Área Inferior (Perfil do Terapeuta com visual translúcido sofisticado) */}
        <div
          className={cn(
            "relative z-10 shrink-0 transition-all duration-300 mt-auto",
            collapsed ? "p-2" : "p-3"
          )}
        >
          {/* Card do Perfil do Terapeuta */}
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                title={userName}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#205F52] text-white font-bold text-xs ring-2 ring-emerald-500/30 shadow-xs cursor-default"
              >
                {userInitials}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Sair da conta"
                aria-label="Sair da conta"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOutIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="rounded-xl bg-white/80 backdrop-blur-xs border border-white/90 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex w-full items-center justify-between p-2.5 text-left hover:bg-white/90 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#205F52] text-white font-bold text-xs shadow-xs">
                    {userInitials}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-[#25463E] truncate leading-tight">
                      {userName}
                    </span>
                    <span className="block text-[10px] text-[#5C7870] truncate leading-tight mt-0.5">
                      Psicóloga Clínica
                    </span>
                  </div>
                </div>

                <ChevronDownIcon
                  className={cn(
                    "h-3.5 w-3.5 text-[#5C7870] transition-transform duration-200 shrink-0",
                    profileMenuOpen ? "rotate-180 text-[#25463E]" : ""
                  )}
                />
              </button>

              {/* Menu Acordeon do Perfil */}
              {profileMenuOpen && (
                <div className="border-t border-[#E5DEC9]/80 p-2 space-y-1 bg-white/95 animate-in fade-in duration-150 text-xs">
                  <Link
                    href="/settings"
                    onClick={() => onClose?.()}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[#355D54] hover:text-[#205F52] hover:bg-[#EAF5ED] transition-colors"
                  >
                    <UserIcon className="h-3.5 w-3.5 text-[#5C7870]" />
                    <span>Meu perfil</span>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => onClose?.()}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[#355D54] hover:text-[#205F52] hover:bg-[#EAF5ED] transition-colors"
                  >
                    <SettingsIcon className="h-3.5 w-3.5 text-[#5C7870]" />
                    <span>Preferências</span>
                  </Link>

                  <div className="h-px bg-[#E5DEC9]/80 my-1" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors font-medium text-left cursor-pointer"
                  >
                    <LogOutIcon className="h-3.5 w-3.5 text-rose-600" />
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
