import { NextRequest, NextResponse } from 'next/server';
import { parseAdminToken } from '@/lib/admin/auth';

export async function GET(req: NextRequest) {
  try {
    const adminToken = req.cookies.get('admin_token')?.value;

    if (!adminToken) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const admin = parseAdminToken(adminToken);

    if (!admin) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      admin: {
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name,
        role: admin.role,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar dados';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
