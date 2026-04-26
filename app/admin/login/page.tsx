'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type LoginFormData = {
  email: string;
  password: string;
};

type ModalState = {
  isOpen: boolean;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginFormData>({
    email: 'admin@cliniva.com.br',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  function showModal(type: 'success' | 'error' | 'info', title: string, message: string) {
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
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showModal('success', 'Bem-vindo!', 'Redirecionando para o painel...');
        setTimeout(() => {
          router.push('/admin/dashboard');
        }, 1500);
      } else {
        const json = (await res.json()) as { error?: string };
        showModal('error', 'Erro', json.error || 'Falha ao fazer login');
      }
    } catch (err) {
      showModal('error', 'Erro', 'Falha ao conectar ao servidor');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundColor: "#0f172a",
        backgroundImage: "linear-gradient(180deg, rgba(6, 18, 38, 0.55), rgba(6, 18, 38, 0.35)), url('/img/bg_admin.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/15 to-black/25"></div>
      {/* Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader
              className={`border-b-2 ${
                modal.type === 'success'
                  ? 'border-green-500 bg-green-50'
                  : modal.type === 'error'
                  ? 'border-red-500 bg-red-50'
                  : 'border-blue-500 bg-blue-50'
              }`}
            >
              <div className="flex items-center gap-3">
                {modal.type === 'success' && (
                  <svg
                    className="w-6 h-6 text-green-600"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
                {modal.type === 'error' && (
                  <svg
                    className="w-6 h-6 text-red-600"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                  </svg>
                )}
                {modal.type === 'info' && (
                  <svg
                    className="w-6 h-6 text-blue-600"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                  </svg>
                )}
                <CardTitle className="text-lg">{modal.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-gray-700 mb-6">{modal.message}</p>
              <Button
                onClick={closeModal}
                className="w-full bg-slate-700 hover:bg-slate-800"
              >
                OK
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Login Card */}
      <Card className="w-full max-w-[400px] shadow-lg rounded-2xl relative z-10 border border-white/70">
        <CardHeader className="bg-gradient-to-r from-slate-100 via-slate-50 to-indigo-50 text-slate-800 rounded-t-2xl border-b border-slate-200 pt-0 pb-0 min-h-0">
          <div className="flex flex-col items-center gap-0 text-center">
            <img
              src="/img/logo3.png"
              alt="Logo Cliniva"
              className="w-48 h-48 object-contain"
            />
            <div className="-mt-10">
              <CardTitle className="text-2xl font-semibold text-slate-800 leading-none">Cliniva Admin</CardTitle>
              <p className="text-sm text-slate-500 mt-0 mb-3">Painel de Controle</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-7">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Email *
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="admin@cliniva.com.br"
                className="mt-2 h-11 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 focus-visible:border-indigo-500"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-700">
                  Senha *
                </label>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="••••••••"
                  className="h-11 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 focus-visible:border-indigo-500 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 001 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.795l1.32 1.32c-.04.2-.08.4-.08.605 0 1.66 1.34 3 3 3 .2 0 .4-.04.6-.08l1.32 1.32c-.2.05-.4.08-.6.08-2.76 0-5-2.24-5-5 0-.2.03-.4.08-.6zm7.98-3.045c2.73.27 5.08 1.6 6.65 3.58l2.2-2.2c-1.9-1.52-4.24-2.68-6.8-3.01l-1.85 1.85z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Senha padrão: <code className="bg-gray-100 px-2 py-1 rounded">admin123</code>
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              Painel Administrativo <br />© 2025 Cliniva
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
