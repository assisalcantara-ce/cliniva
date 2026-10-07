import Link from "next/link";
import { DM_Serif_Display, Manrope } from "next/font/google";
import { ContactSection } from "@/components/landing/ContactSection";

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


export default function Home() {
  return (
    <main
      className={`${serif.variable} ${manrope.variable} min-h-screen bg-[#f8fbfb] text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900`}
      style={{ fontFamily: "var(--font-landing-sans)" }}
    >
      {/* ========================================================================= */}
      {/* 1. HEADER (LIMPO, BAIXO, ELEGANTE E COM NAVEGAÇÃO CENTRAL)               */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs transition-all">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 sm:px-8 py-3">
          
          {/* Logo Cliniva */}
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <img src="/img/logo.png" alt="Cliniva Therapy Copilots" className="h-10 sm:h-11 w-auto object-contain" />
          </Link>

          {/* Navegação Central */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-sm font-semibold text-slate-600">
            <Link href="/" className="text-teal-700 hover:text-teal-800 transition-colors">
              Início
            </Link>
            <Link href="#recursos" className="hover:text-teal-700 transition-colors">
              Recursos
            </Link>
            <Link href="/planos" className="hover:text-teal-700 transition-colors">
              Planos
            </Link>
            <Link href="#profissionais" className="hover:text-teal-700 transition-colors">
              Para Profissionais
            </Link>
            <Link href="#contato" className="hover:text-teal-700 transition-colors">
              Contato
            </Link>
          </nav>

          {/* Ações à Direita */}
          <div className="flex items-center gap-3">
            <Link
              href="/planos"
              className="hidden sm:inline-flex items-center justify-center rounded-xl border border-teal-200 bg-teal-50/70 px-4 py-2 text-xs font-bold text-teal-800 transition hover:bg-teal-100/80"
            >
              Ver planos
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-[#00897B] hover:bg-[#00796B] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-teal-700/20 transition-all hover:scale-[1.02]"
            >
              Acesso ao sistema →
            </Link>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION (COM IMAGEM BG_HERO.PNG E COMPOSIÇÃO DE DUAS ÁREAS)        */}
      {/* ========================================================================= */}
      <section 
        className="relative w-full overflow-hidden bg-cover bg-center bg-no-repeat min-h-[580px] lg:min-h-[660px] flex items-center"
        style={{
          backgroundImage: "url('/img/bg_hero.png')",
          backgroundColor: "#E4F4F3"
        }}
      >
        {/* Camada Suave Translúcida à Esquerda para Contraste e Legibilidade Perfeita */}
        <div className="absolute inset-y-0 left-0 w-full lg:w-[48%] xl:w-[45%] bg-gradient-to-r from-white/95 via-white/80 via-40% to-transparent pointer-events-none z-0" />

        {/* Container Principal do Hero */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* LADO ESQUERDO: TEXTO COMERCIAL, HEADLINE & CTAS */}
            <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-between space-y-5 max-w-[500px]">
              
              {/* Badge */}
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-200/80 bg-teal-50/90 px-3.5 py-1.5 shadow-2xs">
                  <span className="text-teal-600 text-xs">✦</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                    COPILOTO CLÍNICO COM IA
                  </span>
                </div>
              </div>

              {/* Headline Principal */}
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight leading-[1.12]">
                  Mais presença no<br />
                  atendimento.<br />
                  <span className="text-[#00897B] underline decoration-teal-300 decoration-wavy decoration-2 underline-offset-4">
                    Mais clareza
                  </span>{" "}
                  para<br />
                  o seu consultório.
                </h1>

                {/* Subtexto */}
                <p className="text-sm sm:text-[15px] text-slate-700 leading-relaxed font-normal">
                  O copiloto inteligente que organiza transcrições, <br />
                  identifica padrões e apoia sua rotina clínica<br />
                  permitindo que você fique focado no que realmente<br />
                  importa: <strong className="font-semibold text-slate-900">o seu paciente.</strong>
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00897B] hover:bg-[#00796B] px-6 sm:px-7 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-teal-700/25 transition-all hover:scale-[1.02]"
                >
                  <span>Acessar o Cliniva</span>
                  <span>→</span>
                </Link>
                <Link
                  href="/planos"
                  className="inline-flex items-center justify-center rounded-xl border border-teal-300 bg-white/80 hover:bg-white px-5 sm:px-6 py-3 text-xs sm:text-sm font-bold text-teal-800 transition-all shadow-xs"
                >
                  Conhecer Planos
                </Link>
              </div>

              {/* 3 Benefícios de Confiança */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 border-t border-slate-200/80">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <div className="w-5 h-5 rounded-md bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <span className="leading-tight">Zero diagnósticos automáticos</span>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <div className="w-5 h-5 rounded-md bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <span className="leading-tight">Conformidade com a LGPD</span>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <div className="w-5 h-5 rounded-md bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M8.5 19C8.5 16.5 10 15 11 14C10 13 9.5 11.5 10 9.5C10.8 6.5 13 5 16.5 5.5C19.5 6 20.5 8.5 20.5 11C20.5 13.5 19 15 18 16V17.5C18 18.5 17 19.5 16 20L15 20.5H10.5C9.5 20.5 8.5 19.8 8.5 19Z" />
                    </svg>
                  </div>
                  <span className="leading-tight">IA com evidências clínicas</span>
                </div>
              </div>

            </div>

            {/* LADO DIREITO: ESPAÇO LIVRE PARA EXIBIÇÃO DA CENA DO CONSULTÓRIO, ROBÔ COPILOTO E CARDS DA ARTE */}
            <div className="lg:col-span-6 xl:col-span-7 hidden lg:block pointer-events-none min-h-[460px]" />

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. SEÇÃO DE BENEFÍCIOS & PILARES                                          */}
      {/* ========================================================================= */}
      <section id="recursos" className="mx-auto grid w-full max-w-7xl gap-12 px-6 sm:px-8 py-16 lg:py-20 lg:items-center lg:grid-cols-[1.1fr_0.9fr]">
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
      {/* 4. SEÇÃO ÉTICA E SEGURANÇA (MODELO FULL-WIDTH BANNER)                     */}
      {/* ========================================================================= */}
      <section id="profissionais" className="w-full pb-16 sm:pb-24">
        <div className="w-full overflow-hidden">
          <img
            src="/img/bg_ethics.png"
            alt="Ética e Segurança — Sugestões baseadas em contexto e evidências, nunca diagnósticos"
            className="w-full h-auto object-cover"
          />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. SEÇÃO DE CHAMADA FINAL (CTA)                                           */}
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

      {/* ========================================================================= */}
      {/* 6. FORMULÁRIO DE CONTATO & SUPORTE ESPECIALIZADO                          */}
      {/* ========================================================================= */}
      <ContactSection />

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-700">Cliniva — Copiloto clínico com IA para profissionais de saúde mental.</p>
        <p>Suporte humano + IA para uma prática clínica mais organizada, ética e segura • © 2025 Cliniva</p>
      </footer>
    </main>
  );
}
