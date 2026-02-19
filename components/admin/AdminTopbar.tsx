'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export function AdminTopbar() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchAdmin() {
      try {
        const res = await fetch('/api/admin/me');
        if (res.ok) {
          const data = await res.json();
          setAdmin(data.admin);
        } else {
          router.push('/admin/login');
        }
      } catch (err) {
        console.error('Failed to fetch admin:', err);
      }
    }

    fetchAdmin();
  }, [router]);

  if (!admin) return null;

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 sticky top-0 z-40">
      <div className="flex-1"></div>
      
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-medium text-slate-900">{admin.full_name}</p>
          <p className="text-sm text-slate-500">{admin.role.replace(/_/g, ' ')}</p>
        </div>
        
        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
          {admin.full_name.charAt(0)}
        </div>
      </div>
    </header>
  );
}
