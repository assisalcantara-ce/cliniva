import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseAuthToken } from "@/lib/auth";
import { getOrCreateTherapistId } from "@/lib/db/therapist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ticketSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  category: z.enum(["bug", "feature", "billing", "general"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveUserId(supabase: ReturnType<typeof createSupabaseAdminClient>, user: { userId: string; email: string; name?: string }) {
  if (UUID_REGEX.test(user.userId)) {
    return user.userId;
  }

  const { data: existingUser, error: existingError } = await supabase
    .from("users")
    .select("id")
    .eq("email", user.email)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingUser?.id) {
    return existingUser.id as string;
  }

  const therapistId = await getOrCreateTherapistId({
    displayName: user.name ?? "Dra. Cristiane",
  });

  const { data: createdUser, error: createError } = await supabase
    .from("users")
    .insert({
      therapist_id: therapistId,
      email: user.email,
      password_hash: "mock",
      is_active: true,
    })
    .select("id")
    .single();

  if (createError) {
    throw new Error(createError.message);
  }

  return createdUser.id as string;
}

export async function GET(req: NextRequest) {
  try {
    const authToken = req.cookies.get("auth_token")?.value;
    if (!authToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = parseAuthToken(authToken);
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();
    if (!user.email) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const resolvedUserId = await resolveUserId(supabase, user);
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
    const authToken = req.cookies.get("auth_token")?.value;
    if (!authToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = parseAuthToken(authToken);
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ticketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();
    if (!user.email) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const resolvedUserId = await resolveUserId(supabase, user);
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
