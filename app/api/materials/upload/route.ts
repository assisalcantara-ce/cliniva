import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getTherapistIdFromRequest } from "@/lib/auth";
import { decryptOpenAiKey } from "@/lib/ai/openaiKey";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { indexMaterial } from "@/lib/rag/indexMaterial";
import { extractTextFromPdf } from "@/lib/rag/extract/pdf";
import { extractTextFromDocx } from "@/lib/rag/extract/docx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024;
const allowedTypes = new Set<string>([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const formSchema = z.object({
  title: z.string().trim().min(1).optional(),
});

function safeBaseTitle(filename: string): string {
  const withoutPath = filename.split(/[/\\]/).pop() ?? filename;
  const noExt = withoutPath.replace(/\.[^.]+$/, "");
  return noExt.trim() || "Material";
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const titleRaw = form.get("title");
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo ausente." }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Arquivo muito grande (max 15MB)." },
        { status: 400 },
      );
    }

    if (!allowedTypes.has(file.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo não suportado (apenas PDF e DOCX)." },
        { status: 400 },
      );
    }

    const parsed = formSchema.safeParse({
      title: typeof titleRaw === "string" ? titleRaw : undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();
    const therapistId = getTherapistIdFromRequest(req);

    // Buscar chave OpenAI do therapist
    const { data: therapist } = await supabase
      .from("therapists")
      .select("openai_api_key_encrypted, openai_api_key")
      .eq("id", therapistId)
      .single();

    const encKey = (therapist as { openai_api_key_encrypted?: string | null; openai_api_key?: string | null } | null)?.openai_api_key_encrypted;
    const legKey = (therapist as { openai_api_key_encrypted?: string | null; openai_api_key?: string | null } | null)?.openai_api_key;

    let openaiApiKey: string | undefined;
    if (encKey) {
      openaiApiKey = decryptOpenAiKey(encKey);
    } else if (legKey) {
      openaiApiKey = legKey;
    } else if (process.env.OPENAI_API_KEY) {
      openaiApiKey = process.env.OPENAI_API_KEY;
    } else {
      return NextResponse.json(
        { error: "Chave OpenAI não configurada. Acesse Configurações → IA para adicioná-la." },
        { status: 422 },
      );
    }

    const filename = file.name;
    const title = parsed.data.title ?? safeBaseTitle(filename);

    const materialInsert = await supabase
      .from("materials")
      .insert({
        therapist_id: therapistId,
        title,
        source: "upload",
        filename,
        mime_type: file.type,
        storage_path: "pending",
      })
      .select("id, title, source, filename, mime_type, storage_path, created_at")
      .single();

    if (materialInsert.error) {
      return NextResponse.json(
        { error: materialInsert.error.message },
        { status: 500 },
      );
    }

    const materialId = z
      .string()
      .min(1)
      .parse((materialInsert.data as { id: unknown }).id);
    const storagePath = `materials/${materialId}/${filename}`;

    const fileBytes = new Uint8Array(await file.arrayBuffer());

    const uploadResult = await supabase.storage
      .from("materials")
      .upload(storagePath, fileBytes, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadResult.error) {
      return NextResponse.json(
        { error: `Falha ao salvar no Storage: ${uploadResult.error.message}` },
        { status: 500 },
      );
    }

    await supabase
      .from("materials")
      .update({ storage_path: storagePath })
      .eq("id", materialId);

    let extractedText = "";
    if (file.type === "application/pdf") {
      extractedText = await extractTextFromPdf({ bytes: fileBytes });
    } else {
      extractedText = await extractTextFromDocx({ bytes: fileBytes });
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: "Não foi possível extrair texto do arquivo." },
        { status: 400 },
      );
    }

    const indexed = await indexMaterial({
      materialId,
      rawText: extractedText,
      filename,
      source: "upload",
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
