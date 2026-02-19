'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const menuItems = [
  {
    href: '/admin/dashboard',
    label: 'Dashboard',
    icon: '📊',
  },
  {
    href: '/admin/usuarios',
    label: 'Usuários',
    icon: '👥',
  },
  {
    href: '/admin/financeiro',
    label: 'Financeiro',
    icon: '💰',
  },
  {
    href: '/admin/suporte',
    label: 'Suporte',
    icon: '💬',
  },
  {
    href: '/admin/integracoes',
    label: 'Integrações',
    icon: '🔗',
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  async function handleLogout() {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }

  return (
    <aside
      className={`bg-slate-800 border-r border-slate-700 transition-all duration-300 flex flex-col ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-slate-700">
        {!isCollapsed && (
          <div>
            <h1 className="text-lg font-bold text-white">Cliniva</h1>
            <p className="text-xs text-slate-400">Admin</p>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-slate-400 hover:text-white ml-auto"
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      {/* Menu Items */}
      <nav className="px-4 py-6 space-y-3 flex-1">
        {menuItems.map(item => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                {!isCollapsed && <span className="font-medium">{item.label}</span>}
                {isCollapsed && (
                  <div className="absolute left-20 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 hover:opacity-100 pointer-events-none">
                    {item.label}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="px-4 py-4 border-t border-slate-700">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full text-red-400 hover:text-red-300 hover:bg-slate-700"
        >
          {isCollapsed ? '🚪' : 'Sair'}
        </Button>
      </div>
    </aside>
  );
}
