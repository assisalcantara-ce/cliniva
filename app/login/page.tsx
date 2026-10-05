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
    <div className="min-h-screen w-full bg-[#f8fbfb] flex flex-col justify-between selection:bg-teal-100 selection:text-teal-900 relative overflow-x-hidden font-sans">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-teal-200/20 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-cyan-200/20 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3" />
      <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-teal-100/30 rounded-full blur-2xl pointer-events-none" />

      {/* Modal Dialog */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div
              className={`px-6 py-4 border-b ${
                modal.type === "success"
                  ? "border-emerald-200 bg-emerald-50/80 text-emerald-900"
                  : modal.type === "error"
                  ? "border-rose-200 bg-rose-50/80 text-rose-900"
                  : "border-teal-200 bg-teal-50/80 text-teal-900"
              }`}
            >
              <div className="flex items-center gap-3">
                {modal.type === "success" && (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
                {modal.type === "error" && (
                  <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                )}
                {modal.type === "info" && (
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  </div>
                )}
                <h3 className="font-bold text-slate-900 text-base">{modal.title}</h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 leading-relaxed mb-6">{modal.message}</p>
              <Button
                onClick={closeModal}
                className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl shadow-sm transition-all"
              >
                Entendi
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex items-center justify-center relative z-10">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* ======================================================== */}
          {/* LADO ESQUERDO: INSTITUCIONAL / MARKETING / COPILOTO      */}
          {/* ======================================================== */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-8 lg:pr-6">
            {/* Header Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-teal-700/20">
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
                <span className="text-xl font-black tracking-tight text-slate-900 block leading-tight">
                  Cliniva
                </span>
                <span className="text-[11px] font-bold text-teal-600 tracking-wider uppercase">
                  Therapy Copilots
                </span>
              </div>
            </div>

            {/* Main Headline */}
            <div className="space-y-4 max-w-xl">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
                Seu consultório mais produtivo,{" "}
                <span className="text-teal-600 underline decoration-teal-300 decoration-wavy decoration-2 underline-offset-6">
                  humano e inteligente.
                </span>
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                O copiloto que organiza sua rotina, acompanha seus atendimentos e te dá mais tempo para o que realmente importa: <strong className="font-semibold text-slate-800">cuidar de pessoas</strong>.
              </p>
            </div>

            {/* Center Visual Mockup & Floating Pills */}
            <div className="relative py-4">
              <div className="relative bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-white/80 p-6 sm:p-8 rounded-3xl border border-teal-100/80 shadow-sm backdrop-blur-sm overflow-hidden">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Copilot Mascot / Visual Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-teal-600 via-teal-500 to-cyan-400 p-1 shadow-xl shadow-teal-600/25 flex items-center justify-center">
                      <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-teal-500/30 to-transparent" />
                        <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12 text-cyan-300 relative z-10" stroke="currentColor" strokeWidth="1.75">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8.5 19C8.5 16.5 10 15 11 14C10 13 9.5 11.5 10 9.5C10.8 6.5 13 5 16.5 5.5C19.5 6 20.5 8.5 20.5 11C20.5 13.5 19 15 18 16V17.5C18 18.5 17 19.5 16 20L15 20.5H10.5C9.5 20.5 8.5 19.8 8.5 19Z"
                          />
                          <circle cx="14" cy="9.5" r="1.5" fill="#00D2C4" stroke="none" />
                          <circle cx="17" cy="9" r="1.5" fill="#00D2C4" stroke="none" />
                          <circle cx="16" cy="12" r="1.5" fill="#00D2C4" stroke="none" />
                          <path d="M14 9.5L17 9M17 9L16 12M14 9.5L16 12" stroke="#00D2C4" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                    </div>
                    {/* Live Pulse Badge */}
                    <div className="absolute -bottom-2 -right-2 bg-white px-2.5 py-1 rounded-full shadow-md border border-teal-100 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Copilot Ativo</span>
                    </div>
                  </div>

                  {/* Feature Highlights Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                    {/* Item 1 */}
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/90 border border-slate-100 shadow-sm hover:border-teal-200 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-xs font-bold text-slate-900">Agenda inteligente</h2>
                        <p className="text-[11px] text-slate-500 truncate">Rotina sem atritos</p>
                      </div>
                    </div>

                    {/* Item 2 */}
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/90 border border-slate-100 shadow-sm hover:border-teal-200 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-xs font-bold text-slate-900">Prontuário completo</h2>
                        <p className="text-[11px] text-slate-500 truncate">Tudo em um só lugar</p>
                      </div>
                    </div>

                    {/* Item 3 */}
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/90 border border-slate-100 shadow-sm hover:border-teal-200 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                          <line x1="12" y1="22.08" x2="12" y2="12" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-xs font-bold text-slate-900">Insights clínicos</h2>
                        <p className="text-[11px] text-slate-500 truncate">Apoio a decisões</p>
                      </div>
                    </div>

                    {/* Item 4 */}
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/90 border border-slate-100 shadow-sm hover:border-teal-200 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-xs font-bold text-slate-900">Mais presença</h2>
                        <p className="text-[11px] text-slate-500 truncate">Foco total no paciente</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Quote / Institutional Note */}
            <div className="pt-2 border-t border-slate-200/60 hidden sm:block">
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                <span className="font-medium text-slate-700">Mais tecnologia. Mais cuidado. Mais pessoas.</span>
              </p>
            </div>
          </div>

          {/* ======================================================== */}
          {/* LADO DIREITO: CARD DE AUTENTICAÇÃO                        */}
          {/* ======================================================== */}
          <div className="lg:col-span-5 flex justify-center w-full">
            <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-200/50 border border-slate-100 relative">
              
              {/* Card Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center shadow-inner">
                  <img
                    src="/img/logo3.png"
                    alt="Logo Cliniva"
                    className="w-10 h-10 object-contain"
                    onError={(e) => {
                      // Fallback icon if logo image is missing
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Acesse sua conta
                </h2>
                <p className="text-sm text-slate-500 mt-1.5">
                  Entre com seu e-mail e senha para continuar.
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email Input */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    E-mail ou Usuário
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                      className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10 transition-all bg-slate-50/50 hover:bg-white focus:bg-white"
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Senha
                    </label>
                    <button
                      type="button"
                      onClick={autofillPassword}
                      className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline transition-colors"
                    >
                      Preencher provisória
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-12 pl-11 pr-12 rounded-xl border border-slate-200 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10 transition-all bg-slate-50/50 hover:bg-white focus:bg-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded transition-colors"
                      title={showPassword ? "Ocultar senha" : "Ver senha"}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="flex justify-between items-center pt-1 text-xs">
                    <span className="text-slate-400">
                      Provisória: <code className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold text-[11px]">{defaultPassword}</code>
                    </span>
                    <button
                      type="button"
                      onClick={() => showModal("info", "Recuperação de Senha", "Para redefinir sua senha, solicite ao administrador da sua clínica ou utilize a senha provisória padrão.")}
                      className="font-medium text-slate-500 hover:text-teal-600 transition-colors"
                    >
                      Esqueci a senha
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 mt-6 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-600/20 hover:shadow-teal-600/30 transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer text-sm"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Entrando no Cliniva...
                    </span>
                  ) : (
                    <>
                      <span>Entrar</span>
                      <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider">
                    ou
                  </span>
                </div>
              </div>

              {/* Secondary Admin Action */}
              <Link
                href="/admin/login"
                className="w-full h-11 rounded-xl bg-teal-50/70 hover:bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center gap-2 text-xs font-bold transition-all hover:border-teal-200"
              >
                <svg className="w-4 h-4 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>Acesso do Administrador</span>
              </Link>

              {/* Footer Links */}
              <div className="mt-8 pt-6 border-t border-slate-100 text-center space-y-3">
                <p className="text-[11px] text-slate-400">
                  Sistema de gerenciamento de sessões de terapia<br />
                  <span className="font-semibold text-slate-500">© 2025 Therapy Copilot • Cliniva</span>
                </p>
                <div>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-600 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="19" y1="12" x2="5" y2="12" />
                      <polyline points="12 19 5 12 12 5" />
                    </svg>
                    <span>Voltar ao site inicial</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Subtle Bottom Bar */}
      <footer className="w-full py-4 text-center text-xs text-slate-400 border-t border-slate-200/50 bg-white/50 backdrop-blur-xs relative z-10">
        Desenvolvido com excelência para a prática clínica humanizada
      </footer>
    </div>
  );
}
