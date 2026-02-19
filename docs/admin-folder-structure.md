# Admin Panel - Estrutura de Pastas

## Estrutura Recomendada

```
therapy-copilot/
│
├── app/
│   ├── (app)/                          # Área do Terapeuta (existente)
│   │   ├── dashboard/
│   │   ├── patients/
│   │   ├── sessions/
│   │   ├── materials/
│   │   └── settings/
│   │
│   ├── (admin)/                        # 🆕 Área de Admin
│   │   ├── login/
│   │   │   └── page.tsx               # Admin login form
│   │   │
│   │   ├── dashboard/
│   │   │   └── page.tsx               # Dashboard com stats
│   │   │
│   │   ├── usuarios/
│   │   │   ├── page.tsx               # Lista de terapeutas
│   │   │   ├── novo/
│   │   │   │   └── page.tsx           # Criar terapeuta
│   │   │   └── [id]/
│   │   │       └── page.tsx           # Editar terapeuta
│   │   │
│   │   ├── financeiro/
│   │   │   ├── page.tsx               # Dashboard financeiro
│   │   │   ├── subscricoes/
│   │   │   │   └── page.tsx           # Gerenciar planos
│   │   │   ├── faturas/
│   │   │   │   ├── page.tsx           # Lista de faturas
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx       # Detalhe da fatura
│   │   │   └── relatorios/
│   │   │       └── page.tsx           # Relatórios (MRR, ARR, etc)
│   │   │
│   │   ├── suporte/
│   │   │   ├── page.tsx               # Lista de tickets
│   │   │   └── [id]/
│   │   │       └── page.tsx           # Detalhe do ticket + chat
│   │   │
│   │   ├── integracoes/
│   │   │   ├── page.tsx               # Status de todas integrações
│   │   │   ├── asaas/
│   │   │   │   └── page.tsx           # Config Asaas
│   │   │   └── logs/
│   │   │       └── page.tsx           # Ver logs de sincronização
│   │   │
│   │   └── layout.tsx                 # 🔐 Admin Layout (sidebar, topbar)
│   │       └── // Redirect /login se não autenticado
│   │
│   ├── api/
│   │   ├── admin/
│   │   │   ├── login/
│   │   │   │   └── route.ts           # POST - Autenticar admin
│   │   │   ├── logout/
│   │   │   │   └── route.ts           # POST - Logout
│   │   │   └── me/
│   │   │       └── route.ts           # GET - Dados do admin atual
│   │   │
│   │   ├── admin-users/
│   │   │   └── route.ts               # GET/POST/PUT/DELETE terapeutas
│   │   │
│   │   ├── subscriptions/
│   │   │   ├── route.ts               # GET/POST planos
│   │   │   └── [id]/
│   │   │       └── route.ts           # PUT/DELETE plano
│   │   │
│   │   ├── invoices/
│   │   │   ├── route.ts               # GET/POST faturas
│   │   │   └── [id]/
│   │   │       ├── route.ts           # GET detalhe
│   │   │       └── status/
│   │   │           └── route.ts       # PUT - Marcar como paga
│   │   │
│   │   ├── tickets/
│   │   │   ├── route.ts               # GET tickets
│   │   │   └── [id]/
│   │   │       ├── route.ts           # GET/PUT ticket
│   │   │       └── messages/
│   │   │           └── route.ts       # POST - Responder ticket
│   │   │
│   │   └── integrations/
│   │       ├── route.ts               # GET/POST integrações
│   │       └── [id]/
│   │           ├── route.ts           # GET/PUT integração
│   │           ├── sync/
│   │           │   └── route.ts       # POST - Sincronizar agora
│   │           └── logs/
│   │               └── route.ts       # GET - Ver logs
│   │
│   └── login/                          # Terapeuta login (existente)
│       └── page.tsx
│
├── components/
│   ├── admin/                          # 🆕 Admin-specific components
│   │   ├── AdminLayout.tsx             # Wrapper layout
│   │   ├── AdminSidebar.tsx            # Sidebar navigation
│   │   ├── AdminTopbar.tsx             # Top navigation + user menu
│   │   │
│   │   ├── usuarios/
│   │   │   ├── UserTable.tsx           # Tabela de usuários
│   │   │   ├── UserForm.tsx            # Form criar/editar
│   │   │   └── UserModal.tsx           # Modal de ações
│   │   │
│   │   ├── financeiro/
│   │   │   ├── StatsCard.tsx           # Card de métrica (MRR, etc)
│   │   │   ├── SubscriptionTable.tsx   # Tabela de planos
│   │   │   ├── InvoiceTable.tsx        # Tabela de faturas
│   │   │   └── FinancialChart.tsx      # Gráfico de receita
│   │   │
│   │   ├── suporte/
│   │   │   ├── TicketTable.tsx         # Tabela de tickets
│   │   │   ├── TicketDetail.tsx        # Detalhe do ticket
│   │   │   ├── TicketChat.tsx          # Chat com usuário
│   │   │   └── TicketForm.tsx          # Form para responder
│   │   │
│   │   └── integracoes/
│   │       ├── IntegrationStatus.tsx   # Status da integração
│   │       ├── IntegrationForm.tsx     # Config form
│   │       └── LogViewer.tsx           # Visualizador de logs
│   │
│   └── (app)/                          # Terapeuta components (existente)
│
├── lib/
│   ├── admin/                          # 🆕 Admin utilities
│   │   ├── auth.ts                     # JWT, validação admin
│   │   ├── permissions.ts              # RBAC logic
│   │   ├── asaas.ts                    # SDK Asaas wrapper
│   │   └── audit.ts                    # Log de ações
│   │
│   ├── utils.ts                        # Geral
│   └── db/
│       └── therapist.ts                # Queries de terapeuta
│
├── supabase/
│   └── sql/
│       ├── 009_create_admin_users.sql
│       ├── 010_create_user_audits.sql
│       ├── 011_create_subscriptions.sql
│       ├── 012_create_invoices.sql
│       ├── 013_create_support_tickets.sql
│       └── 014_create_integrations.sql
│
├── docs/
│   ├── admin-panel-architecture.md     # Documentação completa
│   └── admin-implementation-checklist.md # Checklist
│
└── middleware.ts                        # Protege /admin/*
```

