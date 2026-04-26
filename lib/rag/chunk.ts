import "server-only";

export type TextChunk = {
  index: number;
  text: string;
  start: number;
  end: number;
};

export function chunkText(params: {
  text: string;
  targetSizeChars?: number;
  overlapChars?: number;
  minChunkChars?: number;
}): TextChunk[] {
  const {
    text,
    targetSizeChars = 1000,
    overlapChars = 160,
    minChunkChars = 20,
  } = params;

  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  // Texto mais curto que o tamanho alvo: retorna como chunk único
  if (normalized.length <= targetSizeChars) {
    return [{ index: 0, text: normalized, start: 0, end: normalized.length }];
  }

  const chunks: TextChunk[] = [];
  let cursor = 0;
  let index = 0;

  while (cursor < normalized.length) {
    const idealEnd = Math.min(normalized.length, cursor + targetSizeChars);
    let end = idealEnd;

    if (idealEnd < normalized.length) {
      const windowStart = Math.max(cursor + Math.floor(targetSizeChars * 0.6), cursor + 1);
      const slice = normalized.slice(windowStart, idealEnd);
      const lastBreak = Math.max(slice.lastIndexOf("\n\n"), slice.lastIndexOf("\n"));
      if (lastBreak >= 0) {
        end = windowStart + lastBreak;
      }
    }

    const chunkText = normalized.slice(cursor, end).trim();
    if (chunkText.length >= minChunkChars) {
      chunks.push({ index, text: chunkText, start: cursor, end });
      index += 1;
    }

    if (end >= normalized.length) break;

    cursor = Math.max(0, end - overlapChars);
    if (cursor >= normalized.length - 1) break;
  }

  return chunks;
}
