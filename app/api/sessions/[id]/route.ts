import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTherapistIdFromRequest, authError } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const result = await supabase
      .from("sessions")
      .select("id, patient_id, therapist_id, created_at, patients(full_name)")
      .eq("id", sessionId)
      .eq("therapist_id", therapistId)
      .maybeSingle();

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    if (!result.data) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }

    const patientName =
      typeof (result.data as { patients?: { full_name?: unknown } } | null)?.patients
        ?.full_name === "string"
        ? String(
            (result.data as { patients?: { full_name?: unknown } })?.patients?.full_name,
          )
        : null;

    return NextResponse.json(
      { session: result.data, patient_name: patientName },
      { status: 200 },
    );
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
    const supabase = createSupabaseAdminClient();

    // 1. Verifica se a sessão existe e pertence ao terapeuta
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

    // 2. Deleta cascata: transcript_chunks, session_insights, depois a sessão
    await supabase.from("transcript_chunks").delete().eq("session_id", sessionId);
    await supabase.from("session_insights").delete().eq("session_id", sessionId);

    const result = await supabase
      .from("sessions")
      .delete()
      .eq("id", sessionId)
      .eq("therapist_id", therapistId);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

