import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  generateSlots,
  type AppointmentRow,
  type AvailabilityBlock,
  type AvailabilityRule,
} from "@/lib/db/appointments";
import { getTherapistIdFromRequest } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const startDate = dateSchema.parse(url.searchParams.get("start_date"));
    const endDate = dateSchema.parse(url.searchParams.get("end_date"));

    const therapistId = getTherapistIdFromRequest(req);
    const supabase = createSupabaseAdminClient();

    const { data: rules, error: rulesError } = await supabase
      .from("therapist_availability_rules")
      .select("day_of_week, start_time, end_time, timezone, is_active")
      .eq("therapist_id", therapistId);

    if (rulesError) {
      return NextResponse.json({ error: rulesError.message }, { status: 500 });
    }

    const { data: blocks, error: blocksError } = await supabase
      .from("therapist_availability_blocks")
      .select("id, starts_at, ends_at")
      .eq("therapist_id", therapistId)
      .gte("ends_at", `${startDate}T00:00:00-03:00`)
      .lte("starts_at", `${endDate}T23:59:59-03:00`);

    if (blocksError) {
      return NextResponse.json({ error: blocksError.message }, { status: 500 });
    }

    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select("id, scheduled_start, scheduled_end, status")
      .eq("therapist_id", therapistId)
      .gte("scheduled_start", `${startDate}T00:00:00-03:00`)
      .lte("scheduled_start", `${endDate}T23:59:59-03:00`);

    if (appointmentsError) {
      return NextResponse.json(
        { error: appointmentsError.message },
        { status: 500 },
      );
    }

    const slots = generateSlots({
      startDate,
      endDate,
      rules: (rules ?? []) as AvailabilityRule[],
      blocks: (blocks ?? []) as AvailabilityBlock[],
      appointments: (appointments ?? []) as AppointmentRow[],
    });

    return NextResponse.json({ slots }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
