import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createChunkSchema = z.object({
  text: z.string().trim().min(1),
  speaker: z.string().trim().min(1).optional(),
  t_start_seconds: z.number().nonnegative().optional(),
  t_end_seconds: z.number().nonnegative().optional(),
});

const deleteChunkSchema = z.object({
  chunk_id: z.string().min(1),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const { id } = await params;
    const sessionId = z.string().min(1).parse(id);
    const supabase = createSupabaseAdminClient();

    const result = await supabase
      .from("transcript_chunks")
      .select("id, session_id, text, speaker, t_start_seconds, t_end_seconds, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ chunks: result.data ?? [] }, { status: 200 });
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
    const sessionId = z.string().min(1).parse(id);
    const body = await req.json();
    const parsed = createChunkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();
    const insertResult = await supabase
      .from("transcript_chunks")
      .insert({
        session_id: sessionId,
        text: parsed.data.text,
        speaker: parsed.data.speaker ?? null,
        t_start_seconds: parsed.data.t_start_seconds ?? null,
        t_end_seconds: parsed.data.t_end_seconds ?? null,
      })
      .select(
        "id, session_id, text, speaker, t_start_seconds, t_end_seconds, created_at",
      )
      .single();

    if (insertResult.error) {
      return NextResponse.json(
        { error: insertResult.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ chunk: insertResult.data }, { status: 201 });
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
    const { id } = await params;
    const sessionId = z.string().min(1).parse(id);
    const body = await req.json();
    const parsed = deleteChunkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();
    const deleteResult = await supabase
      .from("transcript_chunks")
      .delete()
      .eq("id", parsed.data.chunk_id)
      .eq("session_id", sessionId)
      .select("id");

    if (deleteResult.error) {
      return NextResponse.json(
        { error: deleteResult.error.message },
        { status: 500 },
      );
    }

    if (!deleteResult.data || deleteResult.data.length === 0) {
      return NextResponse.json(
        { error: "Chunk not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
