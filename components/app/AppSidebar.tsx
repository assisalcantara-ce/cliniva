"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

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

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const nav: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", match: "exact" },
    { href: "/patients", label: "Pacientes", match: "prefix" },
    { href: "/materials", label: "Materiais", match: "prefix" },
    { href: "/support", label: "Suporte", match: "prefix" },
  ];

  async function handleLogout() {
    setIsLoggingOut(true);
    await logout();
    router.push("/login");
  }

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border-strong bg-sidebar md:fixed md:inset-y-0 md:left-0 md:flex md:flex-col">
      <div className="px-5 py-5">
        <div className="text-sm font-semibold tracking-tight text-foreground">Cliniva</div>
        <div className="mt-1 text-xs text-muted-foreground">Copiloto de Terapia</div>
      </div>

      <nav className="flex-1 px-3">
        <div className="space-y-1">
          {nav.map((item) => {
            const active = pathname ? isActive(pathname, item) : false;
            return (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                className={cn(
                  "relative w-full justify-start",
                  active
                    ? "bg-sidebar-active text-foreground hover:bg-sidebar-active before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-r before:bg-primary"
                    : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                )}
              >
                <Link href={item.href}>{item.label}</Link>
              </Button>
            );
          })}
        </div>

        <div className="mt-6 rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">Modo</div>
          <div className="mt-1">MVP local. IA pode estar em modo mock.</div>
        </div>
      </nav>

      <div className="border-t border-border-strong p-3 space-y-3">
        {user && (
          <div className="text-xs">
            <div className="text-muted-foreground">Usuário</div>
            <div className="font-semibold text-foreground truncate">{user.name}</div>
            <div className="text-muted-foreground truncate text-xs">{user.email}</div>
          </div>
        )}
        <Button
          onClick={handleLogout}
          disabled={isLoggingOut}
          variant="secondary"
          size="sm"
          className="w-full text-xs"
        >
          {isLoggingOut ? "Saindo..." : "Sair"}
        </Button>
      </div>
    </aside>
  );
}
