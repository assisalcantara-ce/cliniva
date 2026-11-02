import { RealtimeGatewayServer } from "./server";
import { RealtimePipelineOrchestrator } from "./pipelineOrchestrator";
import { sttRegistry } from "../../lib/stt/registry";
import { realtimeEventBroker } from "../../lib/copilot/realtime/broker";
import { getTherapistEntitlements } from "../../lib/plans/entitlements";

const port = Number(process.env.GATEWAY_PORT || 8080);
const host = process.env.GATEWAY_HOST || "0.0.0.0";
const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);

const sttProvider = hasOpenAI
  ? sttRegistry.getProvider("openai")
  : sttRegistry.getProvider("mock");

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

async function main() {
  await gateway.start();
  console.log(
    `[RealtimeGateway] Running on ws://${host}:${port}/ws/audio (STT: ${
      hasOpenAI ? "openai" : "mock"
    })`
  );
}

main().catch((err) => {
  console.error("[RealtimeGateway] Startup error:", err);
  process.exit(1);
});
