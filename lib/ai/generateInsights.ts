import "server-only";

import { z } from "zod";

import { moderateText, type ModerationResult } from "@/lib/ai/moderation";
import { openaiPostJson } from "@/lib/ai/openai";
import { groqChatJson, getGroqApiKey, type GroqChatMessage } from "@/lib/ai/groq";
import { getTherapistOpenAiKey } from "@/lib/db/therapist";
import {
  buildUserPrompt,
  COPILOT_DEVELOPER_PROMPT,
  COPILOT_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import { generateMockInsightsFromTranscript, getAiProvider } from "@/lib/ai/mock";
import { retrieveMaterialChunks } from "@/lib/rag/retrieve";

const MAIN_MODEL = process.env.OPENAI_MAIN_MODEL ?? "gpt-4.1";
const CHEAP_MODEL = process.env.OPENAI_CHEAP_MODEL ?? "gpt-4.1-mini";
const GROQ_MODEL = process.env.GROQ_MAIN_MODEL ?? "llama-3.3-70b-versatile";

const evidenceSchema = z.object({
  chunk_id: z.string().min(1).optional(),
  material_id: z.string().min(1).optional(),
  quote: z.string().trim().min(1).max(240),
});

export const insightsSchema = z.object({
  themes: z.preprocess(
    (v) => {
      if (!Array.isArray(v)) return [];
      return v.map((item) =>
        typeof item === "string"
          ? { title: item, description: item, evidence: [] }
          : item,
      );
    },
    z
      .array(
        z.object({
          title: z.string().trim().min(1),
          description: z.string().trim().min(1),
          evidence: z.array(evidenceSchema).default([]),
        }),
      )
      .default([]),
  ),
  questions: z.preprocess(
    (v) => {
      if (!Array.isArray(v)) return [];
      return v.map((item) =>
        typeof item === "string"
          ? { question: item, rationale: "", evidence: [] }
          : item,
      );
    },
    z
      .array(
        z.object({
          question: z.string().trim().min(1),
          rationale: z.string().trim().min(1),
          evidence: z.array(evidenceSchema).default([]),
        }),
      )
      .default([]),
  ),
  hypotheses: z.preprocess(
    (v) => {
      if (!Array.isArray(v)) return [];
      return v.map((item) =>
        typeof item === "string"
          ? { hypothesis: item, confidence: "low" as const, evidence: [] }
          : item,
      );
    },
    z
      .array(
        z.object({
          hypothesis: z.string().trim().min(1),
          confidence: z.enum(["low", "med", "high"]),
          evidence: z.array(evidenceSchema).default([]),
        }),
      )
      .default([]),
  ),
  risks: z.preprocess(
    (v) => {
      if (!Array.isArray(v)) return [];
      return v.map((item) =>
        typeof item === "string"
          ? { type: item, note: item, urgency: "low" as const, evidence: [] }
          : item,
      );
    },
    z
      .array(
        z.object({
          type: z.string().trim().min(1),
          note: z.string().trim().min(1),
          urgency: z.enum(["low", "med", "high"]),
          evidence: z.array(evidenceSchema).default([]),
        }),
      )
      .default([]),
  ),
  summary: z.preprocess(
    (v) => {
      if (Array.isArray(v)) return { bullets: v.filter((s) => typeof s === "string") };
      if (typeof v === "object" && v !== null) return v;
      if (typeof v === "string") return { bullets: v.split("\n").map((s) => s.trim()).filter(Boolean) };
      return { bullets: [] };
    },
    z.object({
      bullets: z.array(z.string().trim().min(1)).max(12),
    }),
  ),
  next_steps: z.preprocess(
    (v) => {
      if (!Array.isArray(v)) return [];
      return v.map((item) =>
        typeof item === "string" ? { step: item, rationale: "" } : item,
      );
    },
    z
      .array(
        z.object({
          step: z.string().trim().min(1),
          rationale: z.string().trim().min(1),
        }),
      )
      .default([]),
  ),
  suggested_next_steps: z.preprocess(
    (v) => {
      if (!Array.isArray(v)) return [];
      return v.map((item) =>
        typeof item === "string"
          ? { action: item, rationale: "", type: "exploration" as const }
          : item,
      );
    },
    z
      .array(
        z.object({
          action: z.string().trim().min(1),
          rationale: z.string().trim().min(1),
          type: z.enum(["exploration", "intervention", "monitoring"]),
        }),
      )
      .max(3)
      .default([]),
  ),
});

export type InsightsPackage = z.infer<typeof insightsSchema>;

type FallbackReason = "missing_key" | "quota" | "groq_rate_limit";

export type GenerateInsightsResult = {
  package: InsightsPackage;
  inputModerationFlagged: boolean;
  provider: "openai" | "groq" | "mock";
  /** true = OpenAI completo (RAG + embeddings + análise profunda) */
  isFullAI: boolean;
  fallbackReason?: FallbackReason;
};

const INSIGHTS_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    themes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          evidence: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                chunk_id: { type: "string" },
                material_id: { type: "string" },
                quote: { type: "string" },
              },
              required: ["quote"],
            },
          },
        },
        required: ["title", "description", "evidence"],
      },
    },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          question: { type: "string" },
          rationale: { type: "string" },
          evidence: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                chunk_id: { type: "string" },
                material_id: { type: "string" },
                quote: { type: "string" },
              },
              required: ["quote"],
            },
          },
        },
        required: ["question", "rationale", "evidence"],
      },
    },
    hypotheses: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          hypothesis: { type: "string" },
          confidence: { type: "string", enum: ["low", "med", "high"] },
          evidence: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                chunk_id: { type: "string" },
                material_id: { type: "string" },
                quote: { type: "string" },
              },
              required: ["quote"],
            },
          },
        },
        required: ["hypothesis", "confidence", "evidence"],
      },
    },
    risks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: { type: "string" },
          note: { type: "string" },
          urgency: { type: "string", enum: ["low", "med", "high"] },
          evidence: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                chunk_id: { type: "string" },
                material_id: { type: "string" },
                quote: { type: "string" },
              },
              required: ["quote"],

            },
          },
        },
        required: ["type", "note", "urgency", "evidence"],
      },
    },
    summary: {
      type: "object",
      additionalProperties: false,
      properties: {
        bullets: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["bullets"],
    },
    next_steps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          step: { type: "string" },
          rationale: { type: "string" },
        },
        required: ["step", "rationale"],
      },
    },
    suggested_next_steps: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          action: { type: "string" },
          rationale: { type: "string" },
          type: { type: "string", enum: ["exploration", "intervention", "monitoring"] },
        },
        required: ["action", "rationale", "type"],
      },
    },
  },
  required: ["themes", "questions", "hypotheses", "risks", "summary", "next_steps", "suggested_next_steps"],
};

