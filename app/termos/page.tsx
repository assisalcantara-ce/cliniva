import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 pb-16 pt-12 text-slate-900">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700"
        >
          Voltar para a landing
        </Link>
      </div>
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">
          Termos de uso
        </p>
        <h1 className="text-3xl font-semibold">Termos e condições</h1>
        <p className="text-sm text-slate-600">
          Estes termos regem o uso do Cliniva. Ao acessar a plataforma, você concorda com as
          condições abaixo.
        </p>
      </header>

      <section className="mt-8 space-y-6 text-sm text-slate-600">
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">1. Uso permitido</h2>
          <p>
            A plataforma é destinada a profissionais de saúde mental. O uso deve respeitar leis
            aplicáveis, ética profissional e consentimento do paciente.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">2. Sem diagnósticos</h2>
          <p>
            O Cliniva fornece sugestões e organização de informações. Não substitui julgamento
            clínico, diagnósticos ou prescrições.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">3. Responsabilidades</h2>
          <p>
            O usuário é responsável pelos dados inseridos e pela forma como utiliza os insights
            gerados.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">4. Contato</h2>
          <p>
            Dúvidas? Fale com nossa equipe em contato@cliniva.com.br ou WhatsApp (91) 98175-5021.
          </p>
        </div>
      </section>
    </main>
  );
}
