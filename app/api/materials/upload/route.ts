import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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

    const filename = file.name;
    const title = parsed.data.title ?? safeBaseTitle(filename);

    const materialInsert = await supabase
      .from("materials")
      .insert({
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
    const status = message.startsWith("OpenAI:") ? 502 : 500;
    return NextResponse.json(
      { error: "Falha ao enviar/indexar material. Tente novamente." },
      { status },
    );
  }
}
