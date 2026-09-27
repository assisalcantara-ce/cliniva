import { z } from "zod";

/**
 * Tipos de eventos acionáveis do Copilot 2.0 durante e após a sessão.
 */
export const CopilotEventTypeEnum = z.enum([
  "RECORRENCIA",
  "EXPLORAR",
  "CONEXAO",
  "ACOMPANHAR",
  "NOTA",
  "POTENTIAL_RISK",
]);

export type CopilotEventType = z.infer<typeof CopilotEventTypeEnum>;

/**
 * Nível de urgência/relevância de um evento.
 */
export type CopilotEventUrgency = "low" | "medium" | "high";

/**
 * Trecho de transcrição estruturado consumido pelo Copilot.
 */
export interface CopilotTranscriptSnippet {
  id: string;
  speaker?: string | null;
  text: string;
  tStartSeconds?: number | null;
  tEndSeconds?: number | null;
}

/**
 * Metadados e perfil do paciente contextualizado para o Copilot.
 */
export interface CopilotPatientProfile {
  id: string;
  name: string;
  anamnesis?: string | null;
  memorySummary?: string | null;
}

/**
 * Registro de histórico relevante de sessões anteriores selecionado pelo ContextEngine.
 */
export interface CopilotHistoricalSnippet {
  sessionId: string;
  chunkId: string;
  speaker?: string | null;
  text: string;
  matchedKeywords: string[];
  sessionDate?: string;
}

/**
 * Contexto estruturado completo montado pelo ContextEngine distinguindo claramente as 5 camadas:
 * 1. CURRENT_SESSION: metadados e contagem total da sessão atual.
 * 2. RECENT_WINDOW: janela recente de trechos da sessão atual (recentChunks).
 * 3. ANAMNESIS: informações de base do paciente.
 * 4. PATIENT_MEMORY: resumo longitudinal consolidado de sessões anteriores.
 * 5. RELEVANT_HISTORY: evidências específicas de sessões anteriores pertinentes ao contexto atual.
 */
export interface CopilotContext {
  sessionId: string;
  therapistId: string;
  patient?: CopilotPatientProfile;
  /** Janela recente de trechos da sessão atual */
  recentChunks: CopilotTranscriptSnippet[];
  /** Total de trechos já registrados na sessão atual */
  totalChunksCount: number;
  /** Evidências selecionadas de sessões anteriores do mesmo paciente */
  relevantHistory?: CopilotHistoricalSnippet[];
  /** Contexto opcional de materiais clínicos (RAG) */
  materialsContext?: string;
}

/**
 * Evento individual acionável gerado pelo Copilot.
 */
export interface CopilotEvent {
  id: string;
  type: CopilotEventType;
  title: string;
  description: string;
  urgency: CopilotEventUrgency;
  /** Justificativa clínica breve e não diagnóstica */
  rationale?: string;
  /** Ação sugerida ao terapeuta (ex: pergunta ou ponto de atenção) */
  suggestedAction?: string;
  /** Evidência ou citação que fundamenta o evento */
  evidence?: {
    chunkId?: string;
    sessionId?: string;
    quote: string;
  };
  createdAt: string;
}

/**
 * Schema Zod para validação da saída gerada pelo LLM no CopilotEngine.
 */
export const copilotEventSchema = z.object({
  type: CopilotEventTypeEnum,
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(300),
  urgency: z.enum(["low", "medium", "high"]).default("medium"),
  rationale: z.string().trim().min(1).max(250).optional(),
  suggestedAction: z.string().trim().min(1).max(250).optional(),
  evidenceQuote: z.string().trim().min(1).max(200).optional(),
  evidenceChunkId: z.string().trim().min(1).optional(),
});

export const copilotEventsOutputSchema = z.object({
  events: z.array(copilotEventSchema).max(5),
});

export type CopilotEventsOutput = z.infer<typeof copilotEventsOutputSchema>;
