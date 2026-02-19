"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
        showModal("success", "Bem-vindo!", "Redirecionando...");
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
      } else {
        const json = (await res.json()) as { error?: string };
        showModal("error", "Erro", json.error || "Falha ao fazer login");
      }
    } catch (err) {
      showModal("error", "Erro", "Falha ao conectar ao servidor");
    } finally {
      setIsLoading(false);
    }
  }

  function autofillPassword() {
    setFormData((prev) => ({ ...prev, password: defaultPassword }));
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundColor: "#eef7f7",
        backgroundImage: "linear-gradient(180deg, rgba(7, 46, 60, 0.18), rgba(7, 46, 60, 0.08)), url('/img/bg_therapy.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed"
      }}
    >
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/5 to-black/10"></div>

      {/* Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-96 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className={`px-6 py-4 border-b-4 ${
              modal.type === "success" ? "border-green-500 bg-green-50" :
              modal.type === "error" ? "border-red-500 bg-red-50" :
              "border-teal-500 bg-teal-50"
            }`}>
              <div className="flex items-center gap-3">
                {modal.type === "success" && (
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                )}
                {modal.type === "error" && (
                  <svg className="w-6 h-6 text-red-600 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                  </svg>
                )}
                {modal.type === "info" && (
                  <svg className="w-6 h-6 text-teal-600 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                  </svg>
                )}
                <h3 className="font-semibold text-gray-900">{modal.title}</h3>
              </div>
            </div>
            <div className="px-6 py-6">
              <p className="text-sm text-gray-600 mb-6">{modal.message}</p>
              <Button 
                onClick={closeModal} 
                className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Login Container */}
      <div className="relative z-10 w-full max-w-[420px]">
        {/* Logo - Floating */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-20">
          <div className="w-20 h-20 bg-white rounded-full shadow-lg border-4 border-teal-600 flex items-center justify-center overflow-hidden animate-in fade-in-down duration-500">
            <img
              src="/img/Logor.png"
              alt="Logo Cliniva"
              className="w-16 h-16 object-contain"
            />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-[14px] shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-600 border border-white/70">
          {/* Header */}
          <div className="bg-teal-600 px-7 py-9 text-center text-white">
            <h1 className="text-2xl font-bold tracking-tight">CLINIVA.COM</h1>
            <p className="text-teal-100 text-sm mt-2 font-medium">Therapy Copilots</p>
          </div>

          {/* Form Content */}
          <div className="px-7 py-8">
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Email ou Usuário
                </label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full h-11 px-4 rounded-lg border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 transition-all"
                  required
                  aria-label="Email ou usuário"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={autofillPassword}
                    className="text-xs font-medium text-teal-600 hover:text-teal-700 hover:underline transition-colors"
                    aria-label="Usar senha provisória"
                  >
                    Usar provisória
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 px-4 rounded-lg border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 transition-all pr-12"
                    required
                    aria-label="Senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded p-1"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 001 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.795l1.32 1.32c-.04.2-.08.4-.08.605 0 1.66 1.34 3 3 3 .2 0 .4-.04.6-.08l1.32 1.32c-.2.05-.4.08-.6.08-2.76 0-5-2.24-5-5 0-.2.03-.4.08-.6zm7.98-3.045c2.73.27 5.08 1.6 6.65 3.58l2.2-2.2c-1.9-1.52-4.24-2.68-6.8-3.01l-1.85 1.85z"/>
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Provisória: <code className="bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono text-xs">{defaultPassword}</code>
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 mt-8 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-all duration-200 hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Entrando...
                  </span>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center leading-relaxed">
                Sistema de gerenciamento de sessões de terapia<br />
                <span className="font-medium">© 2025 Therapy Copilot</span>
              </p>
              <div className="mt-3 text-center">
                <a
                  href="/admin/login"
                  className="text-xs font-medium text-teal-600 hover:text-teal-700 hover:underline transition-colors"
                >
                  Acesso do administrador
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Text */}
        <p className="text-center text-xs text-white/70 mt-6">
          Desenvolvido com cuidado para profissionais de saúde
        </p>
      </div>
    </div>
  );
}
