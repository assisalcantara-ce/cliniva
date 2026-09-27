import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPatientMemory } from "@/lib/db/patientMemory";
import type {
  CopilotContext,
  CopilotTranscriptSnippet,
  CopilotPatientProfile,
  CopilotHistoricalSnippet,
} from "./types";

const DEFAULT_RECENT_CHUNKS_WINDOW = 4;
const MAX_HISTORICAL_SESSIONS_SEARCH = 5;
const MAX_HISTORICAL_CHUNKS_RETURNED = 3;

/**
 * Stop-words e termos comuns para exclusão na busca de similaridade contextual.
 */
const COMMON_STOP_WORDS = new Set([
  "de", "a", "o", "que", "e", "do", "da", "em", "um", "para", "é", "com", "não",
  "uma", "os", "no", "se", "na", "por", "mais", "as", "dos", "como", "mas", "foi",
  "ao", "ele", "das", "tem", "à", "seu", "sua", "ou", "ser", "quando", "muito",
  "nos", "já", "eu", "também", "só", "pelo", "pela", "até", "isso", "ela", "entre",
  "era", "depois", "sem", "mesmo", "aos", "ter", "seus", "quem", "nas", "me", "esse",
  "eles", "estão", "você", "tinha", "foram", "essa", "num", "nem", "suas", "meu",
  "minha", "têm", "numa", "pelos", "elas", "havia", "seja", "qual", "será", "nós",
  "tenho", "estou", "estava", "porque", "sobre", "tudo", "nada", "aqui", "agora",
  "entao", "assim", "onde", "qual", "coisa", "onde", "hoje", "ontem", "amanha"
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !COMMON_STOP_WORDS.has(w));
}

export interface BuildCopilotContextParams {
  sessionId: string;
  therapistId: string;
  /** Quantidade de trechos recentes a incluir na janela de análise */
  windowSize?: number;
  /** Chunks já fornecidos em memória (opcional, evita query se já carregados) */
  providedChunks?: CopilotTranscriptSnippet[];
  /** Buscar evidências históricas de sessões anteriores com correspondência temática */
  includeHistoricalSnippets?: boolean;
}

/**
 * Monta o contexto clínico longitudinal completo para o Copilot com isolamento estrito:
 * 1. CURRENT_SESSION: session_id, therapist_id, contagem total de trechos da sessão atual.
 * 2. RECENT_WINDOW: janela recente de trechos da sessão atual (recentChunks).
 * 3. ANAMNESIS: informações de base do paciente (patients.anamnesis).
 * 4. PATIENT_MEMORY: resumo consolidado de sessões anteriores (patient_memory).
 * 5. RELEVANT_HISTORY: evidências específicas de sessões anteriores pertinentes ao contexto recente.
 */
export async function buildCopilotContext(
  params: BuildCopilotContextParams,
): Promise<CopilotContext> {
  const {
    sessionId,
    therapistId,
    windowSize = DEFAULT_RECENT_CHUNKS_WINDOW,
    includeHistoricalSnippets = true,
  } = params;

  const supabase = createSupabaseAdminClient();

  // 1. Buscar sessão e dados do paciente com isolamento estrito de therapist_id
  const sessionQuery = await supabase
    .from("sessions")
    .select("id, patient_id, therapist_id, patients (id, name, anamnesis, therapist_id)")
    .eq("id", sessionId)
    .eq("therapist_id", therapistId)
    .maybeSingle();

  if (sessionQuery.error || !sessionQuery.data) {
    console.error("[buildCopilotContext] Sessão não encontrada ou não autorizada:", sessionQuery.error?.message);
    return {
      sessionId,
      therapistId,
      recentChunks: [],
      totalChunksCount: 0,
      relevantHistory: [],
    };
  }

  const patientRaw = sessionQuery.data.patients as
    | { id?: string; name?: string; anamnesis?: string | null; therapist_id?: string }
    | { id?: string; name?: string; anamnesis?: string | null; therapist_id?: string }[]
    | null;

  const patientObj = Array.isArray(patientRaw) ? patientRaw[0] : patientRaw;

  let patientProfile: CopilotPatientProfile | undefined;
  if (patientObj?.id && patientObj.name) {
    // Isolamento estrito de segurança: verificar se o paciente pertence ao therapist_id
    if (patientObj.therapist_id && patientObj.therapist_id !== therapistId) {
      console.warn("[buildCopilotContext] Tentativa de acesso a paciente de outro terapeuta bloqueada.");
    } else {
      // 2. Buscar memória clínica consolidada via helper existente
      const memoryRow = await getPatientMemory({
        patientId: patientObj.id,
        therapistId,
      });

      patientProfile = {
        id: patientObj.id,
        name: patientObj.name,
        anamnesis: patientObj.anamnesis ?? null,
        memorySummary: memoryRow?.summary ?? null,
      };
    }
  }

  // 3. Obter trechos da transcrição da sessão atual
  let allChunks: CopilotTranscriptSnippet[] = [];

  if (params.providedChunks && params.providedChunks.length > 0) {
    allChunks = params.providedChunks;
  } else {
    const chunksQuery = await supabase
      .from("transcript_chunks")
      .select("id, speaker, text, t_start_seconds, t_end_seconds, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (!chunksQuery.error && chunksQuery.data) {
      allChunks = chunksQuery.data.map((row) => ({
        id: row.id,
        speaker: row.speaker,
        text: row.text,
        tStartSeconds: row.t_start_seconds,
        tEndSeconds: row.t_end_seconds,
      }));
    }
  }

  // Extrai a janela recente da sessão atual (RECENT_WINDOW)
  const recentChunks = allChunks.slice(-windowSize);

  // 4. Buscar RELEVANT_HISTORY se houver paciente e trechos recentes com termos temáticos
  let relevantHistory: CopilotHistoricalSnippet[] = [];

  if (
    includeHistoricalSnippets &&
    patientProfile?.id &&
    recentChunks.length > 0
  ) {
    relevantHistory = await fetchRelevantHistoricalSnippets({
      patientId: patientProfile.id,
      therapistId,
      currentSessionId: sessionId,
      recentChunks,
    });
  }

  return {
    sessionId,
    therapistId,
    patient: patientProfile,
    recentChunks,
    totalChunksCount: allChunks.length,
    relevantHistory,
  };
}

