import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { indexMaterial } from "@/lib/rag/indexMaterial";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createMaterialSchema = z.object({
  title: z.string().trim().min(1),
  text: z.string().trim().min(1),
  source: z.literal("manual"),
});

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const result = await supabase
      .from("materials")
      .select("id, title, source, filename, storage_path, created_at")
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

    const supabase = createSupabaseAdminClient();
    const filename = `${parsed.data.title}.txt`;

    const materialInsert = await supabase
      .from("materials")
      .insert({
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
      { error: "Falha ao criar material. Tente novamente." },
      { status },
    );
  }
}
