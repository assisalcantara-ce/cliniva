import { z } from "zod";

/**
 * Esquema de validação para mensagens recebidas no Chat Universal Cliniva
 */
export const publicChatMessageSchema = z.object({
  slug: z
    .string({ message: "Slug público do terapeuta é obrigatório." })
    .trim()
    .min(2, "Slug inválido.")
    .max(100, "Slug excede o tamanho máximo.")
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens."),
  sessionId: z
    .string()
    .uuid("Identificador de sessão (UUID) inválido.")
    .optional(),
  message: z
    .string({ message: "Mensagem é obrigatória." })
    .trim()
    .min(1, "Mensagem não pode estar vazia.")
    .max(1000, "Mensagem excede o limite máximo de 1000 caracteres."),
});

/**
 * Esquema para confirmação explícita de agendamento originado via Chat
 * Exige validação estrita no servidor e consentimento LGPD explícito
 */
export const publicChatConfirmAppointmentSchema = z.object({
  slug: z.string().trim().min(2).max(100),
  sessionId: z.string().uuid("ID de sessão inválido."),
  proposalId: z.string().uuid("ID da proposta de agendamento inválido.").optional(),
  scheduledStart: z.string().datetime("Formato de data/hora inicial ISO 8601 obrigatório."),
  scheduledEnd: z.string().datetime("Formato de data/hora final ISO 8601 obrigatório."),
  fullName: z
    .string()
    .trim()
    .min(3, "Nome completo deve ter pelo menos 3 caracteres.")
    .max(150, "Nome excede o limite máximo permitido."),
  whatsapp: z
    .string()
    .trim()
    .transform((val) => val.replace(/\D/g, ""))
    .refine(
      (digits) => digits.length === 10 || digits.length === 11,
      { message: "WhatsApp deve conter DDD + 8 ou 9 dígitos (10 ou 11 números no total)." }
    ),
  notes: z.string().trim().max(500, "Observações não podem exceder 500 caracteres.").optional(),
  idempotencyKey: z
    .string()
    .trim()
    .min(16, "Chave de idempotência forte (mínimo 16 caracteres) é obrigatória.")
    .max(100),
  consent: z.object({
    accepted: z.literal(true, {
      message: "O consentimento explícito aos termos de agendamento é obrigatório.",
    }),
    version: z.string().min(1, "Versão do aviso de privacidade é obrigatória."),
    timestamp: z.string().datetime("Timestamp de consentimento em formato ISO é obrigatório."),
  }),
});

export type PublicChatMessageInput = z.infer<typeof publicChatMessageSchema>;
export type PublicChatConfirmAppointmentInput = z.infer<typeof publicChatConfirmAppointmentSchema>;
