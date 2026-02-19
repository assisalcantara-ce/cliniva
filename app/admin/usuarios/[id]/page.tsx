'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function EditarUsuarioPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    email: '',
    crp: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    bio: '',
    is_active: true,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadTherapist();
  }, [id]);

  async function loadTherapist() {
    try {
      const res = await fetch(`/api/admin-users/${id}`);
      if (res.ok) {
        const { therapist } = await res.json();
        setFormData({
          display_name: therapist.display_name || '',
          email: therapist.email || '',
          crp: therapist.crp || '',
          phone: therapist.phone || '',
          address: therapist.address || '',
          city: therapist.city || '',
          state: therapist.state || '',
          zip_code: therapist.zip_code || '',
          bio: therapist.bio || '',
          is_active: therapist.is_active,
        });
      } else {
        setError('Terapeuta não encontrado');
      }
    } catch (err) {
      setError('Erro ao carregara dados');
    } finally {
      setIsLoading(false);
    }
  }

  function updateField(field: string, value: any) {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const res = await fetch(`/api/admin-users/${id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setSuccess('Perfil atualizado com sucesso!');
        setTimeout(() => {
          router.push('/admin/usuarios');
        }, 1500);
      } else {
        const json = await res.json();
        setError(json.error || 'Erro ao atualizar');
      }
    } catch (err) {
      setError('Erro ao conectar ao servidor');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="text-slate-900">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/usuarios" className="text-blue-600 hover:text-blue-700">
            ← Voltar
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mt-4">Editar Usuário</h1>
          <p className="text-slate-600 mt-1">Atualizar dados do terapeuta</p>
        </div>

        {/* Form Card */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Informações Profissionais</CardTitle>
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

              {/* Basic Info */}
              <div>
                <label className="text-sm font-medium text-slate-700">Nome *</label>
                <Input
                  type="text"
                  value={formData.display_name}
                  onChange={e => updateField('display_name', e.target.value)}
                  className="mt-2 bg-white border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Email *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => updateField('email', e.target.value)}
                  className="mt-2 bg-slate-50 border-slate-300 text-slate-900"
                  disabled
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">CRP/CRM</label>
                <Input
                  type="text"
                  value={formData.crp}
                  onChange={e => updateField('crp', e.target.value)}
                  placeholder="Ex: CRP 00000/00"
                  className="mt-2 bg-white border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Telefone</label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={e => updateField('phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="mt-2 bg-white border-slate-300 text-slate-900"
                />
              </div>

              {/* Endereço */}
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-slate-900 font-semibold mb-4">Endereço</h3>
                <div>
                  <label className="text-sm font-medium text-slate-700">Rua</label>
                  <Input
                    type="text"
                    value={formData.address}
                    onChange={e => updateField('address', e.target.value)}
                    placeholder="Rua/Avenida e número"
                    className="mt-2 bg-white border-slate-300 text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Cidade</label>
                    <Input
                      type="text"
                      value={formData.city}
                      onChange={e => updateField('city', e.target.value)}
                      className="mt-2 bg-white border-slate-300 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Estado</label>
                    <Input
                      type="text"
                      value={formData.state}
                      onChange={e => updateField('state', e.target.value)}
                      maxLength={2}
                      placeholder="SP"
                      className="mt-2 bg-white border-slate-300 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">CEP</label>
                    <Input
                      type="text"
                      value={formData.zip_code}
                      onChange={e => updateField('zip_code', e.target.value)}
                      placeholder="00000-000"
                      className="mt-2 bg-white border-slate-300 text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="border-t border-slate-200 pt-6">
                <label className="text-sm font-medium text-slate-700">Biografia</label>
                <textarea
                  value={formData.bio}
                  onChange={e => updateField('bio', e.target.value)}
                  placeholder="Descreva um pouco sobre você..."
                  rows={4}
                  className="mt-2 w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400"
                />
              </div>

              {/* Status */}
              <div className="border-t border-slate-200 pt-6">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={e => updateField('is_active', e.target.checked)}
                    className="w-4 h-4 rounded bg-white border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-700">Usuário Ativo</span>
                </label>
              </div>

              <div className="flex gap-4 pt-6 border-t border-slate-200">
                <Link href="/admin/usuarios" className="flex-1">
                  <Button type="button" variant="secondary" className="w-full">
                    Cancelar
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
