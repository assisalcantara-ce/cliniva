import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateSchema = z.object({
  status: z.enum(["requested", "confirmed", "cancelled"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const { id } = await params;
    const appointmentId = z.string().uuid().parse(id);
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updatePayload: {
      status: string;
      confirmed_at?: string | null;
      cancelled_at?: string | null;
    } = { status: parsed.data.status };

    if (parsed.data.status === "confirmed") {
      updatePayload.confirmed_at = new Date().toISOString();
      updatePayload.cancelled_at = null;
    }

    if (parsed.data.status === "cancelled") {
      updatePayload.cancelled_at = new Date().toISOString();
    }

    if (parsed.data.status === "requested") {
      updatePayload.confirmed_at = null;
      updatePayload.cancelled_at = null;
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("appointments")
      .update(updatePayload)
      .eq("id", appointmentId)
      .select(
        "id, patient_id, therapist_id, status, source, scheduled_start, scheduled_end, notes, created_at",
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ appointment: data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
