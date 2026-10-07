"use client";

import { useState } from "react";

export function ContactSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    specialty: "psicologia",
    message: "",
  });

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    // Simulação suave de envio / feedback imediato
    setTimeout(() => {
      setStatus("success");
    }, 900);
  };

  return (
    <section id="contato" className="mx-auto w-full max-w-7xl px-6 sm:px-8 pt-0 pb-16 sm:pb-24 scroll-mt-20">
      <div className="rounded-[36px] bg-gradient-to-b from-white to-slate-50/80 border border-slate-200/90 p-8 sm:p-12 lg:p-16 shadow-xl shadow-slate-100 relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid gap-12 lg:grid-cols-12 relative z-10 items-start">
          {/* Coluna Esquerda: Contexto & Informações de Contato */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50/80 px-3.5 py-1 text-xs font-bold text-teal-800">
              <span>✦</span> CANAL DIRETO COM ESPECIALISTAS
            </div>

            <h2
              className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight"
              style={{ fontFamily: "var(--font-landing-serif)" }}
            >
              Fale com a equipe do Cliniva
            </h2>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Tire dúvidas sobre a tecnologia, agende uma demonstração prática do Copiloto ou
              solicite propostas personalizadas para sua clínica ou consultório.
            </p>

            <div className="space-y-4 pt-2">
              {/* Item 1: Email */}
              <div className="flex items-start gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">E-mail Direto</h4>
                  <p className="text-sm font-semibold text-slate-800">contato@cliniva.com.br</p>
                </div>
              </div>

              {/* Item 2: Atendimento */}
              <div className="flex items-start gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Tempo de Resposta</h4>
                  <p className="text-sm font-semibold text-slate-800">Retorno rápido em até 2 horas úteis</p>
                </div>
              </div>

              {/* Item 3: Segurança */}
              <div className="flex items-start gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Privacidade & Ética</h4>
                  <p className="text-sm font-semibold text-slate-800">Conformidade total com LGPD e diretrizes de saúde</p>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Formulário Interativo */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 lg:p-10 shadow-lg">
              {status === "success" ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "var(--font-landing-serif)" }}>
                    Mensagem enviada com sucesso!
                  </h3>
                  <p className="text-slate-600 text-sm max-w-md mx-auto leading-relaxed">
                    Obrigado pelo contato. Um dos nossos especialistas entrará em contato com você pelo e-mail ou WhatsApp informado em breve.
                  </p>
                  <button
                    onClick={() => {
                      setFormData({ name: "", email: "", phone: "", specialty: "psicologia", message: "" });
                      setStatus("idle");
                    }}
                    className="mt-6 inline-flex items-center justify-center rounded-xl border border-teal-200 bg-teal-50 px-5 py-2.5 text-xs font-bold text-teal-800 hover:bg-teal-100 transition"
                  >
                    Enviar nova mensagem
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Nome Completo */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Nome Completo *</label>
                      <input
                        type="text"
                        required
                        placeholder="Dr(a). Seu Nome"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition"
                      />
                    </div>

                    {/* E-mail Profissional */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">E-mail Profissional *</label>
                      <input
                        type="email"
                        required
                        placeholder="voce@consultorio.com.br"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* WhatsApp / Telefone */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">WhatsApp / Telefone *</label>
                      <input
                        type="tel"
                        required
                        placeholder="(11) 99999-9999"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition"
                      />
                    </div>

                    {/* Especialidade / Perfil */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Especialidade / Perfil</label>
                      <select
                        value={formData.specialty}
                        onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition"
                      >
                        <option value="psicologia">Psicólogo(a) / Terapeuta</option>
                        <option value="psiquiatria">Psiquiatra</option>
                        <option value="psicanalise">Psicanalista</option>
                        <option value="clinica">Clínica / Grupo de Atendimento</option>
                        <option value="outro">Outro Profissional da Saúde Mental</option>
                      </select>
                    </div>
                  </div>

                  {/* Mensagem */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Como podemos ajudar? *</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Conte-nos um pouco sobre a sua rotina clínica, dúvidas sobre recursos ou interesse em planos para equipes..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition resize-none"
                    />
                  </div>

                  {/* Botão de Envio */}
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="w-full h-12 rounded-xl bg-[#00897B] hover:bg-[#00796B] text-white font-bold text-sm shadow-md shadow-teal-800/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                  >
                    {status === "loading" ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span>Enviando mensagem...</span>
                      </>
                    ) : (
                      <>
                        <span>Enviar mensagem</span>
                        <span className="text-base">→</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-slate-400 text-center">
                    Seus dados estão protegidos sob sigilo e nunca serão compartilhados com terceiros.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
