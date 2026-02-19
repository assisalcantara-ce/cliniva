import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createAdminToken } from '@/lib/admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email é obrigatório'),
  password: z.string().trim().min(1, 'Senha é obrigatória'),
});

// Simple password verification (in production, use proper bcrypt)
function verifyPassword(plainPassword: string, hashedPassword: string): boolean {
  // For now, using a simple comparison
  // In production: use bcryptjs.compare()
  return plainPassword === 'admin123'; // Temporary for demo
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Validate admin email domain
    if (!email.endsWith('@cliniva.com.br')) {
      return NextResponse.json(
        { error: 'Apenas usuários @cliniva.com.br podem acessar' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Query admin_users table
    const { data: adminUser, error } = await supabase
      .from('admin_users')
      .select('id, email, full_name, role, password_hash, is_active')
      .eq('email', email)
      .single();

    if (error || !adminUser) {
      return NextResponse.json(
        { error: 'Email ou senha inválidos' },
        { status: 401 }
      );
    }

    if (!adminUser.is_active) {
      return NextResponse.json(
        { error: 'Usuário inativo' },
        { status: 403 }
      );
    }

    // Verify password (using simple comparison for now)
    if (!verifyPassword(password, adminUser.password_hash)) {
      return NextResponse.json(
        { error: 'Email ou senha inválidos' },
        { status: 401 }
      );
    }

    // Create admin token
    const token = createAdminToken({
      id: adminUser.id,
      email: adminUser.email,
      full_name: adminUser.full_name,
      role: adminUser.role as 'super_admin' | 'moderator' | 'support',
    });

    // Log login action
    await supabase.from('user_audits').insert({
      user_id: adminUser.id,
      action: 'admin_login',
      timestamp: new Date().toISOString(),
    });

    // Create response with cookie
    const response = NextResponse.json(
      {
        message: 'Login bem-sucedido',
        admin: {
          id: adminUser.id,
          email: adminUser.email,
          full_name: adminUser.full_name,
          role: adminUser.role,
        },
      },
      { status: 200 }
    );

    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao fazer login';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
