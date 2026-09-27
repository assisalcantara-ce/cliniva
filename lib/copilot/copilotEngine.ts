import "server-only";

import { openaiPostJson } from "@/lib/ai/openai";
import { groqChatJson, getGroqApiKey, type GroqChatMessage } from "@/lib/ai/groq";
import { getTherapistOpenAiKey } from "@/lib/db/therapist";
import { getAiProvider } from "@/lib/ai/mock";
import {
  type CopilotContext,
  type CopilotEvent,
  copilotEventsOutputSchema,
} from "./types";
import { eventEngine } from "./eventEngine";
import { decisionEngine } from "./decisionEngine";

const CHEAP_MODEL = process.env.OPENAI_CHEAP_MODEL ?? "gpt-4.1-mini";
const GROQ_MODEL = process.env.GROQ_MAIN_MODEL ?? "llama-3.3-70b-versatile";

const COPILOT_SYSTEM_PROMPT = [
  "Você é o Cliniva Copilot, assistente clínico em tempo real para terapeutas.",
  "Regra absoluta e inegociável: NÃO diagnosticar e NÃO prescrever.",
  "Sua função é gerar notas e sugestões pontuais e acionáveis para o terapeuta durante a sessão.",
  "",
  "Categorias de eventos permitidos:",
  "- RECORRENCIA: Tema, padrão ou fala que se repete em relação ao histórico do paciente.",
  "- EXPLORAR: Pergunta aberta ou ponto fértil para o terapeuta investigar no momento.",
  "- CONEXAO: Associação entre o relato atual e a anamnese/histórico do paciente.",
  "- ACOMPANHAR: Ponto combinado ou objetivo terapêutico que precisa ser checado.",
  "- NOTA: Fato ou evento relevante narrado pelo paciente para registro no prontuário.",
  "- POTENTIAL_RISK: Menção a risco/crise (gerar alerta com linguagem de cuidado, sem instruções perigosas).",
  "",
  "Regras de estilo:",
  "- Tom neutro, acolhedor, hipotético ('pode sugerir', 'observar', 'possível').",
  "- Títulos concisos (até 6 palavras).",
  "- Descrições diretas e curtas (1 a 2 frases).",
  "- Retorne estritamente um objeto JSON no formato: { \"events\": [ { \"type\": \"...\", \"title\": \"...\", \"description\": \"...\", \"urgency\": \"low|medium|high\", \"suggestedAction\": \"...\", \"rationale\": \"...\", \"evidenceQuote\": \"...\", \"evidenceChunkId\": \"...\" } ] }.",
  "- Limite: retorne no máximo 3 eventos mais relevantes por análise.",
].join("\n");

function buildCopilotUserPrompt(context: CopilotContext): string {
  const parts: string[] = [];

  if (context.patient) {
    parts.push(`Paciente: ${context.patient.name}`);
    if (context.patient.anamnesis?.trim()) {
      parts.push(`Anamnese:\n${context.patient.anamnesis.trim()}`);
    }
    if (context.patient.memorySummary?.trim()) {
      parts.push(`Memória de sessões anteriores (Longitudinal):\n${context.patient.memorySummary.trim()}`);
    }
  }

  if (context.relevantHistory && context.relevantHistory.length > 0) {
    const histLines = context.relevantHistory
      .map(
        (h) =>
          `[Sessão anterior ${h.sessionId.slice(0, 8)} | Chunk ${h.chunkId}]${h.speaker ? ` (${h.speaker})` : ""}: ${h.text}`
      )
      .join("\n");
    parts.push(`Histórico relevante de sessões anteriores (Evidências cruzadas):\n${histLines}`);
  }

  const transcriptText = context.recentChunks
    .map((c) => `[${c.id}]${c.speaker ? ` (${c.speaker})` : ""}: ${c.text}`)
    .join("\n");

  parts.push(
    `Trechos recentes da sessão atual (últimos ${context.recentChunks.length} de ${context.totalChunksCount}):\n${transcriptText}`,
  );
  parts.push("Analise os trechos acima e gere os eventos clínicos pertinentes no formato JSON estrito.");

  return parts.join("\n\n");
}

function stripCodeFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

