import Link from "next/link";
import { DM_Serif_Display, Manrope } from "next/font/google";

const serif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-landing-serif",
});

const manrope = Manrope({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-landing-sans",
});

const highlights = [
  {
    title: "Copiloto clínico",
    description:
      "Apoio estruturado durante e após sessões para organizar informações sem interromper sua escuta.",
  },
  {
    title: "IA com evidências",
    description:
      "Sugestões, perguntas e hipóteses vinculadas ao contexto da sessão — nunca diagnósticos automáticos.",
  },
  {
    title: "Profissional no controle",
    description:
      "A IA apoia o raciocínio clínico, mas a decisão permanece sempre com você.",
  },
];

const steps = [
  {
    title: "Registre a sessão",
    description: "Insira anotações ou transcrições em tempo real, sempre com consentimento do paciente.",
  },
  {
    title: "Receba insights estruturados",
    description: "Resumos, temas recorrentes, perguntas sugeridas e hipóteses com evidências imediatas.",
  },
  {
    title: "Acompanhe evolução",
    description: "Histórico organizado por paciente e sessão para dar continuidade e profundidade ao cuidado.",
  },
];

const trustItems = [
  "Consentimento obrigatório para qualquer gravação ou transcrição.",
  "Dados sensíveis e clínicos tratados com sigilo rigoroso e criptografia.",
  "Sem diagnósticos, prescrições ou decisões automatizadas — apenas suporte reflexivo.",
];

