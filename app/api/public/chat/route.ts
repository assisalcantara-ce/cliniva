import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolvePublicTherapist } from "@/lib/publicTherapist";
import { applyCors, handleOptionsCors } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rateLimit";
import { publicChatMessageSchema } from "@/lib/schemas/chat";
import { getOpenAIKeyForTherapist } from "@/lib/ai/chatClient";
import { generateSessionToken } from "@/lib/ai/chatToken";
import { openaiPostJson } from "@/lib/ai/openai";
import { CHAT_TOOLS } from "@/lib/ai/chatTools";
import { buildUniversalChatSystemPrompt } from "@/lib/ai/chatPrompts";
import { fetchTherapistAvailableSlots } from "@/lib/ai/slotsService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface OpenAIChatResponse {
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: string;
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function OPTIONS(req: NextRequest) {
  return handleOptionsCors(req);
}

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting por IP (30 mensagens por minuto por IP)
    const clientIp =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "127.0.0.1";

    const rate = checkRateLimit(`chat:${clientIp}`, {
      limit: 30,
      windowMs: 60_000,
    });

    if (!rate.allowed) {
      const response = NextResponse.json(
        { error: "Muitas mensagens. Por favor, aguarde alguns instantes." },
        { status: 429 }
      );
      response.headers.set("Retry-After", String(Math.ceil(rate.resetInMs / 1000)));
      return applyCors(response, req);
    }

    // 2. Validação de Payload com Zod
    const body = await req.json().catch(() => ({}));
    const parseResult = publicChatMessageSchema.safeParse(body);
    if (!parseResult.success) {
      const response = NextResponse.json(
        { error: "Dados inválidos.", details: parseResult.error.flatten() },
        { status: 400 }
      );
      return applyCors(response, req);
    }

    const { slug, sessionId: reqSessionId, message } = parseResult.data;

    // 3. Resolução Segura e Dinâmica do Terapeuta
    const therapist = await resolvePublicTherapist(slug);
    if (!therapist || !therapist.isActive || !therapist.publicBookingEnabled) {
      const response = NextResponse.json(
        { error: "Terapeuta não encontrado ou indisponível para agendamento online." },
        { status: 404 }
      );
      return applyCors(response, req);
    }

    const supabase = createSupabaseAdminClient();

    // 4. Hash do IP para conformidade com LGPD
    const ipHash = createHash("sha256")
      .update(`${clientIp}-${new Date().toISOString().slice(0, 10)}`)
      .digest("hex");

    // 5. Recuperação ou Criação da Sessão de Chat no Supabase
    let session: any = null;
    if (reqSessionId) {
      const { data: existingSession } = await supabase
        .from("landing_chat_sessions")
        .select("*")
        .eq("id", reqSessionId)
        .eq("therapist_id", therapist.id)
        .maybeSingle();

      if (existingSession) {
        if (existingSession.status !== "active") {
          const response = NextResponse.json(
            { error: "Esta sessão foi concluída ou expirou. Por favor, inicie uma nova conversa." },
            { status: 410 }
          );
          return applyCors(response, req);
        }
        if (existingSession.message_count >= existingSession.max_messages) {
          const response = NextResponse.json(
            {
              error:
                "Limite de mensagens da sessão atingido. Por favor, entre em contato diretamente pelo WhatsApp para finalizar seu atendimento.",
            },
            { status: 429 }
          );
          return applyCors(response, req);
        }
        session = existingSession;
      }
    }

    if (!session) {
      const { data: newSession, error: createSessionError } = await supabase
        .from("landing_chat_sessions")
        .insert({
          therapist_id: therapist.id,
          ip_hash: ipHash,
          messages: [],
          metadata: { client: "web-landing", slug: therapist.slug },
        })
        .select()
        .single();

      if (createSessionError || !newSession) {
        const response = NextResponse.json(
          { error: "Não foi possível iniciar a sessão de chat." },
          { status: 500 }
        );
        return applyCors(response, req);
      }
      session = newSession;
    }

    // 6. Verificação Preventiva de Cota de IA antes de invocar OpenAI
    const currentMonthUtc = new Date().toISOString().slice(0, 7);
    const { data: usageData } = await supabase
      .from("therapist_chat_usage")
      .select("total_tokens, monthly_token_budget, is_budget_exceeded")
      .eq("therapist_id", therapist.id)
      .eq("billing_month", currentMonthUtc)
      .maybeSingle();

    if (usageData && (usageData.is_budget_exceeded || usageData.total_tokens >= usageData.monthly_token_budget)) {
      const response = NextResponse.json(
        {
          error:
            "O assistente virtual está temporariamente indisponível no momento. Por favor, utilize o agendamento direto na página.",
        },
        { status: 503 }
      );
      return applyCors(response, req);
    }

    // 7. Obtenção da Chave OpenAI por Tenant
    let therapistKeyConfig;
    try {
      therapistKeyConfig = await getOpenAIKeyForTherapist(therapist.id);
    } catch (clientErr: any) {
      const response = NextResponse.json(
        { error: "Serviço de atendimento temporariamente indisponível." },
        { status: 503 }
      );
      return applyCors(response, req);
    }

    // 8. Preparação das Mensagens
    const rawMessages: any[] = Array.isArray(session.messages) ? session.messages : [];
    
    // Adiciona a nova mensagem do usuário
    const userTimestamp = new Date().toISOString();
    rawMessages.push({
      role: "user",
      content: message,
      timestamp: userTimestamp,
    });

    // Formata data e hora de referência de Brasília
    const nowBrasilia = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date());

    const systemPrompt = buildUniversalChatSystemPrompt(
      { displayName: therapist.displayName, slug: therapist.slug },
      nowBrasilia
    );

    const openaiMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...rawMessages.map((m: any) => ({
        role: m.role,
        content: m.content || "",
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
        ...(m.name ? { name: m.name } : {}),
      })),
    ];

    // 9. Primeira Chamada ao OpenAI via HTTP helper nativo
    let completion = await openaiPostJson<OpenAIChatResponse>({
      path: "/chat/completions",
      apiKey: therapistKeyConfig.apiKey,
      body: {
        model: "gpt-4o-mini",
        messages: openaiMessages,
        tools: CHAT_TOOLS,
        tool_choice: "auto",
        temperature: 0.4,
      },
    });

    let choice = completion.choices[0];
    let assistantMsg = choice.message;
    let proposedData: any = null;

    // 10. Processamento de Tool Calls (se houver)
    if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
      openaiMessages.push(assistantMsg);

      for (const toolCall of assistantMsg.tool_calls) {
        if (toolCall.type === "function") {
          const fnName = toolCall.function.name;
          const fnArgs = JSON.parse(toolCall.function.arguments || "{}");
          let toolResultStr = "";

          if (fnName === "consultar_horarios") {
            try {
              const startDate = fnArgs.data_inicio;
              const endDate = fnArgs.data_fim;
              const slots = await fetchTherapistAvailableSlots(therapist.id, {
                startDate,
                endDate,
              });
              toolResultStr = JSON.stringify({
                status: "success",
                slots_disponiveis: slots,
                total_slots: slots.length,
              });
            } catch (err: any) {
              toolResultStr = JSON.stringify({
                status: "error",
                message: err.message || "Erro ao consultar horários na agenda.",
              });
            }
          } else if (fnName === "propor_agendamento") {
            try {
              const { data: proposal, error: propErr } = await supabase
                .from("landing_chat_proposals")
                .insert({
                  session_id: session.id,
                  therapist_id: therapist.id,
                  scheduled_start: fnArgs.data_horario_inicio,
                  scheduled_end: fnArgs.data_horario_fim,
                  patient_name: fnArgs.nome_paciente,
                  patient_whatsapp: fnArgs.whatsapp,
                  patient_notes: fnArgs.observacoes || null,
                  status: "proposed",
                })
                .select()
                .single();

              if (propErr || !proposal) {
                throw new Error("Erro ao gravar proposta temporária no servidor.");
              }

              proposedData = {
                proposalId: proposal.id,
                fullName: fnArgs.nome_paciente,
                whatsapp: fnArgs.whatsapp,
                scheduledStart: fnArgs.data_horario_inicio,
                scheduledEnd: fnArgs.data_horario_fim,
                notes: fnArgs.observacoes,
                expiresAt: proposal.expires_at,
              };

              toolResultStr = JSON.stringify({
                status: "proposed",
                proposal_id: proposal.id,
                message:
                  "Proposta gerada com sucesso na tela do usuário. Oriente o paciente a revisar os dados, aceitar os termos de consentimento e clicar em 'Confirmar Agendamento'.",
              });
            } catch (err: any) {
              toolResultStr = JSON.stringify({
                status: "error",
                message: err.message || "Falha ao registrar proposta de agendamento.",
              });
            }
          }

          openaiMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: toolResultStr,
          });
        }
      }

      // Segunda chamada com as respostas das ferramentas
      const secondCompletion = await openaiPostJson<OpenAIChatResponse>({
        path: "/chat/completions",
        apiKey: therapistKeyConfig.apiKey,
        body: {
          model: "gpt-4o-mini",
          messages: openaiMessages,
          temperature: 0.4,
        },
      });

      choice = secondCompletion.choices[0];
      assistantMsg = choice.message;

      // Soma tokens consumidos
      if (secondCompletion.usage) {
        if (completion.usage) {
          completion.usage.prompt_tokens += secondCompletion.usage.prompt_tokens;
          completion.usage.completion_tokens += secondCompletion.usage.completion_tokens;
          completion.usage.total_tokens += secondCompletion.usage.total_tokens;
        } else {
          completion.usage = secondCompletion.usage;
        }
      }
    }

    // 11. Atualização Atômica de Consumo de IA por Tenant
    if (completion.usage) {
      try {
        await supabase.rpc("record_therapist_chat_turn", {
          p_therapist_id: therapist.id,
          p_prompt_tokens: completion.usage.prompt_tokens,
          p_completion_tokens: completion.usage.completion_tokens,
        });
      } catch (usageErr: any) {
        console.error("[POST /api/public/chat] Alerta de consumo de cota:", usageErr);
      }
    }

    // 12. Persistência do Turno na Sessão
    const finalAssistantText = assistantMsg.content || "";
    rawMessages.push({
      role: "assistant",
      content: finalAssistantText,
      timestamp: new Date().toISOString(),
      ...(proposedData ? { proposal: proposedData } : {}),
    });

    await supabase
      .from("landing_chat_sessions")
      .update({
        messages: rawMessages,
        message_count: session.message_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    // 13. Retorno Limpo para o Widget com Credencial Assinada
    const response = NextResponse.json(
      {
        sessionId: session.id,
        sessionToken: generateSessionToken(session.id),
        message: finalAssistantText,
        proposal: proposedData,
        remainingMessages: Math.max(0, session.max_messages - (session.message_count + 1)),
      },
      { status: 200 }
    );

    return applyCors(response, req);
  } catch (error: any) {
    console.error("[POST /api/public/chat] Erro:", error);
    const response = NextResponse.json(
      { error: "Ocorreu um erro ao processar sua mensagem." },
      { status: 500 }
    );
    return applyCors(response, req);
  }
}