type TranscriptChunk = {
  id: string;
  speaker?: string | null;
  text: string;
};

function chunksToTranscript(chunks: TranscriptChunk[]): string {
  return chunks
    .map((c) => {
      const who = c.speaker ? ` speaker=${c.speaker}` : "";
      return `[${c.id}]${who}: ${c.text}`;
    })
    .join("\n\n");
}

function extractResponseText(response: unknown): string {
  if (typeof response === "object" && response && "output_text" in response) {
    const v = (response as { output_text?: unknown }).output_text;
    if (typeof v === "string") return v;
  }

  const output =
    typeof response === "object" &&
    response !== null &&
    "output" in response &&
    Array.isArray((response as { output?: unknown }).output)
      ? ((response as { output?: unknown }).output as unknown[])
      : null;

  if (!output) return "";
  const parts: string[] = [];

  for (const item of output) {
    if (typeof item !== "object" || item === null) continue;
    if (!("content" in item)) continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;

    for (const c of content) {
      if (typeof c !== "object" || c === null) continue;
      const type = "type" in c ? (c as { type?: unknown }).type : undefined;
      const text = "text" in c ? (c as { text?: unknown }).text : undefined;
      if ((type === "output_text" || type === "text") && typeof text === "string") {
        parts.push(text);
      }
    }
  }
  return parts.join("\n");
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function validateEvidenceChunkIds(pkg: InsightsPackage, allowed: Set<string>) {
  const allEvidence = [
    ...pkg.themes.flatMap((t) => t.evidence),
    ...pkg.questions.flatMap((q) => q.evidence),
    ...pkg.hypotheses.flatMap((h) => h.evidence),
    ...pkg.risks.flatMap((r) => r.evidence),
  ];
  for (const ev of allEvidence) {
    if (ev.chunk_id && !allowed.has(ev.chunk_id)) {
      throw new Error(`chunk_id inválido na evidência: ${ev.chunk_id}`);
    }
  }
}

function buildRagQueryText(chunks: TranscriptChunk[]): string {
  const tail = chunks.slice(-10);
  return tail.map((c) => `${c.speaker ? c.speaker + ": " : ""}${c.text}`).join("\n");
}

function formatMaterialsContext(chunks: Array<{ material_id: string; chunk_text: string; score: number }>): string {
  if (chunks.length === 0) return "";
  return chunks
    .map((c, idx) => {
      const snip = c.chunk_text.length > 1200 ? c.chunk_text.slice(0, 1200) + "…" : c.chunk_text;
      return `#${idx + 1} [material_id=${c.material_id}] (score=${c.score.toFixed(3)}):\n${snip}`;
    })
    .join("\n\n");
}

function packageToModerationText(pkg: InsightsPackage): string {
  const evidenceStrings = [
    ...pkg.themes.flatMap((t) => t.evidence.map((e) => e.quote)),
    ...pkg.questions.flatMap((q) => q.evidence.map((e) => e.quote)),
    ...pkg.hypotheses.flatMap((h) => h.evidence.map((e) => e.quote)),
    ...pkg.risks.flatMap((r) => r.evidence.map((e) => e.quote)),
  ];

  return [
    ...pkg.summary.bullets,
    ...pkg.themes.map((t) => `${t.title}: ${t.description}`),
    ...pkg.questions.map((q) => `${q.question} — ${q.rationale}`),
    ...pkg.hypotheses.map((h) => `${h.hypothesis} (${h.confidence})`),
    ...pkg.risks.map((r) => `${r.type} (${r.urgency}): ${r.note}`),
    ...pkg.next_steps.map((s) => `${s.step}: ${s.rationale}`),
    ...evidenceStrings,
  ].join("\n");
}

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /insufficient[_ -]?quota|quota|billing|payment|402|429/i.test(msg);
}

