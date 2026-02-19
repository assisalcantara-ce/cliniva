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
  "Ambiente seguro com controle de acesso",
  "Suporte assistido com IA",
];

export default function PlanosPage() {
  return (
    <main
      className={`${serif.variable} ${manrope.variable} bg-[#eef7f4] text-slate-900`}
      style={{ fontFamily: "var(--font-landing-sans)" }}
    >
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(20,184,166,0.2),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(59,130,246,0.18),transparent_50%)]" />

        <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3">
          <img src="/img/Logo.png" alt="Cliniva" className="h-[75px] w-[160px] object-contain" />
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

        <section className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16 pt-4">
          <div className="grid gap-8 rounded-[32px] border border-emerald-100 bg-white/90 p-8 shadow-xl lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">
                Plano único
              </p>
              <h1
                className="text-4xl font-semibold text-slate-900"
                style={{ fontFamily: "var(--font-landing-serif)" }}
              >
                Um copiloto profissional para suas sessões.
              </h1>
              <p className="text-base text-slate-600">
                Tudo em um único plano: assistência com IA, organização de insights e suporte
                clínico para acompanhamento contínuo.
              </p>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-6">
                <p className="text-sm font-semibold text-emerald-700">Assinatura mensal</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">
                  R$ 299,90 <span className="text-base font-medium text-slate-500">/ mês</span>
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Sem taxas ocultas. Cancelamento a qualquer momento.
                </p>
                <Link
                  href="/login"
                  className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-700"
                >
                  Iniciar assinatura
                </Link>
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
              <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <p className="text-sm font-semibold text-emerald-700">Precisa de ajuda?</p>
                <p className="mt-2 text-sm text-slate-600">
                  Fale com nossa equipe por e-mail ou WhatsApp.
                </p>
                <div className="mt-4 space-y-1 text-sm font-semibold text-emerald-700">
                  <a
                    href="mailto:contato@cliniva.com.br"
                    className="block hover:text-emerald-800"
                  >
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
              </div>
            </div>
          </div>
        </section>
      </div>
      <section className="mx-auto w-full max-w-5xl px-6 pb-5 pt-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Atendimento guiado",
              description: "Fluxos claros para transformar anotações em insights acionáveis.",
            },
            {
              title: "Insights com evidências",
              description: "Citações e referências para apoiar cada sugestão.",
            },
            {
              title: "Registro seguro",
              description: "Dados protegidos com foco em privacidade e controle de acesso.",
            },
            {
              title: "Evolução contínua",
              description: "Histórico organizado para acompanhar cada paciente.",
            },
          ].map((item) => (
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
    </main>
  );
}
