"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LoginFormData = {
  email: string;
  password: string;
};

type ModalState = {
  isOpen: boolean;
  type: "success" | "error" | "info";
  title: string;
  message: string;
};

const defaultPassword = "THERAPY2025";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginFormData>({
    email: "dra.cristiane@therapy.com",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  function showModal(type: "success" | "error" | "info", title: string, message: string) {
    setModal({ isOpen: true, type, title, message });
  }

  function closeModal() {
    setModal({ ...modal, isOpen: false });
  }

  function updateField(field: keyof LoginFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push("/dashboard");
        return;
      } else {
        const json = (await res.json()) as { error?: string };
        showModal("error", "Erro ao entrar", json.error || "Credenciais inválidas. Verifique seu e-mail e senha.");
        setIsLoading(false);
      }
    } catch {
      showModal("error", "Erro de conexão", "Não foi possível conectar ao servidor. Tente novamente em instantes.");
      setIsLoading(false);
    }
  }

  function autofillPassword() {
    setFormData((prev) => ({ ...prev, password: defaultPassword }));
  }

  return (
    <div 
      className="min-h-screen lg:h-screen lg:max-h-screen w-full flex items-center justify-center selection:bg-teal-100 selection:text-teal-900 relative font-sans bg-cover bg-center bg-no-repeat overflow-x-hidden lg:overflow-hidden p-4 sm:p-6 lg:p-8"
      style={{
        backgroundImage: "url('/img/bg_login.png')",
        backgroundColor: "#E2F6F5"
      }}
    >
      {/* Modal Dialog */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center z-50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div
              className={`px-6 py-4 border-b ${
                modal.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                  : modal.type === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-950"
                  : "border-teal-200 bg-teal-50 text-teal-950"
              }`}
            >
              <div className="flex items-center gap-3">
                {modal.type === "success" && (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
                {modal.type === "error" && (
                  <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                )}
                {modal.type === "info" && (
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="8" />
                    </svg>
                  </div>
                )}
                <h3 className="font-bold text-slate-900 text-base">{modal.title}</h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-700 leading-relaxed mb-6 font-medium">{modal.message}</p>
              <Button
                onClick={closeModal}
                className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-sm transition-all"
              >
                Entendi
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Responsive Grid Layout */}
      <main className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-4 items-center z-10">
        
        {/* ========================================================================= */}
        {/* LADO ESQUERDO: INSTITUCIONAL COM PROTEÇÃO DE CONTRASTE E LARGURA DEFINIDA */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 xl:col-span-5 w-full max-w-[490px] bg-white/70 backdrop-blur-md rounded-3xl p-5 sm:p-7 border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between space-y-4">
          
          {/* 1. Header Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-700/20 border border-teal-500 shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.5 19C8.5 16.5 10 15 11 14C10 13 9.5 11.5 10 9.5C10.8 6.5 13 5 16.5 5.5C19.5 6 20.5 8.5 20.5 11C20.5 13.5 19 15 18 16V17.5C18 18.5 17 19.5 16 20L15 20.5H10.5C9.5 20.5 8.5 19.8 8.5 19Z"
                />
                <circle cx="14" cy="9.5" r="1" fill="currentColor" stroke="none" />
                <circle cx="17" cy="9" r="1" fill="currentColor" stroke="none" />
                <circle cx="16" cy="12" r="1" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-slate-900 block leading-tight">
                Cliniva
              </span>
              <span className="text-[10px] font-extrabold text-teal-600 tracking-wider uppercase">
                Therapy Copilots
              </span>
            </div>
          </div>

          {/* 2. Headline Principal */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-black text-slate-900 tracking-tight leading-[1.18]">
              Seu consultório mais produtivo,<br />
              <span className="text-[#00897B] underline decoration-teal-300 decoration-wavy decoration-2 underline-offset-4">
                humano e inteligente.
              </span>
            </h1>
            <p className="text-xs sm:text-[14px] text-slate-700 leading-relaxed font-normal">
              O copiloto que organiza sua rotina, acompanha seus atendimentos e te dá mais tempo para o que realmente importa: <strong className="font-semibold text-slate-900">cuidar de pessoas</strong>.
            </p>
          </div>

          {/* 3. Benefícios em Grade 2x2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {/* Item 1: Agenda inteligente */}
            <div className="bg-white/90 border border-teal-100/90 rounded-2xl p-2.5 sm:p-3 shadow-2xs hover:border-teal-300 transition-all flex flex-col justify-between">
              <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-100/60 text-teal-600 flex items-center justify-center mb-1.5 shrink-0">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 leading-tight">Agenda inteligente</h2>
                <p className="text-[11px] text-slate-600 font-medium leading-tight mt-0.5">Organize sua rotina com facilidade</p>
              </div>
            </div>

            {/* Item 2: Prontuário completo */}
            <div className="bg-white/90 border border-teal-100/90 rounded-2xl p-2.5 sm:p-3 shadow-2xs hover:border-teal-300 transition-all flex flex-col justify-between">
              <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-100/60 text-teal-600 flex items-center justify-center mb-1.5 shrink-0">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 leading-tight">Prontuário completo</h2>
                <p className="text-[11px] text-slate-600 font-medium leading-tight mt-0.5">Tudo em um só lugar</p>
              </div>
            </div>

            {/* Item 3: Insights clínicos */}
            <div className="bg-white/90 border border-teal-100/90 rounded-2xl p-2.5 sm:p-3 shadow-2xs hover:border-teal-300 transition-all flex flex-col justify-between">
              <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-100/60 text-teal-600 flex items-center justify-center mb-1.5 shrink-0">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 leading-tight">Insights clínicos</h2>
                <p className="text-[11px] text-slate-600 font-medium leading-tight mt-0.5">Dados que apoiam suas decisões</p>
              </div>
            </div>

            {/* Item 4: Mais tempo para você */}
            <div className="bg-white/90 border border-teal-100/90 rounded-2xl p-2.5 sm:p-3 shadow-2xs hover:border-teal-300 transition-all flex flex-col justify-between">
              <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-100/60 text-teal-600 flex items-center justify-center mb-1.5 shrink-0">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 leading-tight">Mais tempo para você</h2>
                <p className="text-[11px] text-slate-600 font-medium leading-tight mt-0.5">Tecnologia a seu favor</p>
              </div>
            </div>
          </div>

          {/* 4. Quote no Rodapé da Esquerda */}
          <div className="pt-2 border-t border-slate-200/60 hidden sm:block">
            <p className="text-[11px] text-slate-600 font-medium italic">
              — &ldquo;Mais tecnologia. Mais cuidado. Mais pessoas.&rdquo;
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ESPAÇO CENTRAL: VAZIO PARA EXIBIÇÃO TOTAL DO ROBÔ E ÍCONES ORBITAIS       */}
        {/* ========================================================================= */}
        <div className="lg:col-span-2 xl:col-span-2 hidden lg:block pointer-events-none" />

        {/* ========================================================================= */}
        {/* LADO DIREITO: CARD DE AUTENTICAÇÃO LIMPO E ELEVADO                        */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 xl:col-span-5 flex justify-center lg:justify-end w-full">
          <div className="w-full max-w-[400px] xl:max-w-[420px] bg-white rounded-[32px] p-6 sm:p-8 shadow-2xl shadow-teal-900/10 border border-slate-100/90 relative">
            
            {/* Header Brand Dentro do Card */}
            <div className="flex flex-col items-center justify-center text-center mb-5">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-9 h-9 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-sm">
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.5 19C8.5 16.5 10 15 11 14C10 13 9.5 11.5 10 9.5C10.8 6.5 13 5 16.5 5.5C19.5 6 20.5 8.5 20.5 11C20.5 13.5 19 15 18 16V17.5C18 18.5 17 19.5 16 20L15 20.5H10.5C9.5 20.5 8.5 19.8 8.5 19Z"
                    />
                    <circle cx="14" cy="9.5" r="1" fill="currentColor" stroke="none" />
                    <circle cx="17" cy="9" r="1" fill="currentColor" stroke="none" />
                    <circle cx="16" cy="12" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </div>
                <div className="text-left">
                  <span className="text-xl font-black tracking-tight text-slate-900 block leading-none">
                    Cliniva
                  </span>
                  <span className="text-[9px] font-extrabold text-teal-600 tracking-wider uppercase block mt-0.5">
                    Therapy Copilots
                  </span>
                </div>
              </div>

              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Acesse sua conta
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Entre com seu e-mail e senha para continuar.
              </p>
            </div>

            {/* Formulário */}
            <form onSubmit={handleLogin} className="space-y-3.5">
              
              {/* Campo E-mail */}
              <div className="space-y-1">
                <label htmlFor="email" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  E-mail ou usuário
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="dra.cristiane@therapy.com"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 text-slate-900 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 transition-all bg-white"
                    required
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={autofillPassword}
                    className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 hover:underline transition-colors"
                  >
                    Preencher provisória
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    placeholder="Sua senha"
                    className="w-full h-11 pl-10 pr-11 rounded-xl border border-slate-200 text-slate-900 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 transition-all bg-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded transition-colors"
                    title={showPassword ? "Ocultar senha" : "Ver senha"}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                
                {/* Esqueci minha senha link */}
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => showModal("info", "Recuperação de Senha", "Para redefinir sua senha, solicite ao administrador da clínica ou utilize a senha provisória padrão: THERAPY2025")}
                    className="text-[11px] font-bold text-teal-600 hover:text-teal-700 transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              </div>

              {/* Botão Principal Entrar */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 mt-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md shadow-teal-600/20 hover:shadow-teal-600/30 transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer text-xs sm:text-sm"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Entrando...
                  </span>
                ) : (
                  <>
                    <span>Entrar</span>
                    <span className="text-base leading-none transition-transform group-hover:translate-x-0.5">→</span>
                  </>
                )}
              </Button>
            </form>

            {/* Divisor */}
            <div className="relative my-3.5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/80" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white px-2.5 text-slate-400 font-semibold tracking-wider">
                  ou
                </span>
              </div>
            </div>

            {/* Botão Secundário Administrador */}
            <Link
              href="/admin/login"
              className="w-full h-10 rounded-xl bg-teal-50/70 hover:bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center gap-2 text-xs font-bold transition-all hover:border-teal-200"
            >
              <svg className="w-3.5 h-3.5 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Acesso do administrador</span>
            </Link>

            {/* Rodapé do Card */}
            <div className="mt-4 pt-3 text-center space-y-0.5 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 font-medium">
                Sistema de gerenciamento de sessões de terapia
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                © 2025 Therapy Copilot
              </p>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
