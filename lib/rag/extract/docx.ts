import "server-only";

export async function extractTextFromDocx(params: {
  bytes: Uint8Array;
}): Promise<string> {
  type MammothLike = {
    extractRawText: (params: { buffer: Buffer }) => Promise<{ value?: unknown }>;
  };

  function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null;
  }

  let mammothUnknown: unknown;
  try {
    mammothUnknown = (await import("mammoth")) as unknown;
  } catch {
    throw new Error(
      "DOCX extraction dependency missing. Install: npm i mammoth",
    );
  }

  const mammothExport =
    isRecord(mammothUnknown) && "default" in mammothUnknown
      ? ((mammothUnknown as { default?: unknown }).default ?? mammothUnknown)
      : mammothUnknown;

  if (!isRecord(mammothExport) || typeof mammothExport.extractRawText !== "function") {
    throw new Error("DOCX extraction: invalid mammoth module shape");
  }

  const buffer = Buffer.from(params.bytes);
  const result = await (mammothExport as MammothLike).extractRawText({ buffer });
  const text = typeof result?.value === "string" ? result.value : "";
  return text.replace(/\s+$/g, "").trim();
}
