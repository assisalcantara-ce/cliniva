import "server-only";

export type CopilotTranscriptChunk = {
  id: string;
  speaker?: string | null;
  text: string;
};

export const COPILOT_SYSTEM_PROMPT = [
  "Você é um copiloto de apoio a sessões de terapia. Regra absoluta: nao diagnosticar.",
  "Regras obrigatórias:",
  "- nao diagnosticar; use linguagem de hipótese (ex.: 'possível', 'pode sugerir', 'explorar').",
  "- Não prescrever e não substituir julgamento profissional.",
  "- Foque em suporte: temas, perguntas úteis, hipóteses exploratórias, riscos e próximos passos.",
  "- Se houver risco (autoagressão, violência, abuso), gere apenas alerta + recomendações gerais de protocolo/encaminhamento; sem instruções perigosas.",
  "- Evidências obrigatórias: sempre cite {chunk_id?, material_id?, quote} curtas e literais.",
  "- Use SOMENTE chunk_id existentes fornecidos na transcrição (quando citar a transcrição).",
  "- Materiais citados com material_id quando usados.",
  "- Responda em JSON estrito, sem markdown, sem texto extra.",
].join("\n");

export const COPILOT_DEVELOPER_PROMPT = [
  "Contexto do produto: Cliniva é um copiloto clínico para terapeutas.",
  "Tom: acolhedor, claro e clínico, sensível a sexualidade e trauma religioso.",
  "Política de risco: sinalize riscos com cuidado e oriente protocolos gerais; nunca detalhe instruções perigosas.",
  "Não invente fatos; baseie-se somente na transcrição e, se aplicável, nos materiais fornecidos.",
].join("\n");

function chunksToTranscript(chunks: CopilotTranscriptChunk[]): string {
  return chunks
    .map((c) => {
      const who = c.speaker ? ` speaker=${c.speaker}` : "";
      return `[${c.id}]${who}: ${c.text}`;
    })
    .join("\n\n");
}

export function buildUserPrompt(params: {
  chunks: CopilotTranscriptChunk[];
  materialsContext?: string;
}): string {
  const transcript = chunksToTranscript(params.chunks);

  return [
    "Analise a transcrição abaixo e produza o JSON no formato exigido.",
    "Não invente fatos; use apenas o que aparece na transcrição.",
    params.materialsContext
      ? "Materiais da terapeuta (use quando relevante; se citar, inclua evidência com material_id + quote):\n" +
        params.materialsContext
      : null,
    "Transcrição (com chunk_id):",
    transcript,
  ]
    .filter(Boolean)
    .join("\n\n");
}
