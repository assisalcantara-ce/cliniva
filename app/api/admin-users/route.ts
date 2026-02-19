import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { parseAdminToken } from '@/lib/admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  full_name: z.string().min(1, 'Nome é obrigatório'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export async function GET(req: NextRequest) {
  try {
    const adminToken = req.cookies.get('admin_token')?.value;
    if (!adminToken) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const admin = parseAdminToken(adminToken);
    if (!admin) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();

    // Get all therapists with organizations
    const { data: therapists, error } = await supabase
      .from('therapists')
      .select(
        `
        id,
        display_name,
        email,
        crp,
        photo_url,
        is_active,
        created_at,
        organizations (
          id,
          name,
          cnpj
        )
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ therapists }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminToken = req.cookies.get('admin_token')?.value;
    if (!adminToken) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const admin = parseAdminToken(adminToken);
    if (!admin) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, full_name, password } = parsed.data;

    const supabase = createSupabaseAdminClient();

    // Create therapist
    const { data: therapist, error: therapistError } = await supabase
      .from('therapists')
      .insert({
        display_name: full_name,
        email,
        is_active: true,
      })
      .select()
      .single();

    if (therapistError) {
      return NextResponse.json({ error: therapistError.message }, { status: 500 });
    }

    // Create user (login)
    const { error: userError } = await supabase.from('users').insert({
      therapist_id: therapist.id,
      email,
      password_hash: password, // In production: use bcryptjs
      is_active: true,
    });

    if (userError) {
      // Rollback therapist creation
      await supabase.from('therapists').delete().eq('id', therapist.id);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    // Log action
    await supabase.from('integration_logs').insert({
      integration_id: null,
      event: 'therapist_created',
      status: 'success',
      request_data: { email, full_name },
    });

    return NextResponse.json(
      {
        message: 'Terapeuta criado com sucesso',
        therapist: {
          id: therapist.id,
          display_name: therapist.display_name,
          email: therapist.email,
          is_active: therapist.is_active,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
