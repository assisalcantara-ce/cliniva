import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { resolvePublicTherapist } from "@/lib/publicTherapist";
import { getTherapistEntitlements } from "@/lib/plans/entitlements";
import { BookingScheduler } from "@/components/public/BookingScheduler";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }> | { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const therapist = await resolvePublicTherapist(slug);
  if (!therapist) {
    return {
      title: "Profissional não encontrado | Cliniva",
      description: "Página pública de atendimento clínico.",
    };
  }

  return {
    title: `${therapist.displayName} | Agendamento & Consulta`,
    description: therapist.headline || therapist.bio?.slice(0, 160) || `Agende sua sessão de psicoterapia com ${therapist.displayName}.`,
    openGraph: {
      title: `${therapist.displayName} — Psicoterapia`,
      description: therapist.headline || therapist.bio?.slice(0, 160) || "Atendimento psicológico com acolhimento e base científica.",
      images: therapist.photoUrl ? [{ url: therapist.photoUrl }] : [],
    },
  };
}

export default async function PublicTherapistPage({ params }: PageProps) {
  const { slug } = await params;
  const therapist = await resolvePublicTherapist(slug);

  if (!therapist || !therapist.isActive) {
    notFound();
  }

  // 1. Verificação estrita de direitos do plano no backend:
  // Plano Essencial, Premium e contas expiradas NÃO podem ter página pública visível.
  // Ressalva: compatibilidade e direitos legados ou trial de 7 dias ativo são validados aqui.
  const entitlement = await getTherapistEntitlements(therapist.id);
  const canPublish = entitlement.canUseFeature("public_landing_page");

  if (!canPublish) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            !
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Página Temporariamente Indisponível</h1>
          <p className="text-sm text-slate-600 mb-6">
            A página pública deste profissional está indisponível para novos acessos no momento. Se você já é paciente, entre em contato diretamente pelo canal de comunicação usual.
          </p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition"
          >
            Ir para página inicial
          </Link>
        </div>
      </div>
    );
  }

  const hasPhoto = Boolean(therapist.photoUrl && therapist.photoUrl.trim().length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-800 antialiased selection:bg-teal-100 selection:text-teal-900">
      {/* Barra Superior Discreta */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-900 text-base tracking-tight">
              {therapist.displayName}
            </span>
            {therapist.crp && (
              <span className="text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200/80 px-2.5 py-0.5 rounded-full">
                CRP {therapist.crp}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <a
              href="#agendamento"
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition shadow-sm"
            >
              Consultar Horários
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section do Terapeuta */}
      <section className="py-12 md:py-20 border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            {/* Foto ou Avatar */}
            <div className="relative shrink-0">
              <div className="w-36 h-36 md:w-48 md:h-48 rounded-2xl overflow-hidden shadow-lg border-4 border-white bg-slate-100 flex items-center justify-center">
                {hasPhoto ? (
                  <img
                    src={therapist.photoUrl!}
                    alt={therapist.displayName}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="text-4xl md:text-5xl font-bold text-teal-700">
                    {therapist.displayName.charAt(0)}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow border-2 border-white flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Atendendo online
              </div>
            </div>

            {/* Informações Principais */}
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 text-teal-800 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
                {therapist.modalities.includes("presencial") ? "Online e Presencial" : "Atendimento Online"}
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
                {therapist.displayName}
              </h1>

              <p className="text-lg text-teal-800 font-medium mb-4">
                {therapist.headline || "Psicoterapia com base científica e acolhimento humano"}
              </p>

              {therapist.bio && (
                <p className="text-slate-600 leading-relaxed text-sm md:text-base max-w-2xl mb-6 whitespace-pre-line">
                  {therapist.bio}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <a
                  href="#agendamento"
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl shadow-sm transition inline-flex items-center gap-2"
                >
                  Agendar Consulta
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção Especialidades e Serviços */}
      <section className="py-12 bg-slate-50/60 border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Especialidades */}
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                Áreas de Atuação & Especialidades
              </h2>
              <div className="flex flex-wrap gap-2">
                {therapist.specialties.map((spec, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 text-xs font-semibold rounded-lg border border-slate-200/60 transition"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>

            {/* Como Funciona o Atendimento */}
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                Modalidades e Estrutura
              </h2>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2.5">
                  <span className="text-teal-600 font-bold">✓</span>
                  <span><strong>Sessões de 50 minutos</strong> em ambiente seguro, sigiloso e acolhedor.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-teal-600 font-bold">✓</span>
                  <span><strong>Atendimento 100% online</strong> para qualquer lugar do Brasil e exterior.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-teal-600 font-bold">✓</span>
                  <span>Conformidade estrita com o Código de Ética do Psicólogo e LGPD.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Seção de Agendamento Direto na Agenda */}
      <section id="agendamento" className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="text-teal-700 font-semibold text-xs uppercase tracking-wider">
              Disponibilidade em Tempo Real
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Escolha seu Horário e Agende sua Sessão
            </h2>
            <p className="text-sm text-slate-600 mt-2 max-w-lg mx-auto">
              Selecione o dia e horário que melhor se adaptam à sua rotina. Seus dados são confidenciais e protegidos por sigilo profissional.
            </p>
          </div>

          {/* Componente Interativo de Agendamento */}
          <BookingScheduler slug={therapist.slug} therapistName={therapist.displayName} />
        </div>
      </section>

      {/* Rodapé Institucional */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4">
          <p className="mb-2">
            {therapist.displayName} {therapist.crp ? `• CRP ${therapist.crp}` : ""}
          </p>
          <p className="text-slate-400">
            Plataforma clínica segura powered by Cliniva Copilot • Atendimento confidencial sob sigilo ético.
          </p>
        </div>
      </footer>

      {/* Widget de Chat com IA Corporativa Cliniva embutido com isolamento via slug */}
      <script
        src="/widget.js"
        data-therapist={therapist.slug}
        data-primary-color="#0d9488"
        defer
      />
    </div>
  );
}
