import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTherapistIdFromRequest } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { encryptOpenAiKey } from "@/lib/ai/openaiKey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const settingsSchema = z.object({
  organization_name: z.string().trim().min(1),
  cnpj: z.string().trim().optional(),
  organization_phone: z.string().trim().optional(),
  organization_email: z.string().trim().optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  zip_code: z.string().trim().optional(),
  website: z.string().trim().optional(),
  logo_url: z.string().trim().optional(),
  display_name: z.string().trim().min(1),
  crp: z.string().trim().optional(),
  therapist_email: z.string().trim().optional(),
  therapist_phone: z.string().trim().optional(),
  therapist_address: z.string().trim().optional(),
  therapist_city: z.string().trim().optional(),
  therapist_state: z.string().trim().optional(),
  therapist_zip_code: z.string().trim().optional(),
  bio: z.string().trim().optional(),
  photo_url: z.string().trim().optional(),
  openai_api_key: z.string().trim().optional(),
  remove_openai_key: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const therapistId = getTherapistIdFromRequest(req);
    const supabase = createSupabaseAdminClient();

    const therapistResult = await supabase
      .from("therapists")
      .select("*")
      .eq("id", therapistId)
      .single();

    if (therapistResult.error) {
      return NextResponse.json(
        { error: "Therapist not found" },
        { status: 404 }
      );
    }

    const therapist = therapistResult.data as {
      display_name?: string | null;
      openai_api_key?: string | null;
      openai_api_key_encrypted?: string | null;
      openai_api_key_last4?: string | null;
      openai_key_added_at?: string | null;
    };

    // Mock settings - in production this would fetch from actual tables
    const settings = {
      organization_name: therapist.display_name || "",
      cnpj: "",
      organization_phone: "",
      organization_email: "",
      address: "",
      city: "",
      state: "",
      zip_code: "",
      website: "",
      logo_url: "",
      display_name: therapist.display_name || "",
      crp: "",
      therapist_email: "",
      therapist_phone: "",
      therapist_address: "",
      therapist_city: "",
      therapist_state: "",
      therapist_zip_code: "",
      bio: "",
      photo_url: "",
    };

    const openaiKey = therapist.openai_api_key_encrypted ?? therapist.openai_api_key ?? "";
    const ai = {
      has_key: Boolean(openaiKey),
      has_groq: Boolean(process.env.GROQ_API_KEY),
      key_last4: therapist.openai_api_key_last4 ?? (openaiKey ? openaiKey.slice(-4) : ""),
      key_added_at: therapist.openai_key_added_at ?? undefined,
    };

    return NextResponse.json({ settings, ai }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = settingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const therapistId = getTherapistIdFromRequest(req);
    const supabase = createSupabaseAdminClient();

    // Update therapist record
    const therapistUpdate: Record<string, unknown> = {
      display_name: parsed.data.display_name,
    };
    if (parsed.data.openai_api_key && parsed.data.openai_api_key.trim().length) {
      const rawKey = parsed.data.openai_api_key.trim();
      therapistUpdate.openai_api_key_encrypted = encryptOpenAiKey(rawKey);
      therapistUpdate.openai_api_key_last4 = rawKey.slice(-4);
      therapistUpdate.openai_key_added_at = new Date().toISOString();
      therapistUpdate.openai_api_key = null;
    }
    if (parsed.data.remove_openai_key) {
      therapistUpdate.openai_api_key_encrypted = null;
      therapistUpdate.openai_api_key_last4 = null;
      therapistUpdate.openai_key_added_at = null;
      therapistUpdate.openai_api_key = null;
    }

    const updateResult = await supabase
      .from("therapists")
      .update(therapistUpdate)
      .eq("id", therapistId)
      .select()
      .single();

    if (updateResult.error) {
      return NextResponse.json(
        { error: updateResult.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Settings saved successfully", settings: parsed.data },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
