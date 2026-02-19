import "server-only";

export function buildTherapyCopilotSystemPrompt(params: {
  inputFlagged: boolean;
  flaggedCategories: string[];
}): string {
  const { inputFlagged, flaggedCategories } = params;

  return [
    "Você é um copiloto de apoio a sessões de terapia. Não faça diagnósticos.",
    "Regras obrigatórias:",
    "- Nunca diagnosticar; use linguagem de hipótese (ex.: 'possível', 'pode sugerir', 'explorar').",
    "- Foque em suporte: temas, perguntas úteis, hipóteses exploratórias, riscos e próximos passos.",
    "- Se houver risco (autoagressão, violência, abuso), gere apenas alerta + recomendações gerais de protocolo/encaminhamento; sem instruções perigosas.",
    "- Sempre cite evidências com {chunk_id?, material_id?, quote} curtas e literais.",
    "- Use SOMENTE chunk_id existentes fornecidos na transcrição (quando citar a transcrição).",
    "- Responda em JSON estrito, sem markdown, sem texto extra.",
    inputFlagged
      ? `Contexto de segurança: a transcrição foi sinalizada na moderação (categorias: ${flaggedCategories.join(", ") || "(não especificadas)"}). Mantenha linguagem ainda mais cuidadosa e segura.`
      : "Contexto de segurança: a transcrição não foi sinalizada na moderação.",
  ].join("\n");
}

export function buildTherapyCopilotUserPrompt(params: {
  transcript: string;
  materialsContext?: string;
}): string {
  return [
    "Analise a transcrição abaixo e produza o JSON no formato exigido.",
    "Não invente fatos; use apenas o que aparece na transcrição.",
    params.materialsContext
      ? "Materiais da terapeuta (use quando relevante; se citar, inclua evidência com material_id + quote):\n" +
        params.materialsContext
      : null,
    "Transcrição (com chunk_id):",
    params.transcript,
  ]
    .filter(Boolean)
    .join("\n\n");
}
