import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  buildSlotRange,
  validateSlotWithinRules,
  type AppointmentRow,
  type AvailabilityBlock,
  type AvailabilityRule,
} from "@/lib/db/appointments";
import { getOrCreateTherapistId } from "@/lib/db/therapist";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);

const createSchema = z.object({
  patient_id: z.string().uuid(),
  date: dateSchema,
  time: timeSchema,
  notes: z.string().trim().optional(),
  source: z.enum(["app", "landing"]).optional(),
});

export async function GET() {
  try {
    const therapistId = await getOrCreateTherapistId({
      displayName: "Dra. Cristiane",
    });
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("appointments")
      .select(
        "id, patient_id, therapist_id, status, source, scheduled_start, scheduled_end, notes, created_at, patients(full_name)",
      )
      .eq("therapist_id", therapistId)
      .order("scheduled_start", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const appointments = (data ?? []).map((row) => ({
      ...row,
      patient_name:
        typeof (row as { patients?: { full_name?: unknown } })?.patients
          ?.full_name === "string"
          ? String((row as { patients?: { full_name?: unknown } }).patients?.full_name)
          : null,
    }));

    return NextResponse.json({ appointments }, { status: 200 });
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

    const therapistId = await getOrCreateTherapistId({
      displayName: "Dra. Cristiane",
    });
    const supabase = createSupabaseAdminClient();

    const { data: rules, error: rulesError } = await supabase
      .from("therapist_availability_rules")
      .select("day_of_week, start_time, end_time, timezone, is_active")
      .eq("therapist_id", therapistId);

    if (rulesError) {
      return NextResponse.json({ error: rulesError.message }, { status: 500 });
    }

    const withinRules = validateSlotWithinRules({
      date: parsed.data.date,
      time: parsed.data.time,
      rules: (rules ?? []) as AvailabilityRule[],
    });

    if (!withinRules) {
      return NextResponse.json(
        { error: "Horario fora da disponibilidade" },
        { status: 400 },
      );
    }

    const { start, end } = buildSlotRange({
      date: parsed.data.date,
      time: parsed.data.time,
      timezone: "America/Sao_Paulo",
    });

    const { data: blocks, error: blocksError } = await supabase
      .from("therapist_availability_blocks")
      .select("id, starts_at, ends_at")
      .eq("therapist_id", therapistId)
      .lte("starts_at", end.toISOString())
      .gte("ends_at", start.toISOString());

    if (blocksError) {
      return NextResponse.json({ error: blocksError.message }, { status: 500 });
    }

    if ((blocks ?? []).length) {
      return NextResponse.json(
        { error: "Horario indisponivel" },
        { status: 400 },
      );
    }

    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select("id, scheduled_start, scheduled_end, status")
      .eq("therapist_id", therapistId)
      .gte("scheduled_start", start.toISOString())
      .lte("scheduled_start", end.toISOString());

    if (appointmentsError) {
      return NextResponse.json(
        { error: appointmentsError.message },
        { status: 500 },
      );
    }

    const hasConflict = (appointments ?? []).some((appt) => {
      if (appt.status === "cancelled") return false;
      const apptStart = new Date(appt.scheduled_start);
      const apptEnd = new Date(appt.scheduled_end);
      return start < apptEnd && end > apptStart;
    });

    if (hasConflict) {
      return NextResponse.json(
        { error: "Horario ja reservado" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("appointments")
      .insert({
        therapist_id: therapistId,
        patient_id: parsed.data.patient_id,
        status: "requested",
        source: parsed.data.source ?? "app",
        scheduled_start: start.toISOString(),
        scheduled_end: end.toISOString(),
        notes: parsed.data.notes ?? null,
      })
      .select(
        "id, patient_id, therapist_id, status, source, scheduled_start, scheduled_end, notes, created_at",
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ appointment: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
