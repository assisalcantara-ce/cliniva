'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function NovoUsuarioPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function updateField(field: string, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validations
    if (!formData.full_name) {
      setError('Nome é obrigatório');
      return;
    }
    if (!formData.email) {
      setError('Email é obrigatório');
      return;
    }
    if (formData.password.length < 6) {
      setError('Senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Senhas não conferem');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/admin-users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.full_name,
          email: formData.email,
          password: formData.password,
        }),
      });

      if (res.ok) {
        setSuccess('Terapeuta criado com sucesso!');
        setTimeout(() => {
          router.push('/admin/usuarios');
        }, 1500);
      } else {
        const json = await res.json();
        setError(json.error || 'Erro ao criar usuário');
      }
    } catch (err) {
      setError('Erro ao conectar ao servidor');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/usuarios" className="text-blue-600 hover:text-blue-700">
            ← Voltar
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mt-4">Novo Usuário</h1>
          <p className="text-slate-600 mt-1">Criar novo terapeuta no sistema</p>
        </div>

        {/* Form Card */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Dados do Terapeuta</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Nome Completo *
                </label>
                <Input
                  type="text"
                  value={formData.full_name}
                  onChange={e => updateField('full_name', e.target.value)}
                  placeholder="Ex: Dra. Cristiane Silva"
                  className="mt-2 bg-white border-slate-300 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Email *
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => updateField('email', e.target.value)}
                  placeholder="dra.cristiane@example.com"
                  className="mt-2 bg-white border-slate-300 text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Senha *
                  </label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={e => updateField('password', e.target.value)}
                    placeholder="••••••••"
                    className="mt-2 bg-white border-slate-300 text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Confirmar Senha *
                  </label>
                  <Input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={e => updateField('confirmPassword', e.target.value)}
                    placeholder="••••••••"
                    className="mt-2 bg-white border-slate-300 text-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-slate-200">
                <Link href="/admin/usuarios" className="flex-1">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                  >
                    Cancelar
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? 'Criando...' : 'Criar Usuário'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
