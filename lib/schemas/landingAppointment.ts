import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD");
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, "Horário deve estar no formato HH:MM");

// Schema de Consentimento Informado LGPD (Obrigatório)
export const consentSchema = z.object({
  accepted: z.literal(true, {
    message: "O consentimento informado é obrigatório para realizar o agendamento.",
  }),
  purpose: z.string().trim().min(5, "Finalidade do consentimento é obrigatória").max(200),
  notice_version: z.string().trim().min(1, "Versão do aviso de privacidade é obrigatória").max(20),
  consented_at: z.string().datetime({ message: "Timestamp de consentimento deve estar no formato ISO8601" }),
});

export const anamnesisSchema = z.object({
  personal: z
    .object({
      age: z.string().trim().max(3).optional(),
      birth_date: z.string().trim().min(1, "Data de nascimento é obrigatória").max(10),
      marital_status: z.string().trim().max(50).optional(),
      cpf: z.string().trim().max(18).optional(),
      email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
      celular: z.string().trim().min(8, "Celular é obrigatório").max(25),
      profession: z.string().trim().max(100).optional(),
      education: z.string().trim().max(100).optional(),
      living_with: z.string().trim().max(255).optional(),
      has_children: z.string().trim().max(10).optional(),
      children_count: z.string().trim().max(10).optional(),
      children_ages: z.string().trim().max(100).optional(),
    })
    .optional(),
  groups: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(50),
        title: z.string().trim().min(1).max(150),
        answers: z.array(
          z.object({
            question: z.string().trim().min(1).max(300),
            answer: z.string().trim().max(2000).optional(),
          }),
        ),
      }),
    )
    .optional(),
});

export const landingSchema = z.object({
  idempotency_key: z
    .string()
    .trim()
    .min(8, "Chave de idempotência única é obrigatória")
    .max(100),
  therapist: z.string().trim().max(100).optional(),
  full_name: z.string().trim().min(2, "Nome completo deve ter pelo menos 2 caracteres").max(150),
  notes: z.string().trim().max(1000).optional(),
  anamnesis: anamnesisSchema.optional(),
  consent: consentSchema,
  date: dateSchema,
  time: timeSchema,
  // Campo Honeypot para proteção de bots/spam sem CAPTCHA intrusivo
  website_hp: z.string().max(0, "Acesso rejeitado").optional(),
});
