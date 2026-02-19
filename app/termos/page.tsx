export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 pb-16 pt-12 text-slate-900">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">
          Termos de uso
        </p>
        <h1 className="text-3xl font-semibold">Termos e condicoes</h1>
        <p className="text-sm text-slate-600">
          Estes termos regem o uso do Cliniva. Ao acessar a plataforma, voce concorda com as
          condicoes abaixo.
        </p>
      </header>

      <section className="mt-8 space-y-6 text-sm text-slate-600">
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">1. Uso permitido</h2>
          <p>
            A plataforma e destinada a profissionais de saude mental. O uso deve respeitar leis
            aplicaveis, etica profissional e consentimento do paciente.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">2. Sem diagnosticos</h2>
          <p>
            O Cliniva fornece sugestoes e organizacao de informacoes. Nao substitui julgamento
            clinico, diagnosticos ou prescricoes.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">3. Responsabilidades</h2>
          <p>
            O usuario e responsavel pelos dados inseridos e pela forma como utiliza os insights
            gerados.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">4. Contato</h2>
          <p>
            Duvidas? Fale com nossa equipe em contato@cliniva.com.br ou WhatsApp (91) 98175-5021.
          </p>
        </div>
      </section>
    </main>
  );
}
