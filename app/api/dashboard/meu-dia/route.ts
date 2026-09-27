import { NextRequest, NextResponse } from "next/server";
import { getTherapistIdFromRequest, authError } from "@/lib/auth";
import { getMeuDiaDashboardData } from "@/lib/db/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard/meu-dia
 * 
 * Endpoint unificado que retorna em alta performance a visão clínica "Meu Dia"
 * para o terapeuta autenticado, agregando agendamentos, próximo atendimento,
 * contexto clínico pré-sessão e pendências pós-sessão sem N+1.
 */
export async function GET(req: NextRequest) {
  let therapistId: string;
  try {
    therapistId = getTherapistIdFromRequest(req);
  } catch (err: unknown) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String((err as { code?: unknown }).code)
        : "UNAUTHENTICATED";
    const { error, status } = authError(code);
    return NextResponse.json({ error }, { status });
  }

  try {
    const data = await getMeuDiaDashboardData({ therapistId });
    return NextResponse.json(data, { status: 200 });
  } catch (err: unknown) {
    console.error("[GET /api/dashboard/meu-dia] Erro ao consolidar dados:", err);
    return NextResponse.json(
      { error: "Falha ao carregar dados do painel Meu Dia." },
      { status: 500 }
    );
  }
}
