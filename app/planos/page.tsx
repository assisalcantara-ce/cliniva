import Link from "next/link";
import { DM_Serif_Display, Manrope } from "next/font/google";

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

const features = [
  "Insights estruturados por sessão",
  "Resumo com evidências e perguntas sugeridas",
  "Histórico completo por paciente",
  "Hipóteses clínicas assistivas, sem diagnósticos",
  "Organização de anotações e transcrições",
  "Ambiente seguro com controle de acesso",
  "Suporte assistido com IA",
];

const useCases = [
  {
    title: "Durante a sessão",
    description:
      "Apoio discreto para identificar temas, padrões e possíveis perguntas de aprofundamento.",
  },
  {
    title: "Após a sessão",
    description:
      "Geração de resumo estruturado, pontos relevantes e próximos passos para acompanhamento.",
  },
  {
    title: "Ao longo do tratamento",
    description:
      "Histórico organizado para visualizar evolução, recorrências e continuidade do cuidado.",
  },
  {
    title: "Com segurança",
    description:
      "Uso orientado por consentimento, privacidade e controle profissional sobre cada decisão.",
  },
];

export default function PlanosPage() {
  return (
    <main
      className={`${serif.variable} ${manrope.variable} min-h-screen bg-[#eef7f4] text-slate-900`}
      style={{ fontFamily: "var(--font-landing-sans)" }}
    >
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(20,184,166,0.2),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(59,130,246,0.18),transparent_50%)]" />
        <div className="absolute -top-24 right-12 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />

        <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3">
          <img src="/img/logo3.png" alt="Cliniva" className="h-[75px] w-[160px] object-contain" />
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Voltar para a home
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-emerald-200 bg-white/80 px-6 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-white"
            >
              Acesso ao sistema
            </Link>
          </div>
        </header>

        <section className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-14 pt-4">
          <div className="grid gap-8 rounded-[32px] border border-emerald-100 bg-white/90 p-8 shadow-xl lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">
                Plano profissional
              </p>
              <h1
                className="text-4xl font-semibold text-slate-900"
                style={{ fontFamily: "var(--font-landing-serif)" }}
              >
                Um copiloto clínico com IA para apoiar sua prática terapêutica.
              </h1>
              <p className="text-base text-slate-600">
                O Cliniva ajuda profissionais de saúde mental a organizar sessões, gerar insights
                estruturados e acompanhar a evolução do paciente — sempre com controle humano,
                evidências e responsabilidade clínica.
              </p>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">Assinatura mensal</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">
                      R$ 299,90 <span className="text-base font-medium text-slate-500">/ mês</span>
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      Para profissionais que desejam integrar IA de apoio à rotina clínica.
                    </p>
                  </div>
                </div>

                <Link
                  href="/checkout"
                  className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-700"
                >
                  Iniciar assinatura
                </Link>

                <p className="mt-3 text-center text-xs text-slate-500">
                  Cancelamento a qualquer momento. Sem taxas ocultas.
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                O que está incluído
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                {features.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
                <p className="text-sm font-semibold text-amber-800">Uso assistivo</p>
                <p className="mt-2 text-sm text-slate-600">
                  O Cliniva não realiza diagnósticos, não prescreve condutas e não substitui o
                  julgamento do profissional. A IA sugere caminhos com base no contexto informado.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="mx-auto w-full max-w-5xl px-6 pb-10">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {useCases.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-emerald-100 bg-white/90 p-5 shadow-sm"
            >
              <p className="text-sm font-semibold text-emerald-700">{item.title}</p>
              <p className="mt-2 text-sm text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 pb-16">
        <div className="grid gap-6 rounded-[32px] border border-emerald-100 bg-white/90 p-8 shadow-sm lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">
              Precisa de ajuda?
            </p>
            <h2
              className="mt-3 text-3xl font-semibold text-slate-900"
              style={{ fontFamily: "var(--font-landing-serif)" }}
            >
              Fale com a equipe Cliniva antes de assinar.
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Tire dúvidas sobre o uso da IA, privacidade, consentimento, recursos disponíveis e
              adequação do Cliniva à sua prática profissional.
            </p>
          </div>

          <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/70 p-6">
            <p className="text-sm font-semibold text-emerald-700">Contato</p>
            <div className="mt-4 space-y-3 text-sm font-semibold text-emerald-700">
              <a href="mailto:contato@cliniva.com.br" className="block hover:text-emerald-800">
                contato@cliniva.com.br
              </a>
              <a
                href="https://wa.me/5591981755021"
                className="block hover:text-emerald-800"
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp: (91) 98175-5021
              </a>
            </div>
            <Link
              href="/login"
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Acessar sistema
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
