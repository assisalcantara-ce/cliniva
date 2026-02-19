import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getOrCreateTherapistId } from "@/lib/db/therapist";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const personalSchema = z.object({
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
});

const updatePatientSchema = z.object({
  full_name: z.string().trim().min(1),
  notes: z.string().trim().nullable().optional(),
  personal: personalSchema.optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const { id } = await params;
    const patientId = z.string().min(1).parse(id);
    const body = await req.json();
    const parsed = updatePatientSchema.safeParse(body);

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

    const updateResult = await supabase
      .from("patients")
      .update({
        full_name: parsed.data.full_name,
        notes: parsed.data.notes ?? null,
      })
      .eq("id", patientId)
      .eq("therapist_id", therapistId)
      .select("id, full_name, notes, created_at")
      .single();

    if (updateResult.error) {
      return NextResponse.json(
        { error: updateResult.error.message },
        { status: 500 },
      );
    }

    if (parsed.data.personal) {
      const existing = await supabase
        .from("patient_anamnesis")
        .select("id, payload")
        .eq("patient_id", patientId)
        .eq("therapist_id", therapistId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (existing.error) {
        return NextResponse.json(
          { error: existing.error.message },
          { status: 500 },
        );
      }

      if (existing.data && existing.data.length > 0) {
        const currentPayload = existing.data[0].payload ?? {};
        const nextPayload = {
          ...currentPayload,
          personal: parsed.data.personal,
        };

        const updatePayload = await supabase
          .from("patient_anamnesis")
          .update({ payload: nextPayload })
          .eq("id", existing.data[0].id)
          .select("id")
          .single();

        if (updatePayload.error) {
          return NextResponse.json(
            { error: updatePayload.error.message },
            { status: 500 },
          );
        }
      } else {
        const insertPayload = await supabase.from("patient_anamnesis").insert({
          patient_id: patientId,
          therapist_id: therapistId,
          payload: { personal: parsed.data.personal },
        });

        if (insertPayload.error) {
          return NextResponse.json(
            { error: insertPayload.error.message },
            { status: 500 },
          );
        }
      }
    }

    return NextResponse.json({ patient: updateResult.data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
