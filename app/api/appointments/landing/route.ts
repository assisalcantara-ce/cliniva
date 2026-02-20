import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { buildSlotRange, validateSlotWithinRules, type AvailabilityRule } from "@/lib/db/appointments";
import { getOrCreateTherapistId } from "@/lib/db/therapist";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);

const anamnesisSchema = z.object({
  personal: z
    .object({
      age: z.string().trim().optional(),
      birth_date: z.string().trim().min(1, "Data de nascimento é obrigatória"),
      marital_status: z.string().trim().optional(),
      cpf: z.string().trim().optional(),
      email: z.string().trim().optional(),
      celular: z.string().trim().min(1, "Celular é obrigatório"),
      profession: z.string().trim().optional(),
      education: z.string().trim().optional(),
      living_with: z.string().trim().optional(),
      has_children: z.string().trim().optional(),
      children_count: z.string().trim().optional(),
      children_ages: z.string().trim().optional(),
    })
    .optional(),
  groups: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        title: z.string().trim().min(1),
        answers: z.array(
          z.object({
            question: z.string().trim().min(1),
            answer: z.string().trim().optional(),
          }),
        ),
      }),
    )
    .optional(),
});

const landingSchema = z.object({
  full_name: z.string().trim().min(1),
  notes: z.string().trim().optional(),
  anamnesis: anamnesisSchema.optional(),
  date: dateSchema,
  time: timeSchema,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = landingSchema.safeParse(body);

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
      .select("id")
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

    const { data: maxPatient } = await supabase
      .from("patients")
      .select("patient_number")
      .eq("therapist_id", therapistId)
      .order("patient_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextPatientNumber = (maxPatient?.patient_number ?? 0) + 1;

    const insertPatient = await supabase
      .from("patients")
      .insert({
        therapist_id: therapistId,
        full_name: parsed.data.full_name,
        notes: parsed.data.notes ?? null,
        patient_number: nextPatientNumber,
        is_active: true,
      })
      .select("id, full_name, notes, created_at, patient_number, is_active")
      .single();

    if (insertPatient.error) {
      return NextResponse.json(
        { error: insertPatient.error.message },
        { status: 500 },
      );
    }

    if (parsed.data.anamnesis) {
      const anamnesisResult = await supabase.from("patient_anamnesis").insert({
        patient_id: insertPatient.data.id,
        therapist_id: therapistId,
        payload: parsed.data.anamnesis,
      });

      if (anamnesisResult.error) {
        return NextResponse.json(
          { error: anamnesisResult.error.message },
          { status: 500 },
        );
      }
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .insert({
        therapist_id: therapistId,
        patient_id: insertPatient.data.id,
        status: "requested",
        source: "landing",
        scheduled_start: start.toISOString(),
        scheduled_end: end.toISOString(),
      })
      .select(
        "id, patient_id, therapist_id, status, source, scheduled_start, scheduled_end, created_at",
      )
      .single();

    if (appointmentError) {
      return NextResponse.json({ error: appointmentError.message }, { status: 500 });
    }

    return NextResponse.json(
      { patient: insertPatient.data, appointment },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
