'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface Therapist {
  id: string;
  display_name: string;
  email: string;
  crp?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  organizations?: { name: string; cnpj: string } | null;
}

export default function UsuariosPage() {
  const router = useRouter();
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadTherapists();
  }, []);

  async function loadTherapists() {
    try {
      const res = await fetch('/api/admin-users');
      if (res.ok) {
        const { therapists } = await res.json();
        setTherapists(therapists || []);
      } else {
        console.error('Failed to load therapists');
      }
    } catch (err) {
      console.error('Error loading therapists:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm('Tem certeza que deseja desativar este terapeuta?')) return;

    try {
      const res = await fetch(`/api/admin-users/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setTherapists(prev => prev.map(t => t.id === id ? { ...t, is_active: false } : t));
        alert('Terapeuta desativado com sucesso');
      }
    } catch (err) {
      alert('Erro ao desativar terapeuta');
    }
  }

  const filtered = therapists.filter(t => {
    const matchSearch =
      t.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus =
      filterStatus === 'all' || (filterStatus === 'active' ? t.is_active : !t.is_active);
    return matchSearch && matchStatus;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="text-slate-900">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Usuários</h1>
            <p className="text-slate-600 mt-1">Gerenciar terapeutas cadastrados</p>
          </div>
          <Link href="/admin/usuarios/novo">
            <Button className="bg-blue-600 hover:bg-blue-700">
              + Novo Usuário
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="mb-6 bg-white border-slate-200">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Buscar</label>
                <Input
                  type="text"
                  placeholder="Nome ou email..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="mt-2 bg-white border-slate-300 text-slate-900"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Status</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value as any)}
                  className="mt-2 w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"
                >
                  <option value="all">Todos</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">
              Total: {filtered.length} usuário(s)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Nome
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      CRP/CRM
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        Nenhum usuário encontrado
                      </td>
                    </tr>
                  ) : (
                    filtered.map(therapist => (
                      <tr key={therapist.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-900">{therapist.display_name}</td>
                        <td className="px-4 py-3 text-slate-600">{therapist.email}</td>
                        <td className="px-4 py-3 text-slate-600">{therapist.crp || '-'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              therapist.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {therapist.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 space-x-2">
                          <Link href={`/admin/usuarios/${therapist.id}`}>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-xs"
                            >
                              Editar
                            </Button>
                          </Link>
                          {therapist.is_active && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeactivate(therapist.id)}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              Desativar
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
