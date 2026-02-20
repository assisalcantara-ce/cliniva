'use client';

import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/lib/auth-context';
import SiteFooter from '@/components/layout/SiteFooter';

export default function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const shouldShowFooter = pathname === "/";

  return (
    <AuthProvider>
      {children}
      {shouldShowFooter ? <SiteFooter /> : null}
    </AuthProvider>
  );
}
