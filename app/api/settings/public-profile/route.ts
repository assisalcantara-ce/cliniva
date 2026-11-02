import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTherapistIdFromRequest, authError } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTherapistEntitlements } from "@/lib/plans/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const publicServiceItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500),
  durationMinutes: z.number().int().min(15).max(180),
  priceFormatted: z.string().trim().max(30).optional(),
});

const updatePublicProfileSchema = z.object({
  public_slug: z
    .string()
    .trim()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug deve conter apenas letras minúsculas, números e hífens (ex: dra-cristiane)")
    .optional(),
  display_name: z.string().trim().min(2).max(100).optional(),
  headline: z.string().trim().max(160).optional(),
  crp: z.string().trim().max(30).optional(),
  bio: z.string().trim().max(2000).optional(),
  photo_url: z.string().trim().max(1000).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(2).optional(),
  specialties: z.array(z.string().trim().min(1).max(50)).max(15).optional(),
  services: z.array(publicServiceItemSchema).max(10).optional(),
  modalities: z.array(z.enum(["online", "presencial"])).min(1).max(2).optional(),
  public_page_enabled: z.boolean().optional(),
  public_booking_enabled: z.boolean().optional(),
});

/**
 * GET /api/settings/public-profile
 * Retorna os dados configurados para a página pública e o status de permissão do plano.
 */
export async function GET(req: NextRequest) {
  let therapistId: string;
  try {
    therapistId = getTherapistIdFromRequest(req);
  } catch (err: unknown) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String((err as { code?: unknown }).code)
        : "UNAUTHENTICATED";
    const { error, status } = authError(code);
    return NextResponse.json({ error }, { status });
  }

  try {
    const entitlement = await getTherapistEntitlements(therapistId);
    const hasPublicPageAccess = entitlement.canUseFeature("public_landing_page");

    const supabase = createSupabaseAdminClient();
    const { data: therapist, error } = await supabase
      .from("therapists")
      .select("id, display_name, public_slug, crp, bio, photo_url, phone, email, city, state, headline, specialties, services, modalities, public_page_enabled, public_booking_enabled, is_active")
      .eq("id", therapistId)
      .maybeSingle();

    if (error || !therapist) {
      return NextResponse.json({ error: "Terapeuta não encontrado" }, { status: 404 });
    }

    return NextResponse.json(
      {
        profile: {
          display_name: therapist.display_name || "",
          public_slug: therapist.public_slug || "",
          crp: therapist.crp || "",
          bio: therapist.bio || "",
          photo_url: therapist.photo_url || "",
          phone: therapist.phone || "",
          email: therapist.email || "",
          city: therapist.city || "",
          state: therapist.state || "",
          headline: therapist.headline || "",
          specialties: Array.isArray(therapist.specialties) ? therapist.specialties : [],
          services: Array.isArray(therapist.services) ? therapist.services : [],
          modalities: Array.isArray(therapist.modalities) ? therapist.modalities : ["online"],
          public_page_enabled: therapist.public_page_enabled ?? true,
          public_booking_enabled: therapist.public_booking_enabled ?? false,
          is_active: therapist.is_active ?? true,
        },
        entitlement: {
          planId: entitlement.planId,
          planName: entitlement.planName,
          status: entitlement.status,
          hasPublicPageAccess,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/settings/public-profile
 * Atualiza os dados da página pública individual e slug exclusivo com validação estrita.
 */
export async function POST(req: NextRequest) {
  let therapistId: string;
  try {
    therapistId = getTherapistIdFromRequest(req);
  } catch (err: unknown) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String((err as { code?: unknown }).code)
        : "UNAUTHENTICATED";
    const { error, status } = authError(code);
    return NextResponse.json({ error }, { status });
  }

  // 1. Verificação de permissão no backend (Plano Profissional ou Trial Ativo)
  const entitlement = await getTherapistEntitlements(therapistId);
  if (!entitlement.canUseFeature("public_landing_page")) {
    return NextResponse.json(
      {
        error: "A página pública personalizada é exclusiva do plano Profissional ou período de teste gratuito de 7 dias. Faça upgrade para publicar sua página.",
        code: "FEATURE_NOT_PERMITTED",
      },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parseResult = updatePublicProfileSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const data = parseResult.data;
  const supabase = createSupabaseAdminClient();

  // 2. Se o usuário estiver alterando o slug público, verifica unicidade no banco
  if (data.public_slug) {
    const { data: existingSlug } = await supabase
      .from("therapists")
      .select("id")
      .ilike("public_slug", data.public_slug)
      .neq("id", therapistId)
      .maybeSingle();

    if (existingSlug) {
      return NextResponse.json(
        {
          error: "Este endereço público (slug) já está sendo utilizado por outro profissional. Escolha outro identificador.",
          code: "SLUG_ALREADY_EXISTS",
        },
        { status: 409 }
      );
    }
  }

  // 3. Monta payload de atualização compatível com as colunas existentes da tabela therapists
  const updatePayload: Record<string, unknown> = {};
  if (data.display_name !== undefined) updatePayload.display_name = data.display_name;
  if (data.public_slug !== undefined) updatePayload.public_slug = data.public_slug;
  if (data.headline !== undefined) updatePayload.headline = data.headline;
  if (data.crp !== undefined) updatePayload.crp = data.crp;
  if (data.bio !== undefined) updatePayload.bio = data.bio;
  if (data.photo_url !== undefined) updatePayload.photo_url = data.photo_url;
  if (data.phone !== undefined) updatePayload.phone = data.phone;
  if (data.email !== undefined) updatePayload.email = data.email || null;
  if (data.city !== undefined) updatePayload.city = data.city;
  if (data.state !== undefined) updatePayload.state = data.state;
  if (data.specialties !== undefined) updatePayload.specialties = data.specialties;
  if (data.services !== undefined) updatePayload.services = data.services;
  if (data.modalities !== undefined) updatePayload.modalities = data.modalities;
  if (data.public_page_enabled !== undefined) updatePayload.public_page_enabled = data.public_page_enabled;
  if (data.public_booking_enabled !== undefined) updatePayload.public_booking_enabled = data.public_booking_enabled;

  const { data: updatedTherapist, error: updateError } = await supabase
    .from("therapists")
    .update(updatePayload)
    .eq("id", therapistId)
    .select("id, display_name, public_slug, crp, bio, photo_url, phone, email, city, state, headline, specialties, services, modalities, public_page_enabled, public_booking_enabled")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      message: "Página pública atualizada com sucesso!",
      profile: updatedTherapist,
    },
    { status: 200 }
  );
}