function buildMockInsights(
  chunks: TranscriptChunk[],
  fallbackReason?: FallbackReason,
): GenerateInsightsResult {
  const { candidate, inputModerationFlagged } = generateMockInsightsFromTranscript({
    chunks,
  });

  const pkg = insightsSchema.parse(candidate);
  const allowedChunkIds = new Set(chunks.map((c) => c.id));
  validateEvidenceChunkIds(pkg, allowedChunkIds);

  return {
    package: pkg,
    inputModerationFlagged,
    provider: "mock",
    fallbackReason,
  };
}

export async function generateInsightsFromTranscript(params: {
  chunks: TranscriptChunk[];
  therapistId: string;
  patientMemory?: string;
}): Promise<GenerateInsightsResult> {
  const { apiKey: therapistApiKey } = await getTherapistOpenAiKey({ therapistId: params.therapistId });
  const groqKey = getGroqApiKey();
  const envProvider = getAiProvider();

  // Prioridade: openai (chave do tenant) > groq (fallback gratuito) > mock
  const provider =
    envProvider === "mock"
      ? "mock"
      : therapistApiKey
      ? "openai"
      : groqKey
      ? "groq"
      : "mock";

  const fallbackReason: FallbackReason | undefined =
    envProvider === "mock" || therapistApiKey ? undefined : "missing_key";

  const transcript = chunksToTranscript(params.chunks);
  let inputModeration: ModerationResult;
  try {
    inputModeration = await moderateText({
      input: transcript,
      apiKey: therapistApiKey,
      provider,
    });
  } catch (err) {
    if (provider === "openai" && isQuotaError(err)) {
      return buildMockInsights(params.chunks, "quota");
    }
    throw err;
  }
  const flaggedCategories = Object.entries(inputModeration.categories)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .slice(0, 8);

  const safetyContext = inputModeration.flagged
    ? `Contexto de seguranca: a transcricao foi sinalizada na moderacao (categorias: ${flaggedCategories.join(", ") || "(nao especificadas)"}). Mantenha linguagem ainda mais cuidadosa e segura.`
    : "Contexto de seguranca: a transcricao nao foi sinalizada na moderacao.";

  const systemPrompt = [COPILOT_SYSTEM_PROMPT, safetyContext].join("\n\n");

  if (provider === "mock") {
    const { package: pkg, inputModerationFlagged } = buildMockInsights(
      params.chunks,
      fallbackReason,
    );
    const outputModeration = await moderateText({
      input: packageToModerationText(pkg),
      provider,
    });
    if (outputModeration.flagged) {
      throw new Error("AI output failed moderation");
    }

    return { package: pkg, inputModerationFlagged, provider: "mock", isFullAI: false, fallbackReason };
  }

  // ── GROQ (fallback gratuito — modo degradado: sem RAG, sem embeddings) ───
  if (provider === "groq") {
    const groqApiKey = groqKey!;

    // RAG desativado no modo Groq (embeddings requerem OpenAI)
    const userPrompt = buildUserPrompt({
      chunks: params.chunks,
      materialsContext: undefined,
      patientMemory: params.patientMemory?.trim().length ? params.patientMemory : undefined,
    });

    const groqMessages: GroqChatMessage[] = [
      {
        role: "system",
        content:
          systemPrompt +
          "\n\nRetorne SOMENTE um objeto JSON válido seguindo o schema especificado.",
      },
      {
        role: "user",
        content:
          userPrompt +
          "\n\nIMPORTANTE: Retorne SOMENTE um objeto JSON válido (sem markdown, sem código).",
      },
    ];

    try {
      const responseText = await groqChatJson({
        model: GROQ_MODEL,
        messages: groqMessages,
        temperature: 0.2,
        apiKey: groqApiKey,
      });

      const cleaned = stripCodeFences(responseText);
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(cleaned) as unknown;
      } catch {
        throw new Error("Groq returned invalid JSON");
      }

      const pkg = insightsSchema.parse(parsedJson);
      const allowedChunkIds = new Set(params.chunks.map((c) => c.id));
      validateEvidenceChunkIds(pkg, allowedChunkIds);

      const outputModeration = await moderateText({
        input: packageToModerationText(pkg),
        provider: "mock",
      });
      if (outputModeration.flagged) {
        throw new Error("AI output failed moderation");
      }

      return {
        package: pkg,
        inputModerationFlagged: inputModeration.flagged,
        provider: "groq",
        isFullAI: false,
        fallbackReason,
      };
    } catch (err) {
      // Rate limit do Groq → mock com aviso
      const msg = err instanceof Error ? err.message : "";
      if (/rate.?limit|429|too many/i.test(msg)) {
        const { package: mockPkg, inputModerationFlagged } = buildMockInsights(
          params.chunks,
          "groq_rate_limit",
        );
        return {
          package: mockPkg,
          inputModerationFlagged,
          provider: "mock",
          isFullAI: false,
          fallbackReason: "groq_rate_limit",
        };
      }
      throw err;
    }
  }

  if (!therapistApiKey) {
    throw new Error("Missing therapist OpenAI key for provider openai");
  }

  try {
    let materialsContext: string | undefined;
    try {
      const queryText = buildRagQueryText(params.chunks);
      const retrieved = await retrieveMaterialChunks({ queryText, topK: 8 });
      materialsContext = formatMaterialsContext(
        retrieved.map((r) => ({
          material_id: r.material_id,
          chunk_text: r.chunk_text,
          score: r.score,
        })),
      );
    } catch (err) {
      if (isQuotaError(err)) {
        throw err;
      }
      materialsContext = undefined;
    }

    const userPrompt = buildUserPrompt({
      chunks: params.chunks,
      materialsContext: materialsContext?.trim().length ? materialsContext : undefined,
      patientMemory: params.patientMemory?.trim().length ? params.patientMemory : undefined,
    });

    type ResponsesApiResponse = unknown;

    let responseText = "";
    try {
      const response = await openaiPostJson<ResponsesApiResponse>({
        path: "/responses",
        body: {
          model: MAIN_MODEL,
          input: [
            { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
            { role: "developer", content: [{ type: "input_text", text: COPILOT_DEVELOPER_PROMPT }] },
            { role: "user", content: [{ type: "input_text", text: userPrompt }] },
          ],
          temperature: 0.2,
          text: {
            format: {
              type: "json_schema",
              name: "therapy_insights",
              strict: true,
              schema: INSIGHTS_JSON_SCHEMA,
            },
          },
        },
        timeoutMs: 60_000,
        apiKey: therapistApiKey,
      });
      responseText = extractResponseText(response);
    } catch (e) {
      const message = e instanceof Error ? e.message : "OpenAI error";

      const response = await openaiPostJson<ResponsesApiResponse>({
        path: "/responses",
        body: {
          model: CHEAP_MODEL,
          input: [
            { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
            { role: "developer", content: [{ type: "input_text", text: COPILOT_DEVELOPER_PROMPT }] },
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text:
                    userPrompt +
                    "\n\nIMPORTANTE: Retorne SOMENTE um objeto JSON valido (sem markdown).",
                },
              ],
            },
          ],
          temperature: 0.2,
          text: { format: { type: "json_object" } },
        },
        timeoutMs: 60_000,
        apiKey: therapistApiKey,
      });
      responseText = extractResponseText(response);

      if (!responseText) {
        throw new Error(message);
      }
    }

    const cleaned = stripCodeFences(responseText);
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(cleaned) as unknown;
    } catch {
      throw new Error("AI returned invalid JSON");
    }

    const pkg = insightsSchema.parse(parsedJson);
    const allowedChunkIds = new Set(params.chunks.map((c) => c.id));
    validateEvidenceChunkIds(pkg, allowedChunkIds);

    const outputModeration = await moderateText({
      input: packageToModerationText(pkg),
      apiKey: therapistApiKey,
      provider,
    });

    if (outputModeration.flagged) {
      throw new Error("AI output failed moderation");
    }

    return {
      package: pkg,
      inputModerationFlagged: inputModeration.flagged,
      provider: "openai",
      isFullAI: true,
    };
  } catch (err) {
    if (isQuotaError(err)) {
      const { package: pkg, inputModerationFlagged } = buildMockInsights(
        params.chunks,
        "quota",
      );
      const outputModeration = await moderateText({
        input: packageToModerationText(pkg),
        provider: "mock",
      });
      if (outputModeration.flagged) {
        throw new Error("AI output failed moderation");
      }
      return {
        package: pkg,
        inputModerationFlagged,
        provider: "mock",
        isFullAI: false,
        fallbackReason: "quota",
      };
    }
    throw err;
  }
}
