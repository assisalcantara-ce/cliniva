import Link from "next/link";
import { DM_Serif_Display, Manrope } from "next/font/google";
import HeroSlider from "@/components/landing/HeroSlider";

const serif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-landing-serif",
});

const manrope = Manrope({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-landing-sans",
});

const highlights = [
  {
    title: "Copiloto profissional",
    description:
      "Apoio estruturado para organizar ideias e transformar sessões em planos práticos.",
  },
  {
    title: "Inteligência artificial aplicada",
    description:
      "Sugestões baseadas em contexto, com linguagem clara e foco no cuidado humano.",
  },
  {
    title: "Assessoria com IA",
    description:
      "Perguntas guiadas, temas e hipóteses para aprofundar reflexões.",
  },
];

const steps = [
  {
    title: "Registre a sessão",
    description: "Insira anotações ou transcrições em texto, sempre com consentimento.",
  },
  {
    title: "Receba insights estruturados",
    description: "Resumo, temas, perguntas e próximos passos em um painel único.",
  },
  {
    title: "Acompanhe evolução",
    description: "Histórico organizado por paciente e sessão para dar continuidade.",
  },
];

export default function Home() {
  return (
    <main
      className={`${serif.variable} ${manrope.variable} min-h-screen bg-[#eef7f4] text-slate-900`}
      style={{ fontFamily: "var(--font-landing-sans)" }}
    >
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.22),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.18),transparent_50%)]" />
        <div className="absolute -top-24 right-10 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />

        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <img src="/img/logo3.png" alt="Cliniva" className="h-[75px] w-[160px] object-contain" />
          </div>
          <Link
            href="/login"
            className="rounded-full border border-emerald-200 bg-white/80 px-6 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-white"
          >
            Acesso ao sistema
          </Link>
        </header>

        <section className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-10 pt-2">
          <HeroSlider />
        </section>
      </div>

      <section className="mx-auto grid w-full max-w-6xl gap-12 px-6 pb-16 lg:items-center lg:grid-cols-[1fr_1fr]">
        <div className="space-y-8 lg:pr-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">
              Clínica inteligente
            </p>
            <h2
              className="mt-4 text-3xl font-semibold text-slate-900"
              style={{ fontFamily: "var(--font-landing-serif)" }}
            >
              Apoio ao profissional de saúde mental com integração real de IA.
            </h2>
            <p className="mt-4 text-base text-slate-600">
              Um copiloto que organiza, sugere e ilumina caminhos sem substituir o seu critério
              clínico.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm"
              >
                <h3 className="text-sm font-semibold text-emerald-700">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative lg:pl-4 lg:self-center lg:pt-8">
          <div className="rounded-[32px] border border-emerald-100 bg-white/90 p-6 shadow-xl">
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">
                  Centro da sessão
                </p>
                <h2
                  className="mt-3 text-2xl font-semibold text-slate-900"
                  style={{ fontFamily: "var(--font-landing-serif)" }}
                >
                  Painel com sugestões e perguntas alinhadas ao seu estilo clínico.
                </h2>
              </div>
              <div className="grid gap-4">
                {steps.map((step, index) => (
                  <div
                    key={step.title}
                    className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
                        0{index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{step.title}</p>
                        <p className="text-sm text-slate-600">{step.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-12">
        <div className="grid gap-6 rounded-[32px] border border-emerald-100 bg-white/80 p-8 shadow-sm lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">
              Ética e segurança
            </p>
            <h2
              className="text-3xl font-semibold text-slate-900"
              style={{ fontFamily: "var(--font-landing-serif)" }}
            >
              Sugestões baseadas em evidências, nunca diagnósticos.
            </h2>
            <p className="text-sm text-slate-600">
              O Cliniva organiza insights, perguntas e hipóteses com apontamentos claros de
              evidências. O controle clínico continua sendo seu.
            </p>
          </div>
          <div className="grid gap-4">
            {[
              "Consentimento obrigatório para registros.",
              "Dados sensíveis tratados com foco em privacidade.",
              "Sem prescrições ou direcionamentos médicos.",
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4"
              >
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-600" />
                <p className="text-sm text-slate-600">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-16">
        <div className="rounded-[36px] bg-slate-900 px-8 py-10 text-white shadow-2xl shadow-slate-900/30">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-200">
                Plano único
              </p>
              <h2
                className="text-3xl font-semibold"
                style={{ fontFamily: "var(--font-landing-serif)" }}
              >
                R$ 299,90 por mês para potencializar sua prática clínica.
              </h2>
              <p className="text-sm text-slate-300">
                Tudo o que você precisa para acompanhar sessões, gerar insights e documentar
                evolução em um único ambiente.
              </p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
              <ul className="space-y-3 text-sm text-slate-100">
                <li>Insights estruturados por sessão</li>
                <li>Biblioteca de pacientes e histórico</li>
                <li>Suporte assistido com IA</li>
                <li>Segurança e controle de acesso</li>
              </ul>
              <Link
                href="/planos"
                className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-emerald-400"
              >
                Ver detalhes do plano
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-6 pb-10 text-sm text-slate-500">
        <p>Cliniva — Copiloto profissional para terapeutas.</p>
        <p>Suporte humano + IA para uma prática clínica mais organizada.</p>
      </footer>
    </main>
  );
}
