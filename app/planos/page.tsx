import Link from "next/link";
import { DM_Serif_Display, Manrope } from "next/font/google";
import { PLANS_CATALOG } from "@/lib/plans/catalog";

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

export default function PlanosPage() {
  const essencial = PLANS_CATALOG.essencial;
  const premium = PLANS_CATALOG.premium;
  const profissional = PLANS_CATALOG.profissional;

  return (
    <main
      className={`${serif.variable} ${manrope.variable} min-h-screen bg-[#eef7f4] text-slate-900 pb-20`}
      style={{ fontFamily: "var(--font-landing-sans)" }}
    >
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(20,184,166,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(59,130,246,0.14),transparent_50%)]" />

        {/* Header */}
        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/">
            <img src="/img/logo3.png" alt="Cliniva" className="h-[65px] w-[140px] object-contain" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-semibold text-emerald-800 hover:text-emerald-950">
              Início
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-emerald-200 bg-white/90 px-5 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-white"
            >
              Entrar
            </Link>
          </div>
        </header>

        {/* Título Principal */}
        <div className="relative z-10 mx-auto max-w-4xl px-6 pt-8 pb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-4 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800 mb-4">
            Planos & Degustação Gratuita
          </div>
          <h1
            className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight"
            style={{ fontFamily: "var(--font-landing-serif)" }}
          >
            Escolha o plano ideal para a sua prática clínica
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Tecnologia assistiva com ética, privacidade LGPD e inteligência clínica sob controle humano. Comece com 7 dias grátis do plano Profissional.
          </p>

          {/* Banner Trial de 7 Dias */}
          <div className="mt-8 mx-auto max-w-2xl rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-emerald-50 p-5 shadow-sm text-center">
            <p className="text-sm font-bold text-teal-900">
              Experimente 7 dias grátis do Plano Profissional
            </p>
            <p className="text-xs text-teal-700 mt-1">
              Sem cartão de crédito obrigatório. Acesso imediato à página pública, agendamento e análises assistivas.
            </p>
            <Link
              href="/checkout?trial=true"
              className="mt-3 inline-flex items-center justify-center rounded-xl bg-teal-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-teal-700"
            >
              Iniciar Teste Gratuito de 7 Dias
            </Link>
          </div>
        </div>

        {/* Grade de 3 Planos */}
        <section className="relative z-10 mx-auto max-w-6xl px-6 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* 1. Plano Essencial */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Gestão & Prontuário
                </span>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{essencial.name}</h3>
                <p className="text-xs text-slate-500 mt-2 min-h-[36px]">{essencial.description}</p>

                <div className="mt-6 mb-6">
                  <span className="text-4xl font-extrabold text-slate-900">R$ 59,90</span>
                  <span className="text-sm text-slate-500 font-medium"> / mês</span>
                </div>

                <hr className="border-slate-100 my-4" />

                <ul className="space-y-3 text-xs text-slate-600">
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span><strong>Prontuário eletrônico completo</strong> e anamnese</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Digitação de notas durante e após a sessão</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Análises clínicas com <strong>IA Corporativa Cliniva</strong> inclusa</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Até <strong>150 análises com IA por mês</strong></span>
                  </li>
                  <li className="flex items-start gap-2.5 text-slate-400">
                    <span>✕</span>
                    <span>Transcrição de áudio contínua e Copiloto ao vivo</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-slate-400">
                    <span>✕</span>
                    <span>Página pública e agendamento online</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <Link
                  href="/checkout?plan=essencial"
                  className="w-full inline-flex items-center justify-center rounded-xl border-2 border-emerald-600 py-3 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition"
                >
                  Assinar Essencial
                </Link>
              </div>
            </div>

            {/* 2. Plano Premium */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Áudio & Copiloto
                </span>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{premium.name}</h3>
                <p className="text-xs text-slate-500 mt-2 min-h-[36px]">{premium.description}</p>

                <div className="mt-6 mb-6">
                  <span className="text-4xl font-extrabold text-slate-900">R$ 99,90</span>
                  <span className="text-sm text-slate-500 font-medium"> / mês</span>
                </div>

                <hr className="border-slate-100 my-4" />

                <ul className="space-y-3 text-xs text-slate-600">
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span><strong>Tudo do plano Essencial</strong></span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span><strong>Transcrição de áudio em tempo real</strong> (Whisper)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span><strong>Copiloto clínico ao vivo</strong> durante o atendimento</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Uso com chave OpenAI própria (BYOK) para funções ao vivo</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>150 análises de notas com IA Corporativa inclusas</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-slate-400">
                    <span>✕</span>
                    <span>Página pública e agendamento online</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <Link
                  href="/checkout?plan=premium"
                  className="w-full inline-flex items-center justify-center rounded-xl border-2 border-emerald-600 py-3 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition"
                >
                  Assinar Premium
                </Link>
              </div>
            </div>

            {/* 3. Plano Profissional (Destaque) */}
            <div className="relative rounded-3xl border-2 border-teal-600 bg-white p-8 shadow-xl flex flex-col justify-between">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-teal-600 px-4 py-1 text-[11px] font-bold text-white shadow uppercase tracking-wider">
                Mais Completo
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-teal-600">
                  Presença & Agendamento
                </span>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{profissional.name}</h3>
                <p className="text-xs text-slate-500 mt-2 min-h-[36px]">{profissional.description}</p>

                <div className="mt-6 mb-6">
                  <span className="text-4xl font-extrabold text-slate-900">R$ 199,90</span>
                  <span className="text-sm text-slate-500 font-medium"> / mês</span>
                </div>

                <hr className="border-teal-100 my-4" />

                <ul className="space-y-3 text-xs text-slate-600">
                  <li className="flex items-start gap-2.5">
                    <span className="text-teal-600 font-bold">✓</span>
                    <span><strong>Tudo do plano Premium</strong> (Áudio, Copiloto e Gestão)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-teal-600 font-bold">✓</span>
                    <span><strong>Página pública personalizada</strong> (/p/[slug])</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-teal-600 font-bold">✓</span>
                    <span><strong>Chat inteligente com IA Corporativa Cliniva</strong></span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-teal-600 font-bold">✓</span>
                    <span><strong>Agendamento automático</strong> direto na sua agenda Cliniva</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-teal-600 font-bold">✓</span>
                    <span>Até 500 conversas de agendamento por mês</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-teal-600 font-bold">✓</span>
                    <span>Exportação irrestrita de dados e prontuários (LGPD)</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <Link
                  href="/checkout?plan=profissional"
                  className="w-full inline-flex items-center justify-center rounded-xl bg-teal-600 py-3.5 text-xs font-bold text-white shadow-md hover:bg-teal-700 transition"
                >
                  Assinar Profissional
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Rodapé de Segurança e Ética */}
        <section className="mx-auto max-w-4xl px-6 text-center text-xs text-slate-500 space-y-2">
          <p>
            Cancelamento a qualquer momento sem fidelidade. Seus prontuários e anotações clínicas permanecem sempre acessíveis para leitura e exportação.
          </p>
          <p className="text-[11px] text-slate-400">
            A Cliniva não emite laudos nem substitui a responsabilidade clínica do psicólogo.
          </p>
        </section>
      </div>
    </main>
  );
}
