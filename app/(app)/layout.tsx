import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/AppShell";
import { parseAuthToken } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function getAiProvider(): "openai" | "mock" {
  return process.env.AI_PROVIDER === "mock" ? "mock" : "openai";
}

async function getInitialAiMode(
  aiProvider: "openai" | "mock"
): Promise<"openai" | "groq" | "offline" | "verificando"> {
  if (aiProvider === "mock") return "offline";

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) {
      // Se não autenticado no SSR, estado de verificação
      return "verificando";
    }

    const user = parseAuthToken(token);
    if (!user || !user.userId) {
      return "verificando";
    }

    // Consulta segura: apenas verifica se existe chave criptografada/legada salva para o terapeuta
    const supabase = createSupabaseAdminClient();
    const { data: therapist } = await supabase
      .from("therapists")
      .select("openai_api_key_encrypted, openai_api_key")
      .eq("id", user.userId)
      .maybeSingle();

    const hasTherapistKey = Boolean(
      therapist?.openai_api_key_encrypted || therapist?.openai_api_key || process.env.OPENAI_API_KEY
    );
    const hasGroq = Boolean(process.env.GROQ_API_KEY);

    if (hasTherapistKey) {
      return "openai";
    }
    if (hasGroq) {
      return "groq";
    }
    return "offline";
  } catch (err) {
    console.warn("[AppGroupLayout] Erro ao verificar status inicial de IA:", err);
    return "verificando";
  }
}

export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const aiProvider = getAiProvider();
  const initialAiMode = await getInitialAiMode(aiProvider);

  return (
    <AppShell
      aiOnline={initialAiMode === "openai"}
      initialAiMode={initialAiMode}
      aiProvider={aiProvider}
    >
      {children}
    </AppShell>
  );
}
