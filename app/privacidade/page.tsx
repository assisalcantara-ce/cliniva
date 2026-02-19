export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 pb-16 pt-12 text-slate-900">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">
          Privacidade
        </p>
        <h1 className="text-3xl font-semibold">Politica de privacidade</h1>
        <p className="text-sm text-slate-600">
          Esta politica descreve como coletamos, utilizamos e protegemos dados na plataforma.
        </p>
      </header>

      <section className="mt-8 space-y-6 text-sm text-slate-600">
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">1. Dados coletados</h2>
          <p>
            Coletamos dados de cadastro e informacoes inseridas pelo usuario para operacao do
            servico.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">2. Uso de dados</h2>
          <p>
            Os dados sao utilizados para fornecer funcionalidades, suporte e melhoria continua da
            plataforma.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">3. Seguranca</h2>
          <p>
            Aplicamos medidas de seguranca para proteger informacoes sensiveis e respeitar
            requisitos de confidencialidade.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">4. Contato</h2>
          <p>
            Para solicitacoes sobre privacidade, contate contato@cliniva.com.br ou WhatsApp (91)
            98175-5021.
          </p>
        </div>
      </section>
    </main>
  );
}
