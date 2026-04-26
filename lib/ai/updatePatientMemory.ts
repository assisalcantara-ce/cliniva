import "server-only";

import { openaiPostJson } from "@/lib/ai/openai";
import { groqChatJson, getGroqApiKey, type GroqChatMessage } from "@/lib/ai/groq";
import type { InsightsPackage } from "@/lib/ai/generateInsights";

const CHEAP_MODEL = process.env.OPENAI_CHEAP_MODEL ?? "gpt-4.1-mini";
const GROQ_MODEL = process.env.GROQ_MAIN_MODEL ?? "llama-3.3-70b-versatile";

/** Limite máximo de caracteres do sumário persistido (~800 tokens) */
const MAX_SUMMARY_CHARS = 2400;

const MERGE_SYSTEM = [
  "Você é um assistente clínico. Regra absoluta: não diagnosticar.",
  "Sua tarefa é atualizar um resumo clínico persistente de um paciente em acompanhamento psicoterápico.",
  "Combine o histórico anterior com os novos insights da sessão atual.",
  "Produza um resumo CONCISO (máximo 5 tópicos curtos) cobrindo:",
  "- padrões recorrentes identificados",
  "- temas principais abordados",
  "- evolução geral percebida",
  "Use linguagem hipotética e clínica (pode sugerir, possível, parece, foi observado).",
  "Responda SOMENTE com o texto do resumo atualizado (sem JSON, sem markdown, sem títulos).",
  "Mantenha até 400 palavras. Seja objetivo.",
].join("\n");

function buildMergePrompt(previous: string, newInsights: InsightsPackage): string {
  const sessionSummary = newInsights.summary.bullets.join("\n- ");
  const themes = newInsights.themes.map((t) => `${t.title}: ${t.description}`).join("\n");
  const hypotheses = newInsights.hypotheses.map((h) => h.hypothesis).join("\n");

  return [
    previous ? `Histórico clínico anterior do paciente:\n${previous}` : "Histórico clínico anterior: (nenhum — esta é a primeira sessão analisada)",
    "",
    "Insights da sessão atual:",
    `Resumo da sessão:\n- ${sessionSummary}`,
    themes ? `Temas identificados:\n${themes}` : "",
    hypotheses ? `Hipóteses exploratórias:\n${hypotheses}` : "",
  ]
    .filter((line) => line !== undefined && line !== "")
    .join("\n\n");
}

/** Trunca o resumo para evitar crescimento infinito entre sessões. */
function truncateSummary(text: string): string {
  if (text.length <= MAX_SUMMARY_CHARS) return text;
  // Mantém os últimos MAX_SUMMARY_CHARS chars (preserva informação mais recente)
  const truncated = text.slice(-MAX_SUMMARY_CHARS);
  const firstNewline = truncated.indexOf("\n");
  return firstNewline > 0 ? truncated.slice(firstNewline + 1) : truncated;
}

/**
 * Atualiza o resumo clínico do paciente com base nos novos insights.
 * Usa modelo CHEAP (gpt-4.1-mini) ou Groq como fallback.
 * Retorna o novo resumo, ou null em caso de falha (não crítica).
 */
export async function buildUpdatedPatientMemory(params: {
  previous: string;
  newInsights: InsightsPackage;
  apiKey?: string; // chave OpenAI do terapeuta (se disponível)
}): Promise<string | null> {
  const { previous, newInsights, apiKey } = params;
  const prompt = buildMergePrompt(previous, newInsights);

  // ── Tenta OpenAI CHEAP ─────────────────────────────────────────────────
  if (apiKey) {
    try {
      type ChatResponse = {
        choices: Array<{ message: { content: string } }>;
      };
      const response = await openaiPostJson<ChatResponse>({
        path: "/chat/completions",
        body: {
          model: CHEAP_MODEL,
          messages: [
            { role: "system", content: MERGE_SYSTEM },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 600,
        },
        timeoutMs: 20_000,
        maxRetries: 0,
        apiKey,
      });
      const text = response.choices?.[0]?.message?.content?.trim() ?? "";
      if (text) return truncateSummary(text);
    } catch {
      // Falha silenciosa → tenta Groq
    }
  }

  // ── Tenta Groq ────────────────────────────────────────────────────────
  const groqKey = getGroqApiKey();
  if (groqKey) {
    try {
      const messages: GroqChatMessage[] = [
        { role: "system", content: MERGE_SYSTEM },
        { role: "user", content: prompt },
      ];
      const text = await groqChatJson({
        model: GROQ_MODEL,
        messages,
        temperature: 0.3,
        timeoutMs: 20_000,
        apiKey: groqKey,
      });
      if (text) return truncateSummary(text);
    } catch {
      // Falha silenciosa
    }
  }

  return null;
}
