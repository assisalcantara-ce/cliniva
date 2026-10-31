import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTherapistIdFromRequest, authError } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statusSchema = z.object({
  is_active: z.boolean(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let therapistId: string;
    try {
      therapistId = getTherapistIdFromRequest(req);
    } catch (err: unknown) {
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? String((err as { code?: unknown }).code)
          : "UNAUTHENTICATED";
      const { error, status } = authError(code);
      return NextResponse.json({ error }, { status });
    }

    const { id } = await params;
    const patientId = id;
    const body = await req.json();
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const supabase = createSupabaseAdminClient();

    const result = await supabase
      .from("patients")
      .update({ is_active: parsed.data.is_active })
      .eq("id", patientId)
      .eq("therapist_id", therapistId)
      .select("id, full_name, is_active")
      .maybeSingle();

    if (result.error) {
      if (result.error.message.includes("is_active")) {
        return NextResponse.json(
          { error: "Coluna is_active não existe. Execute a migração 005." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    if (!result.data) {
      return NextResponse.json(
        { error: "Paciente não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        patient: result.data,
        message: parsed.data.is_active
          ? "Paciente ativado com sucesso"
          : "Paciente inativado com sucesso",
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

