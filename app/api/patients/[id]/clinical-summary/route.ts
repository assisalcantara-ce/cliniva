import { NextRequest, NextResponse } from "next/server";
import { getTherapistIdFromRequest, authError } from "@/lib/auth";
import { getPatientClinicalSummary } from "@/lib/db/patientSummary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/patients/[id]/clinical-summary
 * 
 * Fornece em uma única resposta o contexto clínico consolidado e a linha do tempo
 * recente do paciente para o Prontuário Inteligente, garantindo isolamento estrito
 * por therapist_id e eliminando o padrão N+1.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
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
    const resolvedParams = await params;
    const patientId = resolvedParams.id;

    if (!patientId || typeof patientId !== "string") {
      return NextResponse.json(
        { error: "ID de paciente inválido." },
        { status: 400 }
      );
    }

    const summary = await getPatientClinicalSummary({
      patientId,
      therapistId,
      limitSessions: 10,
    });

    if (!summary) {
      return NextResponse.json(
        { error: "Paciente não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json(summary, { status: 200 });
  } catch (err: unknown) {
    console.error("[GET /api/patients/[id]/clinical-summary] Erro:", err);
    return NextResponse.json(
      { error: "Falha ao carregar o resumo clínico do paciente." },
      { status: 500 }
    );
  }
}
