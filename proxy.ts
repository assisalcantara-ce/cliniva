import { NextRequest, NextResponse } from 'next/server';

// Rotas públicas (não requerem autenticação)
const PUBLIC_ROUTES = [
  '/login',
  '/admin/login',
  '/api/auth/login',
  '/api/admin/login',
  '/api/seed/therapist',
  '/checkout',
  '/checkout/pendente',
  '/checkout/sucesso',
  '/api/checkout',
  '/api/webhook/asaas',
  '/planos',
  '/termos',
  '/privacidade',
];

// Rotas protegidas (requerem autenticação de terapeuta)
const THERAPIST_PROTECTED_ROUTES = [
  '/dashboard',
  '/patients',
  '/sessions',
  '/materials',
  '/settings',
];

// Rotas protegidas (requerem autenticação de admin)
const ADMIN_PROTECTED_ROUTES = [
  '/admin/dashboard',
  '/admin/usuarios',
  '/admin/financeiro',
  '/admin/suporte',
  '/admin/integracoes',
  '/api/admin-users',
  '/api/subscriptions',
  '/api/invoices',
  '/api/tickets',
  '/api/integrations',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Verificar se é rota pública (exata ou prefixo para /checkout/*)
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/'),
  );
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Proteger rotas de admin
  const isAdminRoute = ADMIN_PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  if (isAdminRoute) {
    const adminToken = request.cookies.get('admin_token');
    
    if (!adminToken) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Proteger rotas de terapeuta
  const isTherapistRoute = THERAPIST_PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  if (isTherapistRoute) {
    const authToken = request.cookies.get('auth_token');
    
    if (!authToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
