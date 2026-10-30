import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface ResolvedTherapist {
  id: string;
  displayName: string;
  slug: string;
  isActive: boolean;
  publicBookingEnabled: boolean;
  allowedOrigins: string[];
}

/**
 * Fallback seguro e transitório para compatibilidade com a Dra. Cristiane
 * enquanto a migration 027 não for aplicada ao banco de dados.
 */
const LEGACY_FALLBACK_WHITELIST: Record<
  string,
  {
    therapistId: string;
    displayName: string;
    publicSlug: string;
    allowedOrigins: string[];
  }
> = {
  "dra-cristiane": {
    therapistId: "8fc7331b-9153-4fe5-a230-4a2346f8617c",
    displayName: "Dra. Cristiane",
    publicSlug: "dra-cristiane",
    allowedOrigins: [
      "https://cristianealcantara.com.br",
      "https://www.cristianealcantara.com.br",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
    ],
  },
  "cristiane-alcantara": {
    therapistId: "8fc7331b-9153-4fe5-a230-4a2346f8617c",
    displayName: "Dra. Cristiane",
    publicSlug: "dra-cristiane",
    allowedOrigins: [
      "https://cristianealcantara.com.br",
      "https://www.cristianealcantara.com.br",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
    ],
  },
};

/**
 * Resolve o terapeuta por identificador público de forma dinâmica e multi-tenant:
 * 1. Busca primeiro dinamicamente na tabela `therapists` por `public_slug`.
 * 2. Valida se o profissional está ativo (`is_active = true`) e com agendamento público liberado.
 * 3. Se as colunas dinâmicas ainda não existirem (pré-migration 027) ou não encontrar,
 *    consulta a whitelist transitória para manter 100% de retrocompatibilidade com dra-cristiane.
 * 4. Jamais permite injeção de UUIDs arbitrários ou profissionais desativados.
 */
export async function resolvePublicTherapist(identifier: string): Promise<ResolvedTherapist | null> {
  const normalized = identifier?.trim().toLowerCase();
  if (!normalized) return null;

  // Rejeita tentativas de passar UUIDs diretamente como slug público para evitar enumeração de tenants
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(normalized)) {
    return null;
  }

  const supabase = createSupabaseAdminClient();

  // 1. Tentativa dinâmica no banco de dados (Migration 027)
  try {
    const { data, error } = await supabase
      .from("therapists")
      .select("id, display_name, is_active, public_slug, public_booking_enabled, allowed_origins")
      .ilike("public_slug", normalized)
      .eq("is_active", true)
      .maybeSingle();

    if (!error && data && data.public_slug) {
      return {
        id: data.id,
        displayName: data.display_name,
        slug: data.public_slug,
        isActive: data.is_active ?? true,
        publicBookingEnabled: data.public_booking_enabled ?? true,
        allowedOrigins: Array.isArray(data.allowed_origins) ? data.allowed_origins : [],
      };
    }
  } catch {
    // Se colunas ainda não existirem no Supabase, segue graciosamente para o fallback compatível
  }

  // 2. Fallback retrocompatível (Dra. Cristiane e alias histórico)
  const legacyEntry = LEGACY_FALLBACK_WHITELIST[normalized];
  if (!legacyEntry) {
    return null;
  }

  const { data: legacyData, error: legacyError } = await supabase
    .from("therapists")
    .select("id, display_name, is_active")
    .eq("id", legacyEntry.therapistId)
    .eq("is_active", true)
    .maybeSingle();

  if (legacyError || !legacyData) {
    return null;
  }

  return {
    id: legacyData.id,
    displayName: legacyData.display_name,
    slug: legacyEntry.publicSlug,
    isActive: legacyData.is_active ?? true,
    publicBookingEnabled: true,
    allowedOrigins: legacyEntry.allowedOrigins,
  };
}
