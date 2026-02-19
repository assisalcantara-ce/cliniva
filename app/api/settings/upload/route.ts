import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string;

    if (!file || !type) {
      return NextResponse.json(
        { error: "File and type are required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${type}/${timestamp}-${file.name}`;
    const bucket = process.env.SUPABASE_SETTINGS_BUCKET || "therapy-files";

    console.info("[settings/upload] bucket:", bucket);
    console.info("[settings/upload] supabase url:", process.env.NEXT_PUBLIC_SUPABASE_URL);

    // Convert file to buffer
    const buffer = await file.arrayBuffer();

    // Upload to Supabase Storage
    const uploadResult = await supabase.storage
      .from(bucket)
      .upload(fileName, buffer, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadResult.error) {
      console.error("Upload error:", uploadResult.error);
      const message = uploadResult.error.message || "Upload failed";
      const isBucketNotFound = /bucket not found|NoSuchBucket/i.test(message);
      if (isBucketNotFound) {
        return NextResponse.json(
          { error: `Bucket not found: ${bucket}` },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return NextResponse.json(
      { url: publicUrlData.publicUrl },
      { status: 200 }
    );
  } catch (error) {
    console.error("Upload handler error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
