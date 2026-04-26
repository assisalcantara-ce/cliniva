import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getTherapistIdFromRequest } from "@/lib/auth";
import { decryptOpenAiKey } from "@/lib/ai/openaiKey";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { indexMaterial } from "@/lib/rag/indexMaterial";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createMaterialSchema = z.object({
  title: z.string().trim().min(1),
  text: z.string().trim().min(1),
  source: z.literal("manual"),
});

export async function GET(req: NextRequest) {
  try {
    const therapistId = getTherapistIdFromRequest(req);
    const supabase = createSupabaseAdminClient();
    const result = await supabase
      .from("materials")
      .select("id, title, source, filename, storage_path, created_at")
      .eq("therapist_id", therapistId)
      .order("created_at", { ascending: false });

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
    return NextResponse.json({ materials: result.data ?? [] }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createMaterialSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const therapistId = getTherapistIdFromRequest(req);
    const supabase = createSupabaseAdminClient();
    const filename = `${parsed.data.title}.txt`;

    // Buscar chave OpenAI do therapist
    const { data: therapist } = await supabase
      .from("therapists")
      .select("openai_api_key_encrypted, openai_api_key")
      .eq("id", therapistId)
      .single();

    const encryptedKey = (therapist as { openai_api_key_encrypted?: string | null; openai_api_key?: string | null } | null)?.openai_api_key_encrypted;
    const legacyKey = (therapist as { openai_api_key_encrypted?: string | null; openai_api_key?: string | null } | null)?.openai_api_key;

    let openaiApiKey: string | undefined;
    if (encryptedKey) {
      openaiApiKey = decryptOpenAiKey(encryptedKey);
    } else if (legacyKey) {
      openaiApiKey = legacyKey;
    } else if (process.env.OPENAI_API_KEY) {
      openaiApiKey = process.env.OPENAI_API_KEY;
    } else {
      return NextResponse.json(
        { error: "Chave OpenAI não configurada. Acesse Configurações → IA para adicioná-la." },
        { status: 422 },
      );
    }

    const materialInsert = await supabase
      .from("materials")
      .insert({
        therapist_id: therapistId,
        title: parsed.data.title,
        source: parsed.data.source,
        filename,
        storage_path: "manual:pending",
      })
      .select("id, title, source, filename, storage_path, created_at")
      .single();

    if (materialInsert.error) {
      return NextResponse.json(
        { error: materialInsert.error.message },
        { status: 500 },
      );
    }

    const material = materialInsert.data as { id: string };
    const storagePath = `manual:${material.id}`;

    await supabase
      .from("materials")
      .update({ storage_path: storagePath })
      .eq("id", material.id);

    const indexed = await indexMaterial({
      materialId: material.id,
      rawText: parsed.data.text,
      filename,
      source: "manual",
      apiKey: openaiApiKey,
    });

    return NextResponse.json(
      {
        material: materialInsert.data,
        chunks_created: indexed.chunksCreated,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const code = (error as { code?: string }).code;
    if (code === "UNAUTHENTICATED" || code === "INVALID_TOKEN") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (message.includes("429")) {
      return NextResponse.json(
        { error: "Cota da OpenAI esgotada. Acesse platform.openai.com → Billing para adicionar créditos." },
        { status: 502 },
      );
    }
    const status = message.startsWith("OpenAI:") ? 502 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
