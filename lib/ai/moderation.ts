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
  provider?: "openai" | "mock";
}): Promise<ModerationResult> {
  const provider = params.provider ?? (process.env.AI_PROVIDER === "mock" ? "mock" : "openai");
  if (provider === "mock") {
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
      model: "omni-moderation-latest",
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
