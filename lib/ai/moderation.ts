import "server-only";

import { openaiPostJson } from "@/lib/ai/openai";

type ModerationResponse = {
  results?: Array<{
    flagged?: boolean;
    categories?: Record<string, boolean>;
    category_scores?: Record<string, number>;
  }>;
};

export type ModerationResult = {
  flagged: boolean;
  categories: Record<string, boolean>;
  categoryScores: Record<string, number>;
};

export async function moderateText(params: {
  input: string;
  apiKey?: string;
  provider?: "openai" | "groq" | "mock";
}): Promise<ModerationResult> {
  // Use real OpenAI moderation only when provider is openai AND a key is available
  const useOpenAI =
    params.provider === "openai" &&
    (params.apiKey || process.env.OPENAI_API_KEY);

  if (!useOpenAI) {
    const t = params.input.toLowerCase();
    const selfHarm = /(suicid|tirar a (pr[oó]pria )?vida|me matar|matar[- ]me|autoagress)/.test(
      t,
    );
    const violence = /(matar algu[eé]m|amea[çc]a|viol[eê]ncia|agress[aã]o)/.test(t);
    const flagged = selfHarm || violence;
    return {
      flagged,
      categories: {
        self_harm: selfHarm,
        violence: violence,
      },
      categoryScores: {},
    };
  }

  const response = await openaiPostJson<ModerationResponse>({
    path: "/moderations",
    body: {
      model: process.env.OPENAI_MODERATION_MODEL ?? "omni-moderation-latest",
      input: params.input,
    },
    timeoutMs: 30_000,
    apiKey: params.apiKey,
  });

  const first = response.results?.[0];
  return {
    flagged: Boolean(first?.flagged),
    categories: first?.categories ?? {},
    categoryScores: first?.category_scores ?? {},
  };
}