export default function Home() {
  return (
    <main
      className={`${serif.variable} ${manrope.variable} min-h-screen bg-[#f8fbfb] text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900`}
      style={{ fontFamily: "var(--font-landing-sans)" }}
    >
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 sm:px-8 py-3.5">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <img src="/img/logo.png" alt="Cliniva Therapy Copilots" className="h-10 sm:h-11 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/planos"
              className="hidden sm:inline-flex items-center justify-center rounded-xl border border-teal-200 bg-teal-50/70 px-5 py-2.5 text-xs font-bold text-teal-800 transition hover:bg-teal-100/80"
            >
              Ver planos
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-[#00897B] px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-teal-700/20 transition hover:bg-[#00796B]"
            >
              Acesso ao sistema →
            </Link>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* FULL-WIDTH HERO SECTION (OCUPANDO TODA A ÁREA HORIZONTAL DA TELA)          */}
      {/* ========================================================================= */}
      <section className="relative w-full overflow-hidden bg-slate-950 min-h-[580px] lg:min-h-[640px] flex items-center">
        {/* Background Full Width Image */}
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat scale-105 transition-transform duration-1000 ease-out"
          style={{
            backgroundImage: "url('/img/hero_consultation.jpg')",
            backgroundPosition: "center 28%",
          }}
        />

        {/* Soft Cinematic Gradients & Contrast Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/35 lg:from-slate-950/92 lg:via-slate-950/70 lg:to-slate-950/20 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />

        {/* Hero Content Container */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16 sm:py-20 lg:py-24">
          <div className="max-w-2xl space-y-6">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-950/60 backdrop-blur-md px-4 py-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-teal-300">
                Copiloto Clínico com IA Ética
              </span>
            </div>

            {/* Main Headline */}
            <h1 
              className="text-3xl sm:text-5xl lg:text-[54px] font-bold text-white tracking-tight leading-[1.12]"
              style={{ fontFamily: "var(--font-landing-serif)" }}
            >
              Mais presença no atendimento.{" "}
              <span className="text-teal-300 underline decoration-teal-400 decoration-wavy decoration-2 underline-offset-8">
                Mais clareza
              </span>{" "}
              para o seu consultório.
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-200 leading-relaxed font-normal max-w-xl">
              O copiloto inteligente que organiza transcrições, detecta padrões recorrentes e sugere hipóteses clínicas em tempo real — permitindo que você foque 100% no que realmente importa: <strong className="text-white font-semibold">o seu paciente</strong>.
            </p>

            {/* Call to Actions */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00897B] hover:bg-[#00796B] px-7 py-3.5 text-sm sm:text-base font-bold text-white shadow-xl shadow-teal-700/30 transition-all hover:scale-[1.02]"
              >
                <span>Acessar o Cliniva</span>
                <span className="text-lg leading-none">→</span>
              </Link>
              <Link
                href="/planos"
                className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 backdrop-blur-md px-6 py-3.5 text-sm sm:text-base font-semibold text-white transition hover:bg-white/20 hover:border-white/50"
              >
                Conhecer Planos
              </Link>
            </div>

            {/* Key Trust Highlights in Hero */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-white/15">
              <div className="flex items-center gap-2.5 text-xs text-slate-200 font-medium">
                <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span>Zero diagnósticos automáticos</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-200 font-medium">
                <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span>Conformidade com a LGPD</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-200 font-medium">
                <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span>IA com evidências clínicas</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SEÇÃO DE BENEFÍCIOS & PILARES                                             */}
      {/* ========================================================================= */}
      <section className="mx-auto grid w-full max-w-7xl gap-12 px-6 sm:px-8 py-16 lg:py-20 lg:items-center lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8 lg:pr-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-teal-700">
              Copiloto de terapia
            </p>
            <h2
              className="mt-3 text-3xl sm:text-4xl font-semibold text-slate-900"
              style={{ fontFamily: "var(--font-landing-serif)" }}
            >
              IA de apoio ao profissional de saúde mental — antes, durante e após a sessão.
            </h2>
            <p className="mt-4 text-base text-slate-600 leading-relaxed">
              O Cliniva ajuda terapeutas a organizar informações, identificar conexões emocionais, gerar
              perguntas reflexivas e acompanhar a evolução do paciente. A IA sugere caminhos; o
              profissional permanece 100% no controle.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {highlights.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-teal-300 transition-colors"
              >
                <h3 className="text-sm font-bold text-teal-800">{item.title}</h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative lg:pl-4">
          <div className="rounded-3xl border border-teal-100 bg-white p-7 shadow-xl shadow-teal-900/5">
            <div className="space-y-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-teal-700">
                  Fluxo da Sessão
                </p>
                <h3
                  className="mt-2 text-2xl font-semibold text-slate-900"
                  style={{ fontFamily: "var(--font-landing-serif)" }}
                >
                  Da escuta ao registro em poucos cliques.
                </h3>
              </div>
              <div className="grid gap-3.5">
                {steps.map((step, index) => (
                  <div
                    key={step.title}
                    className="rounded-2xl border border-teal-100/80 bg-teal-50/60 p-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-xs font-bold text-white shadow-sm">
                        0{index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{step.title}</p>
                        <p className="text-xs sm:text-sm text-slate-600 mt-0.5">{step.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SEÇÃO ÉTICA E SEGURANÇA                                                   */}
      {/* ========================================================================= */}
      <section className="mx-auto w-full max-w-7xl px-6 sm:px-8 pb-16">
        <div className="grid gap-8 rounded-3xl border border-teal-100 bg-white p-8 sm:p-10 shadow-sm lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-teal-700">
              Ética e segurança
            </p>
            <h2
              className="text-3xl font-semibold text-slate-900"
              style={{ fontFamily: "var(--font-landing-serif)" }}
            >
              Sugestões baseadas em contexto e evidências, nunca diagnósticos.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              O Cliniva organiza insights, perguntas e hipóteses com apontamentos claros de
              evidências. Ele foi pensado para ampliar a atenção do profissional, não para
              substituir julgamento clínico, diagnóstico ou conduta terapêutica.
            </p>
          </div>
          <div className="grid gap-3.5">
            {trustItems.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
              >
                <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-xs sm:text-sm font-medium text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SEÇÃO DE CHAMADA FINAL (CTA)                                              */}
      {/* ========================================================================= */}
      <section className="mx-auto w-full max-w-7xl px-6 sm:px-8 pb-20">
        <div className="rounded-[36px] bg-slate-950 px-8 sm:px-12 py-12 sm:py-16 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] relative z-10 items-center">
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-teal-300">
                Transforme sua Prática
              </p>
              <h2
                className="text-3xl sm:text-4xl font-semibold"
                style={{ fontFamily: "var(--font-landing-serif)" }}
              >
                Conheça o Cliniva e veja como a IA pode apoiar sua clínica.
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Uma plataforma completa para acompanhar sessões, gerar insights estruturados e documentar
                evolução em um ambiente único, seguro e orientado ao cuidado humano.
              </p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 backdrop-blur-md p-6 sm:p-8 space-y-4">
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-100 font-medium">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  Insights estruturados por sessão
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  Histórico de pacientes e evolução clínica
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  Sugestões de perguntas e temas de aprofundamento
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  Privacidade, consentimento e controle de acesso
                </li>
              </ul>
              <Link
                href="/login"
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#00897B] hover:bg-[#00796B] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-900/40 transition-all"
              >
                Acessar agora →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-700">Cliniva — Copiloto clínico com IA para profissionais de saúde mental.</p>
        <p>Suporte humano + IA para uma prática clínica mais organizada, ética e segura • © 2025 Cliniva</p>
      </footer>
    </main>
  );
}
