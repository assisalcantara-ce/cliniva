import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const response = NextResponse.json(
      { message: 'Logout bem-sucedido' },
      { status: 200 }
    );

    // Clear admin cookie
    response.cookies.set('admin_token', '', {
      httpOnly: true,
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao fazer logout';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
