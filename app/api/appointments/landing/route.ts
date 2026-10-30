import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

import { buildSlotRange } from "@/lib/db/appointments";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolvePublicTherapist } from "@/lib/publicTherapist";
import { applyCors, handleOptionsCors } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rateLimit";
import { landingSchema } from "@/lib/schemas/landingAppointment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest) {
  return handleOptionsCors(req);
}

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting por IP (Máximo de 5 submissões a cada 5 minutos)
    const clientIp =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown-ip";

    const rate = checkRateLimit(`landing-post:${clientIp}`, {
      limit: 5,
      windowMs: 5 * 60_000,
    });

    if (!rate.allowed) {
      const response = NextResponse.json(
        { error: "Limite de agendamentos excedido temporariamente. Tente novamente em alguns minutos." },
        { status: 429 },
      );
      response.headers.set("Retry-After", String(Math.ceil(rate.resetInMs / 1000)));
      return applyCors(response, req);
    }

    const body = await req.json();
    const parsed = landingSchema.safeParse(body);

    if (!parsed.success) {
      const response = NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 },
      );
      return applyCors(response, req);
    }

    // 2. Resolução estrita do terapeuta autorizado via whitelist
    const therapistIdentifier = parsed.data.therapist || "dra-cristiane";
    const resolved = await resolvePublicTherapist(therapistIdentifier);

    if (!resolved) {
      const response = NextResponse.json(
        { error: "Terapeuta não encontrado ou indisponível" },
        { status: 404 },
      );
      return applyCors(response, req);
    }

    const therapistId = resolved.id;
    const supabase = createSupabaseAdminClient();

    // 3. Montagem do intervalo de tempo no fuso oficial America/Sao_Paulo
    const { start, end } = buildSlotRange({
      date: parsed.data.date,
      time: parsed.data.time,
      timezone: "America/Sao_Paulo",
    });

    if (start.getTime() <= Date.now()) {
      const response = NextResponse.json(
        { error: "Não é permitido agendar em datas ou horários passados" },
        { status: 400 },
      );
      return applyCors(response, req);
    }

    // 4. Preparação do hash canônico SHA-256 do payload do agendamento
    // Garante que a mesma idempotency_key não possa ser reutilizada com dados diferentes
    const canonicalPayloadString = JSON.stringify({
      therapist: therapistIdentifier,
      full_name: parsed.data.full_name,
      notes: parsed.data.notes ?? "",
      date: parsed.data.date,
      time: parsed.data.time,
      consent_purpose: parsed.data.consent.purpose,
      consent_version: parsed.data.consent.notice_version,
      anamnesis_personal: parsed.data.anamnesis?.personal ?? null,
    });

    const payloadHash = createHash("sha256").update(canonicalPayloadString).digest("hex");

    const personal = parsed.data.anamnesis?.personal;
    const enrichedAnamnesisPayload = parsed.data.anamnesis
      ? {
          ...parsed.data.anamnesis,
          consent: parsed.data.consent,
        }
      : {
          consent: parsed.data.consent,
        };

    // 5. Execução Estrita e Exclusiva via RPC PostgreSQL Atômica
    // Se a RPC estiver ausente ou ocorrer erro de schema, NENHUM dado é inserido.
    const { data: atomicData, error: rpcError } = await supabase.rpc(
      "create_landing_appointment_atomic",
      {
        p_therapist_id: therapistId,
        p_idempotency_key: parsed.data.idempotency_key,
        p_payload_hash: payloadHash,
        p_full_name: parsed.data.full_name,
        p_notes: parsed.data.notes ?? null,
        p_scheduled_start: start.toISOString(),
        p_scheduled_end: end.toISOString(),
        p_anamnesis_payload: enrichedAnamnesisPayload,
        p_personal_cpf: personal?.cpf ?? null,
        p_personal_email: personal?.email ?? null,
        p_personal_celular: personal?.celular ?? null,
        p_personal_birth_date: personal?.birth_date ?? null,
      },
    );

    if (rpcError) {
      // Conflito de concorrência ou slot já reservado (captura exclusion constraint e check)
      if (
        rpcError.code === "23505" ||
        rpcError.code === "23P01" ||
        rpcError.message?.includes("SLOT_ALREADY_BOOKED") ||
        rpcError.message?.includes("exclude_appointments_overlapping_active_slots")
      ) {
        const response = NextResponse.json(
          { error: "Horario ja reservado por outro paciente" },
          { status: 409 },
        );
        return applyCors(response, req);
      }

      // Reutilização da mesma chave de idempotência com dados modificados
      if (rpcError.message?.includes("IDEMPOTENCY_PAYLOAD_MISMATCH")) {
        const response = NextResponse.json(
          { error: "Chave de requisicao ja utilizada para outros dados de agendamento." },
          { status: 422 },
        );
        return applyCors(response, req);
      }

      // Regras de agenda, bloqueio ou data passada
      if (
        rpcError.message?.includes("SLOT_OUTSIDE_THERAPIST_RULES") ||
        rpcError.message?.includes("SLOT_BLOCKED_BY_THERAPIST") ||
        rpcError.message?.includes("CANNOT_BOOK_PAST_SLOT")
      ) {
        const response = NextResponse.json(
          { error: "Horario indisponivel na agenda do profissional" },
          { status: 400 },
        );
        return applyCors(response, req);
      }

      // RPC ausente no banco remoto (PGRST202: Could not find function in schema cache)
      if (
        rpcError.code === "PGRST202" ||
        (rpcError.message?.includes("function") && rpcError.message?.includes("not found"))
      ) {
        const response = NextResponse.json(
          {
            error: "Servico de agendamento em atualizacao de seguranca. Tente novamente em instantes.",
            code: "RPC_MIGRATION_PENDING",
          },
          { status: 503 },
        );
        return applyCors(response, req);
      }

      // Falha segura
      const response = NextResponse.json(
        { error: "Falha na transacao de agendamento. Nao foram inseridos registros parciais." },
        { status: 500 },
      );
      return applyCors(response, req);
    }

    // 6. Resposta Higienizada de Sucesso (Status 200 se replay idempotente, 201 se nova criação)
    const httpStatus = atomicData?.is_idempotent_replay ? 200 : 201;
    const response = NextResponse.json(
      {
        message: atomicData?.is_idempotent_replay
          ? "Solicitacao de agendamento recuperada (retentativa idempotente)"
          : "Solicitacao de agendamento registrada com sucesso",
        patient: {
          id: atomicData.patient_id,
          full_name: atomicData.full_name,
        },
        appointment: {
          id: atomicData.appointment_id,
          status: atomicData.status,
          scheduled_start: atomicData.scheduled_start,
          scheduled_end: atomicData.scheduled_end,
        },
      },
      { status: httpStatus },
    );
    return applyCors(response, req);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const response = NextResponse.json({ error: message }, { status: 500 });
    return applyCors(response, req);
  }
}
