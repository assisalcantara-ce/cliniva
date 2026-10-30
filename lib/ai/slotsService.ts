import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  generateSlots,
  type AppointmentRow,
  type AvailabilityBlock,
  type AvailabilityRule,
} from "@/lib/db/appointments";

export interface SlotQueryFilters {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

/**
 * Consulta horários disponíveis diretamente no banco de dados para um terapeuta específico,
 * reutilizando o motor oficial de cálculo de disponibilidade do Cliniva.
 */
export async function fetchTherapistAvailableSlots(
  therapistId: string,
  filters: SlotQueryFilters
) {
  const { startDate, endDate } = filters;
  const supabase = createSupabaseAdminClient();

  // 1. Busca regras de disponibilidade ativas do terapeuta
  const { data: rules, error: rulesError } = await supabase
    .from("therapist_availability_rules")
    .select("day_of_week, start_time, end_time, timezone, is_active")
    .eq("therapist_id", therapistId)
    .eq("is_active", true);

  if (rulesError) {
    throw new Error(`Erro ao consultar regras de disponibilidade: ${rulesError.message}`);
  }

  // 2. Busca bloqueios de agenda no período
  const { data: blocks, error: blocksError } = await supabase
    .from("therapist_availability_blocks")
    .select("id, starts_at, ends_at")
    .eq("therapist_id", therapistId)
    .gte("ends_at", `${startDate}T00:00:00-03:00`)
    .lte("starts_at", `${endDate}T23:59:59-03:00`);

  if (blocksError) {
    throw new Error(`Erro ao consultar bloqueios: ${blocksError.message}`);
  }

  // 3. Busca consultas já agendadas (status ativo)
  const { data: appointments, error: appointmentsError } = await supabase
    .from("appointments")
    .select("id, scheduled_start, scheduled_end, status")
    .eq("therapist_id", therapistId)
    .gte("scheduled_start", `${startDate}T00:00:00-03:00`)
    .lte("scheduled_start", `${endDate}T23:59:59-03:00`);

  if (appointmentsError) {
    throw new Error(`Erro ao consultar agendamentos: ${appointmentsError.message}`);
  }

  // 4. Gera slots disponíveis
  const slots = generateSlots({
    startDate,
    endDate,
    rules: (rules ?? []) as AvailabilityRule[],
    blocks: (blocks ?? []) as AvailabilityBlock[],
    appointments: (appointments ?? []) as AppointmentRow[],
    now: new Date(),
  });

  return slots;
}
