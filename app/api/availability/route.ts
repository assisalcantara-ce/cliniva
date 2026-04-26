import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getTherapistIdFromRequest } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ruleSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().optional(),
  is_active: z.boolean().optional(),
});

const payloadSchema = z.object({
  rules: z.array(ruleSchema).optional(),
});

function toMinutes(timeStr: string) {
  const [hh, mm] = timeStr.split(":");
  return Number(hh) * 60 + Number(mm);
}

export async function GET(req: NextRequest) {
  try {
    const therapistId = getTherapistIdFromRequest(req);
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("therapist_availability_rules")
      .select("id, day_of_week, start_time, end_time, timezone, is_active")
      .eq("therapist_id", therapistId)
      .order("day_of_week", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rules: data ?? [] }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = payloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const rules = parsed.data.rules ?? [];
    for (const rule of rules) {
      if (toMinutes(rule.end_time) <= toMinutes(rule.start_time)) {
        return NextResponse.json(
          { error: "Horario final deve ser maior que o inicial" },
          { status: 400 },
        );
      }
    }

    const therapistId = getTherapistIdFromRequest(req);
    const supabase = createSupabaseAdminClient();

    const deleteResult = await supabase
      .from("therapist_availability_rules")
      .delete()
      .eq("therapist_id", therapistId);

    if (deleteResult.error) {
      return NextResponse.json(
        { error: deleteResult.error.message },
        { status: 500 },
      );
    }

    if (rules.length) {
      const insertResult = await supabase
        .from("therapist_availability_rules")
        .insert(
          rules.map((rule) => ({
            therapist_id: therapistId,
            day_of_week: rule.day_of_week,
            start_time: rule.start_time,
            end_time: rule.end_time,
            timezone: rule.timezone ?? "America/Sao_Paulo",
            is_active: rule.is_active !== false,
          })),
        )
        .select("id, day_of_week, start_time, end_time, timezone, is_active");

      if (insertResult.error) {
        return NextResponse.json(
          { error: insertResult.error.message },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { rules: insertResult.data ?? [] },
        { status: 200 },
      );
    }

    return NextResponse.json({ rules: [] }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
