import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTherapistIdFromRequest, authError } from "@/lib/auth";
import { putAnamnesisSchema, upsertPatientAnamnesis } from "@/lib/db/anamnesis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PUT /api/patients/[id]/anamnesis
 * 
 * Atualiza ou insere a ficha de anamnese do paciente, garantindo:
 * 1. Autenticação e isolamento estrito por therapist_id.
 * 2. Preservação defensiva do payload existente (atualizar groups sem perder personal e vice-versa).
 * 3. Formato retornado padronizado e consistente com clinical-summary.
 */
export async function PUT(
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
    const { id } = await params;
    const patientId = z.string().min(1).parse(id);

    const body = await req.json().catch(() => ({}));
    const parsed = putAnamnesisSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload inválido", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await upsertPatientAnamnesis({
      patientId,
      therapistId,
      data: parsed.data,
    });

    if (result.status !== 200) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ anamnesis: result.anamnesis }, { status: 200 });
  } catch (err: unknown) {
    console.error("[PUT /api/patients/[id]/anamnesis] Erro:", err);
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
