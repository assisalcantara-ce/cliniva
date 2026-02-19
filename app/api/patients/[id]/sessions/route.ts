import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getOrCreateTherapistId } from "@/lib/db/therapist";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSessionSchema = z.object({
  consented: z.boolean(),
  consent_text: z.string().trim().min(1).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const { id } = await params;
    const patientId = z.string().min(1).parse(id);
    const therapistId = await getOrCreateTherapistId({
      displayName: "Dra. Cristiane",
    });
    const supabase = createSupabaseAdminClient();

    const result = await supabase
      .from("sessions")
      .select("id, patient_id, therapist_id, consented, consent_text, created_at")
      .eq("therapist_id", therapistId)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ sessions: result.data ?? [] }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const { id } = await params;
    const patientId = z.string().min(1).parse(id);
    const body = await req.json();
    const parsed = createSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const therapistId = await getOrCreateTherapistId({
      displayName: "Dra. Cristiane",
    });
    const supabase = createSupabaseAdminClient();

    const insertResult = await supabase
      .from("sessions")
      .insert({
        therapist_id: therapistId,
        patient_id: patientId,
        consented: parsed.data.consented,
        consent_text: parsed.data.consent_text ?? null,
      })
      .select("id, patient_id, therapist_id, consented, consent_text, created_at")
      .single();

    if (insertResult.error) {
      return NextResponse.json(
        { error: insertResult.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ session: insertResult.data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
