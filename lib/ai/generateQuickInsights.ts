import "server-only";

import { z } from "zod";
import { openaiPostJson } from "@/lib/ai/openai";
import { groqChatJson, getGroqApiKey, type GroqChatMessage } from "@/lib/ai/groq";
import { getTherapistOpenAiKey } from "@/lib/db/therapist";
import { getAiProvider } from "@/lib/ai/mock";

const CHEAP_MODEL = process.env.OPENAI_CHEAP_MODEL ?? "gpt-4.1-mini";
const GROQ_MODEL = process.env.GROQ_MAIN_MODEL ?? "llama-3.3-70b-versatile";

// ── Schema de saída ─────────────────────────────────────────────────────────

export const quickInsightsSchema = z.object({
  summary: z.string().trim().min(1).max(400),
  themes: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        description: z.string().trim().min(1),
      }),
    )
    .min(0)
    .max(3),
  questions: z
    .array(
      z.object({
        question: z.string().trim().min(1),
        rationale: z.string().trim().min(1),
      }),
    )
    .min(0)
    .max(3)
    .optional()
    .default([]),
  hypotheses: z
    .array(
      z.object({
        hypothesis: z.string().trim().min(1),
        confidence: z.enum(["low", "medium", "high"]),
      }),
    )
    .min(0)
    .max(2)
    .optional()
    .default([]),
  next_steps: z
    .array(
      z.object({
        step: z.string().trim().min(1),
        rationale: z.string().trim().min(1),
      }),
    )
    .min(0)
    .max(3)
    .optional()
    .default([]),
});

export type QuickInsightsPackage = z.infer<typeof quickInsightsSchema>;

// ── Prompt ───────────────────────────────────────────────────────────────────

const QUICK_SYSTEM = [
  "Você é um copiloto de apoio a sessões de terapia. Regra absoluta: não diagnosticar.",
  "Produza uma análise CONCISA dos trechos da sessão fornecidos para apoiar o terapeuta em tempo real.",
  "Considere o contexto acumulado da sessão, não apenas o trecho mais recente.",
  "Retorne SOMENTE um objeto JSON válido, sem markdown, sem texto extra.",
  "Formato obrigatório:",
  JSON.stringify({
    summary: "frase curta descrevendo o contexto atual da sessão",
    themes: [{ title: "...", description: "..." }],
    questions: [{ question: "pergunta para o terapeuta fazer ao paciente", rationale: "motivo clínico breve" }],
    hypotheses: [{ hypothesis: "hipótese assistiva sobre o paciente", confidence: "low|medium|high" }],
    next_steps: [{ step: "ação sugerida para a próxima sessão", rationale: "justificativa breve" }],
  }),
  "Máximo: 3 temas, 3 perguntas, 2 hipóteses, 3 próximos passos.",
  "Use linguagem de hipótese (pode sugerir, possível, parece). Não diagnosticar.",
].join("\n");

const QUICK_CONTEXT_WINDOW = 3;

function buildQuickPrompt(
  chunks: Array<{ id: string; speaker?: string | null; text: string }>,
  patientMemory?: string,
): string {
  // Envia os últimos N trechos para contexto acumulado, evitando prompts muito longos
  const contextChunks = chunks.slice(-QUICK_CONTEXT_WINDOW);
  const hasMore = chunks.length > contextChunks.length;

  const transcript = contextChunks
    .map((c) => {
      const who = c.speaker ? ` speaker=${c.speaker}` : "";
      return `[${c.id}]${who}: ${c.text}`;
    })
    .join("\n\n");

  const header = hasMore
    ? `Contexto da sessão (últimos ${contextChunks.length} de ${chunks.length} trechos registrados):`
    : "Contexto da sessão:";

  const memorySection = patientMemory?.trim()
    ? `Histórico clínico do paciente (sessões anteriores):\n${patientMemory.trim()}\n\n`
    : "";

  return `${memorySection}${header}\n\n${transcript}\n\nRetorne SOMENTE o JSON.`;
}

// ── Resultado ────────────────────────────────────────────────────────────────

export type QuickInsightsResult = {
  package: QuickInsightsPackage;
  mode: "quick";
  provider: "openai" | "groq" | "mock";
};

// ── Mock rápido ──────────────────────────────────────────────────────────────

function buildMockQuick(
  chunks: Array<{ id: string; text: string }>,
): QuickInsightsResult {
  const text = chunks.map((c) => c.text).join(" ").slice(0, 100);
  return {
    package: {
      summary: `Trecho registrado. Conteúdo: "${text}${text.length >= 100 ? "…" : ""}"`,
      themes: [{ title: "Trecho adicionado", description: "Análise automática indisponível (modo mock)." }],
      questions: [],
      hypotheses: [],
      next_steps: [],
    },
    mode: "quick",
    provider: "mock",
  };
}

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

// ── Função principal ─────────────────────────────────────────────────────────

export async function generateQuickInsights(params: {
  chunks: Array<{ id: string; speaker?: string | null; text: string }>;
  therapistId: string;
  patientMemory?: string;
}): Promise<QuickInsightsResult> {
  const envProvider = getAiProvider();

  if (envProvider === "mock") {
    return buildMockQuick(params.chunks);
  }

  const { apiKey: therapistApiKey } = await getTherapistOpenAiKey({
    therapistId: params.therapistId,
  });
  const groqKey = getGroqApiKey();

  const prompt = buildQuickPrompt(params.chunks, params.patientMemory);

  // ── OpenAI ────────────────────────────────────────────────────────────────
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
            { role: "system", content: QUICK_SYSTEM },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
          max_tokens: 900,
        },
        timeoutMs: 20_000,
        maxRetries: 0,
        apiKey: therapistApiKey,
      });
      const text = response.choices?.[0]?.message?.content ?? "";
      const pkg = quickInsightsSchema.parse(JSON.parse(stripFences(text)));
      return { package: pkg, mode: "quick", provider: "openai" };
    } catch {
      // Falha silenciosa → tenta Groq ou mock
    }
  }

  // ── Groq (fallback gratuito) ───────────────────────────────────────────────
  if (groqKey) {
    try {
      const messages: GroqChatMessage[] = [
        { role: "system", content: QUICK_SYSTEM },
        { role: "user", content: prompt },
      ];
      const text = await groqChatJson({
        model: GROQ_MODEL,
        messages,
        temperature: 0.2,
        timeoutMs: 20_000,
        apiKey: groqKey,
      });
      const pkg = quickInsightsSchema.parse(JSON.parse(stripFences(text)));
      return { package: pkg, mode: "quick", provider: "groq" };
    } catch {
      // Falha silenciosa → mock
    }
  }

  return buildMockQuick(params.chunks);
}
