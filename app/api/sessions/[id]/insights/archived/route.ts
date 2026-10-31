import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTherapistIdFromRequest, authError } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/sessions/[id]/insights/archived
 * Retorna os insights arquivados (atendimentos encerrados) de uma sessão.
 */
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
    const supabase = createSupabaseAdminClient();

    // Valida se a sessão pertence ao terapeuta
    const sessionCheck = await supabase
      .from("sessions")
      .select("id, therapist_id")
      .eq("id", sessionId)
      .eq("therapist_id", therapistId)
      .maybeSingle();

    if (sessionCheck.error) {
      return NextResponse.json({ error: sessionCheck.error.message }, { status: 500 });
    }

    if (!sessionCheck.data) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }

    const result = await supabase
      .from("session_insights")
      .select("id, session_id, kind, title, content_json, evidence_json, created_at, archived_at")
      .eq("session_id", sessionId)
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false });

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ insights: result.data ?? [] }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

