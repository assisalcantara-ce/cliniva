import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const { id } = await params;
    const sessionId = z.string().min(1).parse(id);
    const supabase = createSupabaseAdminClient();

    const result = await supabase
      .from("sessions")
      .select("id, patient_id, created_at, patients(full_name)")
      .eq("id", sessionId)
      .single();

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
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
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const { id } = await params;
    const sessionId = z.string().min(1).parse(id);
    const supabase = createSupabaseAdminClient();

    // Deleta cascata: transcript_chunks, session_insights, depois a sessão
    await supabase.from("transcript_chunks").delete().eq("session_id", sessionId);
    await supabase.from("session_insights").delete().eq("session_id", sessionId);

    const result = await supabase.from("sessions").delete().eq("id", sessionId);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
