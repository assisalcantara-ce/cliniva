import "server-only";

export async function extractTextFromPdf(params: {
  bytes: Uint8Array;
}): Promise<string> {
  type PdfParseResult = { text?: unknown };
  type PdfParseFn = (buffer: Buffer) => Promise<PdfParseResult>;

  function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null;
  }

  let modUnknown: unknown;
  try {
    modUnknown = (await import("pdf-parse")) as unknown;
  } catch {
    throw new Error(
      "PDF extraction dependency missing. Install: npm i pdf-parse",
    );
  }

  const exported =
    isRecord(modUnknown) && "default" in modUnknown
      ? ((modUnknown as { default?: unknown }).default ?? modUnknown)
      : modUnknown;

  if (typeof exported !== "function") {
    throw new Error("PDF extraction: invalid pdf-parse module export");
  }

  const pdfParse = exported as PdfParseFn;

  const buffer = Buffer.from(params.bytes);
  const result = await pdfParse(buffer);
  const text = typeof result?.text === "string" ? result.text : "";
  return text.replace(/\s+$/g, "").trim();
}
