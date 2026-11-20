import { RealtimeGatewayServer } from "./server";
import { RealtimePipelineOrchestrator } from "./pipelineOrchestrator";
import { sttRegistry } from "../../lib/stt/registry";
import { realtimeEventBroker } from "../../lib/copilot/realtime/broker";
import { getTherapistEntitlements } from "../../lib/plans/entitlements";
import { createSupabaseAdminClient } from "../../lib/supabase/admin";

const port = Number(process.env.GATEWAY_PORT || 8080);
const host = process.env.GATEWAY_HOST || "0.0.0.0";

// Utiliza o provedor real OpenAI Whisper STT por padrão (ele resolve dinamicamente a chave BYOK do terapeuta ou a corporativa)
// Fallback para mock apenas se explicitamente solicitado em ambiente de teste via STT_FORCE_MOCK=true
const sttProvider =
  process.env.STT_FORCE_MOCK === "true"
    ? sttRegistry.getProvider("mock")
    : sttRegistry.getProvider("openai");

const gateway = new RealtimeGatewayServer({
  port,
  host,
  path: "/ws/audio",
  authorizeEntitlement: async (therapistId: string) => {
    try {
      const entitlement = await getTherapistEntitlements(therapistId);
      if (!entitlement.canUseFeature("realtime_audio_stt")) {
        return {
          allowed: false,
          reason: "Acesso negado: a transcrição de áudio em tempo real é exclusiva dos planos Premium e Profissional.",
        };
      }
      return { allowed: true };
    } catch {
      return { allowed: false, reason: "Falha ao validar direitos da assinatura." };
    }
  },
});

const orchestrator = new RealtimePipelineOrchestrator({
  sttProvider,
  eventBroker: realtimeEventBroker,
});

orchestrator.attachToGateway(gateway);

// Conecta o pipeline para retransmitir transcrições e erros diretamente via WebSocket para o cliente ativo
// e persisti-los de forma idempotente em transcript_chunks
orchestrator.onOutput(async (ev) => {
  if (ev.type === "transcript_ready" && ev.chunkId && ev.text) {
    // 1. Envia via WebSocket diretamente
    gateway.sendToSession(ev.sessionId, {
      type: "transcript_final",
      sessionId: ev.sessionId,
      therapistId: ev.therapistId,
      chunkId: ev.chunkId,
      text: ev.text,
      speaker: ev.speaker,
      sequenceNumber: ev.sequenceNumber,
      timestamp: Date.now(),
    });

    // 2. Persistência idempotente no banco Supabase
    try {
      const supabase = createSupabaseAdminClient();
      await supabase.from("transcript_chunks").upsert(
        {
          id: ev.chunkId,
          session_id: ev.sessionId,
          text: ev.text,
          speaker: ev.speaker ?? null,
        },
        { onConflict: "id" }
      );
    } catch (dbErr) {
      console.error("[RealtimeGateway] Erro ao persistir transcript_chunk:", dbErr);
    }
  } else if (ev.type === "pipeline_error" && ev.error) {
    gateway.sendToSession(ev.sessionId, {
      type: "transport_error",
      sessionId: ev.sessionId,
      therapistId: ev.therapistId,
      code: ev.errorCode ?? "PIPELINE_ERROR",
      message: ev.error,
      timestamp: Date.now(),
    });
  }
});

async function main() {
  await gateway.start();
  console.log(
    `[RealtimeGateway] Running on ws://${host}:${port}/ws/audio (STT: ${sttProvider.id})`
  );
}

main().catch((err) => {
  console.error("[RealtimeGateway] Startup error:", err);
  process.exit(1);
});
