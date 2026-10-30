import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  generateSlots,
  type AppointmentRow,
  type AvailabilityBlock,
  type AvailabilityRule,
} from "@/lib/db/appointments";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolvePublicTherapist } from "@/lib/publicTherapist";
import { applyCors, handleOptionsCors } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  therapist: z
    .string()
    .trim()
    .min(1, "Identificador do terapeuta é obrigatório"),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "start_date deve estar no formato YYYY-MM-DD"),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "end_date deve estar no formato YYYY-MM-DD"),
});

export async function OPTIONS(req: NextRequest) {
  return handleOptionsCors(req);
}

export async function GET(req: NextRequest) {
  try {
    // 1. Rate Limiting por IP (60 consultas por minuto por IP)
    const clientIp =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown-ip";

    const rate = checkRateLimit(`slots:${clientIp}`, {
      limit: 60,
      windowMs: 60_000,
    });

    if (!rate.allowed) {
      const response = NextResponse.json(
        { error: "Muitas requisições. Tente novamente em instantes." },
        { status: 429 },
      );
      response.headers.set("Retry-After", String(Math.ceil(rate.resetInMs / 1000)));
      return applyCors(response, req);
    }

    const url = new URL(req.url);
    const parsedQuery = querySchema.safeParse({
      therapist: url.searchParams.get("therapist"),
      start_date: url.searchParams.get("start_date"),
      end_date: url.searchParams.get("end_date"),
    });

    if (!parsedQuery.success) {
      const response = NextResponse.json(
        {
          error: "Parâmetros inválidos",
          details: parsedQuery.error.flatten(),
        },
        { status: 400 },
      );
      return applyCors(response, req);
    }

    const { therapist: therapistIdentifier, start_date: startDate, end_date: endDate } = parsedQuery.data;

    // Proteção contra intervalos excessivos (máximo 60 dias por consulta)
    const diffDays = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays < 0 || diffDays > 60) {
      const response = NextResponse.json(
        { error: "Intervalo de datas inválido (máximo de 60 dias por consulta)" },
        { status: 400 },
      );
      return applyCors(response, req);
    }

    // Resolução explícita e segura do tenant/terapeuta com whitelist
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

    // 1. Busca regras de disponibilidade ativas do terapeuta
    const { data: rules, error: rulesError } = await supabase
      .from("therapist_availability_rules")
      .select("day_of_week, start_time, end_time, timezone, is_active")
      .eq("therapist_id", therapistId)
      .eq("is_active", true);

    if (rulesError) {
      const response = NextResponse.json({ error: "Erro ao consultar regras" }, { status: 500 });
      return applyCors(response, req);
    }

    // 2. Busca bloqueios de agenda no período
    const { data: blocks, error: blocksError } = await supabase
      .from("therapist_availability_blocks")
      .select("id, starts_at, ends_at")
      .eq("therapist_id", therapistId)
      .gte("ends_at", `${startDate}T00:00:00-03:00`)
      .lte("starts_at", `${endDate}T23:59:59-03:00`);

    if (blocksError) {
      const response = NextResponse.json({ error: "Erro ao consultar bloqueios" }, { status: 500 });
      return applyCors(response, req);
    }

    // 3. Busca consultas já agendadas (sem expor paciente ou detalhes)
    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select("id, scheduled_start, scheduled_end, status")
      .eq("therapist_id", therapistId)
      .gte("scheduled_start", `${startDate}T00:00:00-03:00`)
      .lte("scheduled_start", `${endDate}T23:59:59-03:00`);

    if (appointmentsError) {
      const response = NextResponse.json({ error: "Erro ao consultar agendamentos" }, { status: 500 });
      return applyCors(response, req);
    }

    // 4. Reutiliza exatamente o motor de slots do Cliniva
    const slots = generateSlots({
      startDate,
      endDate,
      rules: (rules ?? []) as AvailabilityRule[],
      blocks: (blocks ?? []) as AvailabilityBlock[],
      appointments: (appointments ?? []) as AppointmentRow[],
      now: new Date(),
    });

    // 5. Retorna apenas os slots públicos disponíveis
    const response = NextResponse.json(
      {
        therapist: {
          name: resolved.displayName,
          slug: resolved.slug,
        },
        slots,
      },
      { status: 200 },
    );
    return applyCors(response, req);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno no servidor";
    const response = NextResponse.json({ error: message }, { status: 500 });
    return applyCors(response, req);
  }
}
