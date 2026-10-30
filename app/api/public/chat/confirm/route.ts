import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolvePublicTherapist } from "@/lib/publicTherapist";
import { applyCors, handleOptionsCors } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rateLimit";
import { publicChatConfirmAppointmentSchema } from "@/lib/schemas/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest) {
  return handleOptionsCors(req);
}

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting por IP para impedir brute-force em confirmação
    const clientIp =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "127.0.0.1";

    const rate = checkRateLimit(`chat_confirm:${clientIp}`, {
      limit: 10,
      windowMs: 60_000,
    });

    if (!rate.allowed) {
      const response = NextResponse.json(
        { error: "Muitas tentativas de confirmação. Por favor, aguarde um minuto." },
        { status: 429 }
      );
      response.headers.set("Retry-After", String(Math.ceil(rate.resetInMs / 1000)));
      return applyCors(response, req);
    }

    // 2. Validação Estrita do Payload Zod (exige consentimento explícito LGPD)
    const body = await req.json().catch(() => ({}));
    const parseResult = publicChatConfirmAppointmentSchema.safeParse(body);
    if (!parseResult.success) {
      const response = NextResponse.json(
        {
          error: "Dados de confirmação inválidos ou incompletos.",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
      return applyCors(response, req);
    }

    const {
      slug,
      sessionId,
      proposalId,
      scheduledStart,
      scheduledEnd,
      fullName,
      whatsapp,
      notes,
      idempotencyKey,
      consent,
    } = parseResult.data;

    // 3. Resolução Segura do Terapeuta
    const therapist = await resolvePublicTherapist(slug);
    if (!therapist || !therapist.isActive || !therapist.publicBookingEnabled) {
      const response = NextResponse.json(
        { error: "Terapeuta não encontrado ou indisponível para agendamento." },
        { status: 404 }
      );
      return applyCors(response, req);
    }

    const supabase = createSupabaseAdminClient();

    // 4. Se proposalId não foi fornecido diretamente, busca a proposta ativa vinculada à sessão
    let targetProposalId = proposalId;
    if (!targetProposalId) {
      const { data: activeProp } = await supabase
        .from("landing_chat_proposals")
        .select("id")
        .eq("session_id", sessionId)
        .eq("therapist_id", therapist.id)
        .eq("status", "proposed")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!activeProp) {
        const response = NextResponse.json(
          {
            error:
              "Nenhuma proposta válida encontrada para esta sessão ou ela expirou. Solicite um novo horário no chat.",
          },
          { status: 410 }
        );
        return applyCors(response, req);
      }
      targetProposalId = activeProp.id;
    }

    // 5. Cálculo Canônico do Hash SHA-256 do Payload (Padrão Migration 026)
    const canonicalPayload = JSON.stringify({
      therapist_id: therapist.id,
      proposal_id: targetProposalId,
      full_name: fullName.trim(),
      whatsapp: whatsapp.replace(/\D/g, ""),
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      consent_version: consent.version,
    });
    const payloadHash = createHash("sha256").update(canonicalPayload).digest("hex");

    // 6. Chamada Transacional à RPC confirm_landing_chat_proposal (Migration 027 -> 026)
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "confirm_landing_chat_proposal",
      {
        p_proposal_id: targetProposalId,
        p_therapist_id: therapist.id,
        p_idempotency_key: idempotencyKey,
        p_payload_hash: payloadHash,
        p_full_name: fullName.trim(),
        p_whatsapp: whatsapp.trim(),
        p_notes: notes || "Agendamento confirmado via Chat Universal Cliniva",
      }
    );

    if (rpcError) {
      console.error("[POST /api/public/chat/confirm] Erro na RPC:", rpcError);

      if (rpcError.message.includes("PROPOSAL_NOT_FOUND")) {
        const response = NextResponse.json(
          { error: "Proposta de agendamento não localizada." },
          { status: 404 }
        );
        return applyCors(response, req);
      }

      if (rpcError.message.includes("PROPOSAL_EXPIRED")) {
        const response = NextResponse.json(
          { error: "Esta proposta de horário expirou. Por favor, escolha outro horário no chat." },
          { status: 410 }
        );
        return applyCors(response, req);
      }

      if (rpcError.message.includes("PROPOSAL_ALREADY_CONFIRMED")) {
        const response = NextResponse.json(
          { error: "Esta proposta já foi confirmada anteriormente com outra solicitação." },
          { status: 409 }
        );
        return applyCors(response, req);
      }

      if (rpcError.message.includes("SLOT_OVERLAPPING_CONFLICT") || rpcError.message.includes("exclude_appointments")) {
        const response = NextResponse.json(
          {
            error:
              "Este horário acabou de ser reservado por outro paciente. Por favor, consulte novos horários no chat.",
          },
          { status: 409 }
        );
        return applyCors(response, req);
      }

      const response = NextResponse.json(
        { error: "Não foi possível confirmar o agendamento no momento." },
        { status: 500 }
      );
      return applyCors(response, req);
    }

    // 7. Retorno Seguro e Padronizado
    const response = NextResponse.json(
      {
        success: true,
        status: "requested",
        appointmentId: rpcResult.appointment_id,
        message:
          "Solicitação de agendamento enviada com sucesso! Nossa equipe entrará em contato para confirmação final.",
      },
      { status: 201 }
    );

    return applyCors(response, req);
  } catch (error: any) {
    console.error("[POST /api/public/chat/confirm] Erro inesperado:", error);
    const response = NextResponse.json(
      { error: "Erro interno ao processar a confirmação do agendamento." },
      { status: 500 }
    );
    return applyCors(response, req);
  }
}