---

## 🎨 Componentes por Tipo

### Layout Components
- `AdminLayout.tsx` - Container principal
- `AdminSidebar.tsx` - Sidebar com menu
- `AdminTopbar.tsx` - Header com user menu

### Data Display
- `UserTable.tsx` - Tabela de usuários
- `SubscriptionTable.tsx` - Tabela de planos
- `InvoiceTable.tsx` - Tabela de faturas
- `TicketTable.tsx` - Tabela de tickets

### Forms
- `UserForm.tsx` - CRUD de usuários
- `IntegrationForm.tsx` - Config de integrações
- `TicketForm.tsx` - Respostas de tickets

### Details/Modals
- `UserModal.tsx` - Ações rápidas
- `TicketDetail.tsx` - Detalhe completo
- `TicketChat.tsx` - Chat com usuário

### Analytics
- `StatsCard.tsx` - Métrica com número
- `FinancialChart.tsx` - Gráfico de receita
- `IntegrationStatus.tsx` - Status da API

---

## 🔐 Middleware & Auth

```typescript
// middleware.ts

const PUBLIC_ROUTES = ['/admin/login'];
const ADMIN_ROUTES = ['/admin'];

if (pathname.startsWith('/admin')) {
  if (!adminToken) {
    if (pathname !== '/admin/login') {
      return NextResponse.redirect('/admin/login');
    }
  }
}
```

---

## 📦 Dependencies (Novos)

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",           // Hash de senhas
    "jsonwebtoken": "^9.1.2",       // JWT
    "recharts": "^2.10.0",          // Gráficos
    "date-fns": "^3.0.0"            // Datas
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.2",
    "@types/jsonwebtoken": "^9.0.5"
  }
}
```

---

## 🚀 Ordem de Criação Recomendada

1. ✅ Migrations (009-014)
2. ⏳ `middleware.ts` update
3. ⏳ `/api/admin/*` endpoints
4. ⏳ `lib/admin/*` utilities
5. ⏳ `components/admin/*` components
6. ⏳ `app/(admin)/*` pages

---

**Tudo pronto para estruturat! 🎯**
