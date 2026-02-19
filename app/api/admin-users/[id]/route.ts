import { NextRequest, NextResponse } from 'next/server';
import { parseAdminToken } from '@/lib/admin/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminToken = req.cookies.get('admin_token')?.value;
    if (!adminToken) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const admin = parseAdminToken(adminToken);
    if (!admin) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createSupabaseAdminClient();

    const { data: therapist, error } = await supabase
      .from('therapists')
      .select(
        `
        id,
        display_name,
        email,
        crp,
        phone,
        address,
        city,
        state,
        zip_code,
        bio,
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
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Terapeuta não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ therapist }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminToken = req.cookies.get('admin_token')?.value;
    if (!adminToken) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const admin = parseAdminToken(adminToken);
    if (!admin) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const supabase = createSupabaseAdminClient();

    const { data: therapist, error } = await supabase
      .from('therapists')
      .update({
        display_name: body.display_name,
        email: body.email,
        crp: body.crp,
        phone: body.phone,
        address: body.address,
        city: body.city,
        state: body.state,
        zip_code: body.zip_code,
        bio: body.bio,
        is_active: body.is_active,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ therapist }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminToken = req.cookies.get('admin_token')?.value;
    if (!adminToken) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const admin = parseAdminToken(adminToken);
    if (!admin) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createSupabaseAdminClient();

    // Just deactivate instead of delete (soft delete)
    const { error } = await supabase
      .from('therapists')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: 'Terapeuta desativado com sucesso' },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
