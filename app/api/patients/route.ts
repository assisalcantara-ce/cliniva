import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getOrCreateTherapistId } from "@/lib/db/therapist";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
          })
        ),
      })
    )
    .optional(),
});

const createPatientSchema = z.object({
  full_name: z.string().trim().min(1),
  notes: z.string().trim().min(1).optional(),
  anamnesis: anamnesisSchema.optional(),
});

export async function GET(req: NextRequest) {
  try {
    const therapistId = await getOrCreateTherapistId({
      displayName: "Dra. Cristiane",
    });
    const supabase = createSupabaseAdminClient();

    const selectWithStatus = `
      id,
      full_name,
      notes,
      created_at,
      patient_number,
      is_active,
      patient_anamnesis (payload)
    `;
    const selectWithoutStatus = `
      id,
      full_name,
      notes,
      created_at,
      patient_number,
      patient_anamnesis (payload)
    `;

    let result: any = await supabase
      .from("patients")
      .select(selectWithStatus)
      .eq("therapist_id", therapistId)
      .order("created_at", { ascending: false });

    if (result.error && result.error.message.includes("is_active")) {
      result = await supabase
        .from("patients")
        .select(selectWithoutStatus)
        .eq("therapist_id", therapistId)
        .order("created_at", { ascending: false });
    }

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 },
      );
    }

    // Transform data to flatten payload and add is_active default
    const patients = (result.data ?? []).map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      notes: p.notes,
      created_at: p.created_at,
      patient_number: p.patient_number ?? null,
      is_active: p.is_active !== false ? true : false,
      payload: p.patient_anamnesis?.[0]?.payload || null,
    }));

    return NextResponse.json({ patients }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createPatientSchema.safeParse(body);
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

    // Get the next patient number for this therapist
    const { data: maxPatient, error: maxError } = await supabase
      .from("patients")
      .select("patient_number")
      .eq("therapist_id", therapistId)
      .order("patient_number", { ascending: false })
      .limit(1)
      .single();

    const nextPatientNumber = (maxPatient?.patient_number ?? 0) + 1;

    const insertResult = await supabase
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

    if (insertResult.error) {
      return NextResponse.json(
        { error: insertResult.error.message },
        { status: 500 },
      );
    }

    if (parsed.data.anamnesis) {
      const anamnesisResult = await supabase.from("patient_anamnesis").insert({
        patient_id: insertResult.data.id,
        therapist_id: therapistId,
        payload: parsed.data.anamnesis,
      });

      if (anamnesisResult.error) {
        return NextResponse.json(
          { error: anamnesisResult.error.message },
          { status: 500 },
        );
      }

      // Return patient with payload
      return NextResponse.json(
        {
          patient: {
            ...insertResult.data,
            payload: parsed.data.anamnesis,
          },
        },
        { status: 201 }
      );
    }

    return NextResponse.json({ patient: insertResult.data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
