import "server-only";

import { z } from "zod";

import { moderateText } from "@/lib/ai/moderation";
import { openaiPostJson } from "@/lib/ai/openai";
import {
  buildTherapyCopilotSystemPrompt,
  buildTherapyCopilotUserPrompt,
} from "@/lib/ai/prompts";
import { generateMockInsightsFromTranscript, getAiProvider } from "@/lib/ai/mock";
import { retrieveMaterialChunks } from "@/lib/rag/retrieve";

const evidenceSchema = z
  .object({
    chunk_id: z.string().min(1).optional(),
    material_id: z.string().min(1).optional(),
    quote: z.string().trim().min(1).max(240),
  })
  .refine((v) => Boolean(v.chunk_id || v.material_id), {
    message: "Evidência deve incluir chunk_id ou material_id",
  });

export const insightsSchema = z.object({
  themes: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        description: z.string().trim().min(1),
        evidence: z.array(evidenceSchema).min(1),
      }),
    )
    .default([]),
  questions: z
    .array(
      z.object({
        question: z.string().trim().min(1),
        rationale: z.string().trim().min(1),
        evidence: z.array(evidenceSchema).min(1),
      }),
    )
    .default([]),
  hypotheses: z
    .array(
      z.object({
        hypothesis: z.string().trim().min(1),
        confidence: z.enum(["low", "med", "high"]),
        evidence: z.array(evidenceSchema).min(1),
      }),
    )
    .default([]),
  risks: z
    .array(
      z.object({
        type: z.string().trim().min(1),
        note: z.string().trim().min(1),
        urgency: z.enum(["low", "med", "high"]),
        evidence: z.array(evidenceSchema).min(1),
      }),
    )
    .default([]),
  summary: z.object({
    bullets: z.array(z.string().trim().min(1)).max(12),
  }),
  next_steps: z
    .array(
      z.object({
        step: z.string().trim().min(1),
        rationale: z.string().trim().min(1),
      }),
    )
    .default([]),
});

export type InsightsPackage = z.infer<typeof insightsSchema>;

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
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                chunk_id: { type: "string" },
                material_id: { type: "string" },
                quote: { type: "string" },
              },
              required: ["quote"],
              anyOf: [{ required: ["chunk_id"] }, { required: ["material_id"] }],
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
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                chunk_id: { type: "string" },
                material_id: { type: "string" },
                quote: { type: "string" },
              },
              required: ["quote"],
              anyOf: [{ required: ["chunk_id"] }, { required: ["material_id"] }],
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
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                chunk_id: { type: "string" },
                material_id: { type: "string" },
                quote: { type: "string" },
              },
              required: ["quote"],
              anyOf: [{ required: ["chunk_id"] }, { required: ["material_id"] }],
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
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                chunk_id: { type: "string" },
                material_id: { type: "string" },
                quote: { type: "string" },
              },
              required: ["quote"],
              anyOf: [{ required: ["chunk_id"] }, { required: ["material_id"] }],
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
  },
  required: ["themes", "questions", "hypotheses", "risks", "summary", "next_steps"],
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

export async function generateInsightsFromTranscript(params: {
  chunks: TranscriptChunk[];
}): Promise<{ package: InsightsPackage; inputModerationFlagged: boolean }> {
  const provider = getAiProvider();

  const transcript = chunksToTranscript(params.chunks);

  const inputModeration = await moderateText({ input: transcript });
  const flaggedCategories = Object.entries(inputModeration.categories)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .slice(0, 8);

  const systemPrompt = buildTherapyCopilotSystemPrompt({
    inputFlagged: inputModeration.flagged,
    flaggedCategories,
  });

  if (provider === "mock") {
    const { candidate, inputModerationFlagged } = generateMockInsightsFromTranscript({
      chunks: params.chunks,
    });

    const pkg = insightsSchema.parse(candidate);
    const allowedChunkIds = new Set(params.chunks.map((c) => c.id));
    validateEvidenceChunkIds(pkg, allowedChunkIds);

    const outputModeration = await moderateText({
      input: packageToModerationText(pkg),
    });
    if (outputModeration.flagged) {
      throw new Error("AI output failed moderation");
    }

    return { package: pkg, inputModerationFlagged };
  }

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
  } catch {
    materialsContext = undefined;
  }

  const userPrompt = buildTherapyCopilotUserPrompt({
    transcript,
    materialsContext: materialsContext?.trim().length ? materialsContext : undefined,
  });

  type ResponsesApiResponse = unknown;

  let responseText = "";
  try {
    const response = await openaiPostJson<ResponsesApiResponse>({
      path: "/responses",
      body: {
        model: "gpt-5.1-chat-latest",
        input: [
          { role: "system", content: [{ type: "text", text: systemPrompt }] },
          { role: "user", content: [{ type: "text", text: userPrompt }] },
        ],
        temperature: 0.2,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "therapy_insights",
            strict: true,
            schema: INSIGHTS_JSON_SCHEMA,
          },
        },
      },
      timeoutMs: 60_000,
    });
    responseText = extractResponseText(response);
  } catch (e) {
    const message = e instanceof Error ? e.message : "OpenAI error";

    const response = await openaiPostJson<ResponsesApiResponse>({
      path: "/responses",
      body: {
        model: "gpt-5.1-chat-latest",
        input: [
          { role: "system", content: [{ type: "text", text: systemPrompt }] },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  userPrompt +
                  "\n\nIMPORTANTE: Retorne SOMENTE um objeto JSON válido (sem markdown).",
              },
            ],
          },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      },
      timeoutMs: 60_000,
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
  });

  if (outputModeration.flagged) {
    throw new Error("AI output failed moderation");
  }

  return { package: pkg, inputModerationFlagged: inputModeration.flagged };
}