/**
 * Motor de geração do Copilot (Copilot Engine).
 * Recebe o contexto montado e produz eventos acionáveis com isolamento de terapeuta e provedor agnóstico.
 */
export async function generateCopilotEvents(
  context: CopilotContext,
): Promise<CopilotEvent[]> {
  // 1. Filtragem pelo Event Engine
  const evaluation = eventEngine.evaluateContext(context);
  if (!evaluation.shouldEvaluateLlm) {
    return [];
  }

  const envProvider = getAiProvider();
  if (envProvider === "mock") {
    return generateMockEvents(context);
  }

  const { apiKey: therapistApiKey } = await getTherapistOpenAiKey({
    therapistId: context.therapistId,
  });
  const groqKey = getGroqApiKey();
  const prompt = buildCopilotUserPrompt(context);

  // 2. Tentar OpenAI (se chave BYOK disponível)
  if (therapistApiKey) {
    try {
      type ChatResponse = {
        choices: Array<{ message: { content: string } }>;
      };
      const response = await openaiPostJson<ChatResponse>({
        path: "/chat/completions",
        body: {
          model: CHEAP_MODEL,
          messages: [
            { role: "system", content: COPILOT_SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
          max_tokens: 800,
        },
        timeoutMs: 15_000,
        maxRetries: 0,
        apiKey: therapistApiKey,
      });

      const text = response.choices?.[0]?.message?.content ?? "";
      return parseAndFormatEvents(text, context);
    } catch (err) {
      console.warn("[CopilotEngine] Falha na chamada OpenAI, tentando fallback:", err);
    }
  }

  // 3. Tentar Groq (fallback gratuito)
  if (groqKey) {
    try {
      const messages: GroqChatMessage[] = [
        { role: "system", content: COPILOT_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ];
      const text = await groqChatJson({
        model: GROQ_MODEL,
        messages,
        temperature: 0.2,
        timeoutMs: 15_000,
        apiKey: groqKey,
      });

      return parseAndFormatEvents(text, context);
    } catch (err) {
      console.warn("[CopilotEngine] Falha na chamada Groq:", err);
    }
  }

  // 4. Fallback final seguro (Mock estruturado)
  return generateMockEvents(context);
}

function parseAndFormatEvents(rawJson: string, context: CopilotContext): CopilotEvent[] {
  try {
    const cleaned = stripCodeFences(rawJson);
    const parsed = JSON.parse(cleaned) as unknown;
    const validated = copilotEventsOutputSchema.parse(parsed);

    // Validação de evidência: se houver chunk_id citado, deve existir nos recentChunks
    const validChunkIds = new Set(context.recentChunks.map((c) => c.id));

    const rawEvents: CopilotEvent[] = validated.events.map((e, idx) => ({
      id: `copilot-evt-${Date.now()}-${idx}`,
      type: e.type,
      title: e.title,
      description: e.description,
      urgency: e.urgency,
      rationale: e.rationale,
      suggestedAction: e.suggestedAction,
      evidence: e.evidenceQuote
        ? {
            chunkId: e.evidenceChunkId && validChunkIds.has(e.evidenceChunkId) ? e.evidenceChunkId : context.recentChunks[context.recentChunks.length - 1]?.id,
            quote: e.evidenceQuote,
          }
        : undefined,
      createdAt: new Date().toISOString(),
    }));

    return decisionEngine.filterAndDecideEvents(rawEvents, context);
  } catch (err) {
    console.error("[CopilotEngine] Erro ao validar output JSON:", err);
    return generateMockEvents(context);
  }
}

function generateMockEvents(context: CopilotContext): CopilotEvent[] {
  const latest = context.recentChunks[context.recentChunks.length - 1];
  if (!latest) return [];

  return [
    {
      id: `copilot-mock-${Date.now()}`,
      type: "EXPLORAR",
      title: "Explorar relato recente",
      description: "Aprofundar os sentimentos associados ao último ponto mencionado.",
      urgency: "low",
      suggestedAction: "Pergunte como essa situação fez o paciente se sentir no momento.",
      evidence: {
        chunkId: latest.id,
        quote: latest.text.slice(0, 80),
      },
      createdAt: new Date().toISOString(),
    },
  ];
}
