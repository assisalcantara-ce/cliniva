import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPatientMemory } from "@/lib/db/patientMemory";
import { getTherapistIdFromRequest, authError } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Valida se a sessão existe e pertence ao terapeuta autenticado.
 */
async function getOwnedSession(sessionId: string, therapistId: string) {
  const supabase = createSupabaseAdminClient();
  const sessionQuery = await supabase
    .from("sessions")
    .select("id, patient_id, therapist_id")
    .eq("id", sessionId)
    .eq("therapist_id", therapistId)
    .maybeSingle();

  if (sessionQuery.error) {
    throw new Error(`Erro ao verificar sessão: ${sessionQuery.error.message}`);
  }

  return sessionQuery.data;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
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

    const { id } = await params;
    const sessionId = z.string().min(1).parse(id);

    const session = await getOwnedSession(sessionId, therapistId);
    if (!session) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }

    const supabase = createSupabaseAdminClient();

    const result = await supabase
      .from("session_insights")
      .select("id, session_id, kind, title, content_json, evidence_json, created_at")
      .eq("session_id", sessionId)
      .is("archived_at", null)
      .order("created_at", { ascending: true });

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    // Busca memória clínica usando o patient_id verificado
    let patientMemory: string | null = null;
    try {
      const patientId = typeof session.patient_id === "string" ? session.patient_id : null;
      if (patientId) {
        const memRow = await getPatientMemory({ patientId, therapistId });
        patientMemory = memRow?.summary ?? null;
      }
    } catch {
      // não-crítico: continua sem memória
    }

    return NextResponse.json({ insights: result.data ?? [], patientMemory }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
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

    const { id } = await params;
    const sessionId = z.string().min(1).parse(id);

    const session = await getOwnedSession(sessionId, therapistId);
    if (!session) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }

    const supabase = createSupabaseAdminClient();

    const result = await supabase
      .from("session_insights")
      .update({ archived_at: new Date().toISOString() })
      .eq("session_id", sessionId)
      .is("archived_at", null);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

