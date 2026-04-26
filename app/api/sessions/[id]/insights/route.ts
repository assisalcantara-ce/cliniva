import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPatientMemory } from "@/lib/db/patientMemory";
import { getTherapistIdFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const { id } = await params;
    const sessionId = z.string().min(1).parse(id);
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

    // Busca patient_id da sessão para carregar memória clínica
    let patientMemory: string | null = null;
    try {
      const sessionResult = await supabase
        .from("sessions")
        .select("patient_id")
        .eq("id", sessionId)
        .maybeSingle();

      const patientId =
        typeof sessionResult.data?.patient_id === "string"
          ? sessionResult.data.patient_id
          : null;

      if (patientId) {
        const therapistId = getTherapistIdFromRequest(req);
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
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const { id } = await params;
    const sessionId = z.string().min(1).parse(id);
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
