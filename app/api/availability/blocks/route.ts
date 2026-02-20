import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getOrCreateTherapistId } from "@/lib/db/therapist";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  reason: z.string().trim().optional(),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(req: NextRequest) {
  try {
    const therapistId = await getOrCreateTherapistId({
      displayName: "Dra. Cristiane",
    });
    const supabase = createSupabaseAdminClient();

    const url = new URL(req.url);
    const start = url.searchParams.get("start");
    const end = url.searchParams.get("end");

    let query = supabase
      .from("therapist_availability_blocks")
      .select("id, starts_at, ends_at, reason")
      .eq("therapist_id", therapistId)
      .order("starts_at", { ascending: true });

    if (start) query = query.gte("ends_at", start);
    if (end) query = query.lte("starts_at", end);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ blocks: data ?? [] }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (new Date(parsed.data.ends_at) <= new Date(parsed.data.starts_at)) {
      return NextResponse.json(
        { error: "Horario final deve ser maior que o inicial" },
        { status: 400 },
      );
    }

    const therapistId = await getOrCreateTherapistId({
      displayName: "Dra. Cristiane",
    });
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("therapist_availability_blocks")
      .insert({
        therapist_id: therapistId,
        starts_at: parsed.data.starts_at,
        ends_at: parsed.data.ends_at,
        reason: parsed.data.reason ?? null,
      })
      .select("id, starts_at, ends_at, reason")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ block: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = deleteSchema.safeParse(body);

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

    const { error } = await supabase
      .from("therapist_availability_blocks")
      .delete()
      .eq("id", parsed.data.id)
      .eq("therapist_id", therapistId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
