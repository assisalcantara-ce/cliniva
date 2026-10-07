export function EthicsSection() {
  const ethicsCards = [
    {
      title: "Consentimento e transparência",
      description: "Consentimento obrigatório para qualquer gravação ou transcrição.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      ),
    },
    {
      title: "Dados protegidos",
      description: "Dados sensíveis e clínicos tratados com sigilo rigoroso e criptografia.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      ),
    },
    {
      title: "Suporte, não substituição",
      description: "Sem diagnósticos, prescrições ou decisões automatizadas — apenas suporte reflexivo.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
  ];

  return (
    <section id="profissionais" className="relative w-full overflow-hidden bg-[#eaf6f5] py-16 sm:py-20 lg:py-24 mb-16 sm:mb-24 lg:mb-28">
      {/* Background Image da Terapeuta com fade e overlay na horizontal */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/img/bg_ethics1.png')",
        }}
      />

      {/* Container Centralizado para o Card Flutuante */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center lg:justify-end">
        <div className="w-full lg:w-[82%] xl:w-[78%] rounded-[28px] sm:rounded-[36px] bg-white/95 backdrop-blur-md border border-white/80 p-6 sm:p-10 lg:p-12 shadow-2xl shadow-teal-900/10">
          <div className="grid gap-8 lg:grid-cols-12 items-center">
            
            {/* Coluna Esquerda do Card: Texto e Identidade */}
            <div className="lg:col-span-6 xl:col-span-6 space-y-4 sm:space-y-5">
              <div className="inline-block">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-[#00897B]">
                  ÉTICA E SEGURANÇA
                </span>
              </div>

              <h2
                className="text-2xl sm:text-3xl lg:text-[34px] font-bold text-slate-900 leading-[1.2]"
                style={{ fontFamily: "var(--font-landing-serif)" }}
              >
                Sugestões baseadas em contexto e evidências,{" "}
                <span className="text-[#00897B] font-bold">nunca diagnósticos.</span>
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg">
                O Cliniva organiza insights, perguntas e hipóteses com apontamentos claros de
                evidências. Ele foi pensado para ampliar a atenção do profissional, não para
                substituir julgamento clínico, diagnóstico ou conduta terapêutica.
              </p>
            </div>

            {/* Coluna Direita do Card: 3 Cards Estruturados com Ícones */}
            <div className="lg:col-span-6 xl:col-span-6 space-y-3.5">
              {ethicsCards.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 rounded-2xl border border-teal-100/90 bg-white/90 p-4 sm:p-4.5 shadow-2xs hover:shadow-xs transition-all hover:border-teal-300"
                >
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-teal-50/90 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100">
                    {item.icon}
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      {item.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-600 leading-normal">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
