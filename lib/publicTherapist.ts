import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface PublicServiceItem {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  priceFormatted?: string;
}

export interface ResolvedTherapist {
  id: string;
  displayName: string;
  slug: string;
  isActive: boolean;
  publicBookingEnabled: boolean;
  allowedOrigins: string[];
  // Dados do perfil público profissional
  crp?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
  headline?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  specialties: string[];
  services: PublicServiceItem[];
  modalities: string[]; // "online", "presencial"
  publicPageEnabled: boolean;
}

/**
 * Fallback seguro e transitório para compatibilidade com a Dra. Cristiane
 */
const LEGACY_FALLBACK_WHITELIST: Record<
  string,
  {
    therapistId: string;
    displayName: string;
    publicSlug: string;
    allowedOrigins: string[];
    crp?: string;
    bio?: string;
    photoUrl?: string;
    headline?: string;
    specialties?: string[];
    services?: PublicServiceItem[];
    modalities?: string[];
  }
> = {
  "dra-cristiane": {
    therapistId: "8fc7331b-9153-4fe5-a230-4a2346f8617c",
    displayName: "Dra. Cristiane Alcântara",
    publicSlug: "dra-cristiane",
    allowedOrigins: [
      "https://cristianealcantara.com.br",
      "https://www.cristianealcantara.com.br",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
    ],
    crp: "06/123456",
    headline: "Psicóloga Clínica & Psicoterapeuta Cognitivo-Comportamental",
    bio: "Mais de 15 anos de experiência no acolhimento de adultos, jovens e casais. Foco em ansiedade, estresse, autoconhecimento e desenvolvimento emocional.",
    photoUrl: "/cliniva_hero_consultation_1791249271152.jpg",
    specialties: [
      "Terapia Cognitivo-Comportamental",
      "Transtornos de Ansiedade",
      "Depressão e Humor",
      "Gestão de Estresse & Burnout",
      "Relacionamentos & Família",
    ],
    services: [
      {
        id: "serv-1",
        title: "Psicoterapia Individual (Adultos)",
        description: "Sessões semanais com foco em autoconhecimento, queixas emocionais e estratégias práticas de enfrentamento.",
        durationMinutes: 50,
      },
      {
        id: "serv-2",
        title: "Orientação e Psicoeducação",
        description: "Atendimento focado em momentos específicos de transição, tomada de decisão e manejo de crises.",
        durationMinutes: 50,
      },
    ],
    modalities: ["online", "presencial"],
  },
};

/**
 * Resolve o terapeuta por identificador público de forma dinâmica e multi-tenant:
 */
export async function resolvePublicTherapist(identifier: string): Promise<ResolvedTherapist | null> {
  const normalized = identifier?.trim().toLowerCase();
  if (!normalized) return null;

  // Validação estrita de formato de slug: apenas letras minúsculas, números e hífens
  // Rejeita caracteres inválidos, injeções e enumeração de UUIDs diretos
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!slugRegex.test(normalized) || uuidRegex.test(normalized)) {
    return null;
  }

  const supabase = createSupabaseAdminClient();

  // 1. Tentativa dinâmica no banco de dados (colunas existentes + extensões opcionais)
  try {
    const { data, error } = await supabase
      .from("therapists")
      .select("id, display_name, is_active, public_slug, public_booking_enabled, allowed_origins, crp, bio, photo_url, phone, email, city, state")
      .ilike("public_slug", normalized)
      .eq("is_active", true)
      .maybeSingle();

    if (!error && data && data.public_slug) {
      // Se houver dados complementares no fallback da whitelist para este slug, faz merge gracioso
      const fallbackInfo = LEGACY_FALLBACK_WHITELIST[normalized];

      return {
        id: data.id,
        displayName: data.display_name || fallbackInfo?.displayName || "Terapeuta Cliniva",
        slug: data.public_slug,
        isActive: data.is_active ?? true,
        publicBookingEnabled: data.public_booking_enabled ?? true,
        allowedOrigins: Array.isArray(data.allowed_origins) ? data.allowed_origins : [],
        crp: data.crp || fallbackInfo?.crp || null,
        bio: data.bio || fallbackInfo?.bio || null,
        photoUrl: data.photo_url || fallbackInfo?.photoUrl || null,
        headline: fallbackInfo?.headline || (data.crp ? `Psicólogo(a) Clínico(a) — CRP ${data.crp}` : "Atendimento Psicológico Especializado"),
        email: data.email || null,
        phone: data.phone || null,
        city: data.city || null,
        state: data.state || null,
        specialties: fallbackInfo?.specialties || ["Psicoterapia Clínica", "Saúde Emocional", "Acolhimento Terapêutico"],
        services: fallbackInfo?.services || [
          {
            id: "serv-default-1",
            title: "Sessão de Psicoterapia Individual",
            description: "Atendimento clínico individualizado com abordagem baseada em evidências.",
            durationMinutes: 50,
          },
        ],
        modalities: fallbackInfo?.modalities || ["online"],
        publicPageEnabled: true,
      };
    }
  } catch {
    // Se houver falha, segue graciosamente para o fallback compatível
  }

  // 2. Fallback retrocompatível (Dra. Cristiane e alias histórico)
  const legacyEntry = LEGACY_FALLBACK_WHITELIST[normalized];
  if (!legacyEntry) {
    return null;
  }

  const { data: legacyData, error: legacyError } = await supabase
    .from("therapists")
    .select("id, display_name, is_active, photo_url, crp, bio")
    .eq("id", legacyEntry.therapistId)
    .eq("is_active", true)
    .maybeSingle();

  if (legacyError || !legacyData) {
    return null;
  }

  return {
    id: legacyData.id,
    displayName: legacyData.display_name || legacyEntry.displayName,
    slug: legacyEntry.publicSlug,
    isActive: legacyData.is_active ?? true,
    publicBookingEnabled: true,
    allowedOrigins: legacyEntry.allowedOrigins,
    crp: legacyData.crp || legacyEntry.crp || null,
    bio: legacyData.bio || legacyEntry.bio || null,
    photoUrl: legacyData.photo_url || legacyEntry.photoUrl || null,
    headline: legacyEntry.headline || "Atendimento Psicológico",
    specialties: legacyEntry.specialties || ["Psicoterapia"],
    services: legacyEntry.services || [],
    modalities: legacyEntry.modalities || ["online"],
    publicPageEnabled: true,
  };
}