/**
 * Busca de forma altamente seletiva trechos de sessões anteriores do MESMO paciente e terapeuta
 * que compartilhem correspondência contextual real (mínimo de 2 termos substantivos).
 */
async function fetchRelevantHistoricalSnippets(params: {
  patientId: string;
  therapistId: string;
  currentSessionId: string;
  recentChunks: CopilotTranscriptSnippet[];
}): Promise<CopilotHistoricalSnippet[]> {
  const { patientId, therapistId, currentSessionId, recentChunks } = params;
  const supabase = createSupabaseAdminClient();

  // 1. Extrair termos temáticos da janela recente da sessão atual
  const currentText = recentChunks.map((c) => c.text).join(" ");
  const currentKeywords = Array.from(new Set(extractKeywords(currentText)));

  if (currentKeywords.length < 2) {
    return [];
  }

  // 2. Buscar sessões anteriores do mesmo paciente e mesmo terapeuta (excluindo a sessão atual)
  const pastSessionsQuery = await supabase
    .from("sessions")
    .select("id, created_at")
    .eq("patient_id", patientId)
    .eq("therapist_id", therapistId)
    .neq("id", currentSessionId)
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORICAL_SESSIONS_SEARCH);

  if (pastSessionsQuery.error || !pastSessionsQuery.data || pastSessionsQuery.data.length === 0) {
    return [];
  }

  const pastSessionIds = pastSessionsQuery.data.map((s) => s.id);
  const sessionDateMap = new Map(pastSessionsQuery.data.map((s) => [s.id, s.created_at]));

  // 3. Buscar chunks das sessões anteriores
  const pastChunksQuery = await supabase
    .from("transcript_chunks")
    .select("id, session_id, speaker, text, created_at")
    .in("session_id", pastSessionIds)
    .order("created_at", { ascending: false })
    .limit(30);

  if (pastChunksQuery.error || !pastChunksQuery.data) {
    return [];
  }

  // 4. Filtrar por correspondência contextual real (mínimo de 2 termos compartilhados)
  const matches: CopilotHistoricalSnippet[] = [];

  for (const chunk of pastChunksQuery.data) {
    const pastKeywords = extractKeywords(chunk.text);
    const sharedKeywords = currentKeywords.filter((kw) => pastKeywords.includes(kw));

    if (sharedKeywords.length >= 2) {
      matches.push({
        sessionId: chunk.session_id,
        chunkId: chunk.id,
        speaker: chunk.speaker,
        text: chunk.text,
        matchedKeywords: sharedKeywords,
        sessionDate: sessionDateMap.get(chunk.session_id) ?? undefined,
      });

      if (matches.length >= MAX_HISTORICAL_CHUNKS_RETURNED) {
        break;
      }
    }
  }

  return matches;
}
