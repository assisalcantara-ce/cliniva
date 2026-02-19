'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Stat Cards */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                Usuários Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">0</div>
              <p className="text-xs text-gray-500 mt-2">Terapeutas cadastrados</p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                MRR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">R$ 0,00</div>
              <p className="text-xs text-gray-500 mt-2">Receita por mês</p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                Tickets Abertos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">0</div>
              <p className="text-xs text-gray-500 mt-2">Pendentes de resposta</p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                Integrações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">✓</div>
              <p className="text-xs text-gray-500 mt-2">Status operacional</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Menu de Módulos */}
      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-4">Acesso Rápido</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/admin/usuarios">
            <Card className="cursor-pointer hover:shadow-md hover:border-blue-200 transition-all h-full bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-slate-900">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                  Usuários
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Gerenciar terapeutas, pacientes e permissões
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/financeiro">
            <Card className="cursor-pointer hover:shadow-md hover:border-green-200 transition-all h-full bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-slate-900">
                  <svg
                    className="w-6 h-6 text-green-600"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-5h3l-6-7z" />
                  </svg>
                  Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Planos, faturas e relatórios de receita
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/suporte">
            <Card className="cursor-pointer hover:shadow-md hover:border-purple-200 transition-all h-full bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-slate-900">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                  </svg>
                  Suporte
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Gerenciar tickets e atender usuários
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/integracoes">
            <Card className="cursor-pointer hover:shadow-md hover:border-orange-200 transition-all h-full bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-slate-900">
                  <svg
                    className="w-6 h-6 text-orange-600"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M11.99 5V1h-1v4c-6.63 0-11 4.37-11 11h4c0-3.86 3.14-7 7-7zm6.93-2c-.53 1.59-1.3 3.42-2.67 4.79-1.37 1.37-3.2 2.14-4.79 2.67v3.02c3.02-.63 5.29-1.9 6.68-3.29 1.39-1.39 2.66-3.66 3.29-6.68h-3.02zm.07 15c-.02.01-.04.02-.07.02-3.86 0-7-3.14-7-7v-4H5v4c0 6.63 4.37 11 11 11 .01 0 .02 0 .02 0h.01v-4z" />
                  </svg>
                  Integrações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Configurar Asaas e outras integrações
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
    );
}
