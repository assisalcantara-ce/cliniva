import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getTherapistIdFromRequest } from "@/lib/auth";
import { decryptOpenAiKey } from "@/lib/ai/openaiKey";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { indexMaterial } from "@/lib/rag/indexMaterial";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  title: z.string().trim().min(1).optional(),
  text: z.string().trim().min(1).optional(),
});

/** GET /api/materials/[id] — retorna material + texto reconstruído dos chunks */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const { id } = await params;
    const materialId = z.string().uuid().parse(id);
    const therapistId = getTherapistIdFromRequest(req);
    const supabase = createSupabaseAdminClient();

    const { data: material, error } = await supabase
      .from("materials")
      .select("id, title, source, filename, storage_path, created_at")
      .eq("id", materialId)
      .eq("therapist_id", therapistId)
      .single();

    if (error || !material) {
      return NextResponse.json({ error: "Material não encontrado" }, { status: 404 });
    }

    // Reconstruir texto dos chunks (apenas para materiais "manual")
    let text: string | null = null;
    if ((material as { source: string }).source === "manual") {
      const { data: chunks } = await supabase
        .from("material_chunks")
        .select("chunk_index, chunk_text")
        .eq("material_id", materialId)
        .order("chunk_index", { ascending: true });

      if (chunks && chunks.length > 0) {
        text = (chunks as { chunk_text: string }[]).map((c) => c.chunk_text).join("\n\n");
      }
    }

    return NextResponse.json({ material, text }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** PATCH /api/materials/[id] — atualiza título e/ou reindexa texto */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const { id } = await params;
    const materialId = z.string().uuid().parse(id);
    const therapistId = getTherapistIdFromRequest(req);

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload inválido", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();

    // Verificar propriedade
    const { data: existing, error: findErr } = await supabase
      .from("materials")
      .select("id, source")
      .eq("id", materialId)
      .eq("therapist_id", therapistId)
      .single();

    if (findErr || !existing) {
      return NextResponse.json({ error: "Material não encontrado" }, { status: 404 });
    }

    // Atualizar título se fornecido
    if (parsed.data.title) {
      const { error: updateErr } = await supabase
        .from("materials")
        .update({ title: parsed.data.title })
        .eq("id", materialId);

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
    }

    // Reindexar texto se fornecido (somente "manual")
    if (parsed.data.text) {
      if ((existing as { source: string }).source !== "manual") {
        return NextResponse.json(
          { error: "Edição de texto disponível apenas para materiais manuais" },
          { status: 400 },
        );
      }

      // Buscar chave OpenAI do therapist
      const { data: therapist } = await supabase
        .from("therapists")
        .select("openai_api_key_encrypted, openai_api_key")
        .eq("id", therapistId)
        .single();

      const encKey = (therapist as { openai_api_key_encrypted?: string | null; openai_api_key?: string | null } | null)?.openai_api_key_encrypted;
      const legKey = (therapist as { openai_api_key_encrypted?: string | null; openai_api_key?: string | null } | null)?.openai_api_key;

      let openaiApiKey: string | undefined;
      if (encKey) openaiApiKey = decryptOpenAiKey(encKey);
      else if (legKey) openaiApiKey = legKey;
      else if (process.env.OPENAI_API_KEY) openaiApiKey = process.env.OPENAI_API_KEY;
      else {
        return NextResponse.json(
          { error: "Chave OpenAI não configurada. Acesse Configurações → IA para adicioná-la." },
          { status: 422 },
        );
      }

      // Remover chunks antigos
      await supabase.from("material_chunks").delete().eq("material_id", materialId);

      // Reindexar com novo texto
      const filename = `${parsed.data.title ?? "material"}.txt`;
      await indexMaterial({
        materialId,
        rawText: parsed.data.text,
        filename,
        source: "manual",
        apiKey: openaiApiKey,
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
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

/** DELETE /api/materials/[id] */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const { id } = await params;
    const materialId = z.string().uuid().parse(id);
    const therapistId = getTherapistIdFromRequest(req);
    const supabase = createSupabaseAdminClient();

    const { error } = await supabase
      .from("materials")
      .delete()
      .eq("id", materialId)
      .eq("therapist_id", therapistId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
