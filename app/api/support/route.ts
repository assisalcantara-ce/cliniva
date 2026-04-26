import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTherapistIdFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ticketSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  category: z.enum(["bug", "feature", "billing", "general"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
});

async function resolveUserId(supabase: ReturnType<typeof createSupabaseAdminClient>, therapistId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("therapist_id", therapistId)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("Usuário não encontrado");
  return data.id as string;
}

export async function GET(req: NextRequest) {
  try {
    const therapistId = getTherapistIdFromRequest(req);
    const supabase = createSupabaseAdminClient();
    const resolvedUserId = await resolveUserId(supabase, therapistId);
    const { data, error } = await supabase
      .from("support_tickets")
      .select("id, title, description, category, priority, status, created_at")
      .eq("user_id", resolvedUserId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const tickets = (data ?? []).map((ticket) => ({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      createdAt: ticket.created_at,
    }));

    return NextResponse.json({ tickets }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const therapistId = getTherapistIdFromRequest(req);

    const body = await req.json();
    const parsed = ticketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();
    const resolvedUserId = await resolveUserId(supabase, therapistId);
    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        user_id: resolvedUserId,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        priority: parsed.data.priority,
        status: "open",
      })
      .select("id, title, description, category, priority, status, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const ticket = {
      id: data.id,
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      status: data.status,
      createdAt: data.created_at,
    };

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
