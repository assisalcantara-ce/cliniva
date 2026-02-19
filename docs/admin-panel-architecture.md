# 🔐 Admin Control Panel - Arquitetura

**Objetivo:** Painel interno para equipe Cliniva gerenciar usuários, financeiro, suporte e integrações.

---

## 📋 Visão Geral

```
┌─────────────────────────────────────────────────────┐
│         Admin Control Panel (/admin)                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Usuários │  │Financeiro│  │ Suporte  │         │
│  │          │  │          │  │ (Tickets)│         │
│  └──────────┘  └──────────┘  └──────────┘         │
│                                                     │
│  ┌──────────────────────────────────────────────┐ │
│  │   Integrações (Asaas, etc)                   │ │
│  └──────────────────────────────────────────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Acesso:**
- ✅ Apenas equipe Cliniva (super admin)
- ✅ Separado da área terapêutica
- ✅ Autenticação independente (@cliniva.com.br)

---

## 🗂️ Módulos Principais

### 1️⃣ **Usuários**
**O que faz:**
- CRUD de terapeutas/pacientes
- Status (ativo/inativo), bloqueio, autorizações
- Visualizar pacientes cadastrados por terapeuta
- Resetar senhas, gerar tokens provisórios
- Auditoria de logins (last_login, IP, navegador)

**Tabelas afetadas:**
- `users` (usuários)
- `therapists` (terapeutas)
- `patients` (pacientes)
- `user_audits` (novo - rastreamento)

**Dados exibidos:**
```
- Email
- Nome completo
- CNPJ (org)
- Status (ativo/inativo/bloqueado)
- Data de criação
- Último acesso
- Plano/assinatura
- Pacientes ativos
```

---

### 2️⃣ **Financeiro**
**O que faz:**
- Visualizar receitas/despesas
- Planos de assinatura (basic, pro, enterprise)
- Faturamento mensal por terapeuta
- Relatórios financeiros
- Integração com Asaas (sincronizar pagamentos)

**Tabelas necessárias:**
- `subscriptions` (planos dos usuários)
- `invoices` (faturas)
- `payment_logs` (histórico de pagamentos via Asaas)

**Dados exibidos:**
```
- Receita total/mês
- Usuários por plano
- Status de pagamento (pago/pendente/atrasado)
- MRR (Monthly Recurring Revenue)
- Churn rate
```

---

### 3️⃣ **Suporte (Tickets)**
**O que faz:**
- CRUD de tickets de suporte
- Categorias: Bug, Feature Request, Facturação, Geral
- Atribuir à equipe
- Rastreamento de status (novo, em andamento, resolvido)
- Notas internas para equipe

**Tabelas necessárias:**
- `support_tickets` (tickets)
- `ticket_messages` (conversa)
- `ticket_categories` (temas)

**Dados exibidos:**
```
- ID do ticket
- Terapeuta/empresa
- Categoria
- Status
- Prioridade
- Data de abertura
- Tempo de resposta
```

---

### 4️⃣ **Integrações**
**O que faz:**
- Criptografar/armazenar credenciais de API (Asaas, etc)
- Visualizar status de sincronização
- Logs de requisições
- Configurar webhooks

**Asaas específico:**
- ✅ Criar clientes
- ✅ Gerar cobranças/invoices
- ✅ Receber webhooks de pagamento
- ✅ Sincronizar status automaticamente

**Tabelas necessárias:**
- `integrations` (credenciais)
- `integration_logs` (requisições/erros)

---

## 🗄️ Schema de Banco de Dados (Novos)

### `admin_users` (equipe Cliniva)
```sql
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50), -- 'super_admin', 'moderator', 'support'
  permissions JSON, -- RBAC flexível
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_users_email ON public.admin_users(email);
CREATE INDEX idx_admin_users_role ON public.admin_users(role);
```

### `user_audits` (rastreamento)
```sql
CREATE TABLE public.user_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  action VARCHAR(50), -- 'login', 'logout', 'password_change', etc
  ip_address VARCHAR(50),
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_audits_user_id ON public.user_audits(user_id);
CREATE INDEX idx_user_audits_timestamp ON public.user_audits(timestamp);
```

### `subscriptions` (planos)
```sql
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES public.therapists(id),
  plan VARCHAR(50), -- 'basic', 'pro', 'enterprise'
  status VARCHAR(50), -- 'active', 'paused', 'cancelled'
  billing_cycle VARCHAR(20), -- 'monthly', 'yearly'
  amount_cents INTEGER, -- em centavos (ex: 9900 = R$99.00)
  next_billing_date DATE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscriptions_therapist_id ON public.subscriptions(therapist_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
```

### `invoices` (faturas)
```sql
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id),
  external_id VARCHAR(255), -- ID do Asaas
  amount_cents INTEGER,
  status VARCHAR(50), -- 'draft', 'pending', 'paid', 'overdue', 'cancelled'
  payment_method VARCHAR(50), -- 'credit_card', 'pix', 'boleto'
  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoices_subscription_id ON public.invoices(subscription_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);
```

### `support_tickets` (suporte)
```sql
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50), -- 'bug', 'feature', 'billing', 'general'
  priority VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
  status VARCHAR(50), -- 'open', 'in_progress', 'resolved', 'closed'
  assigned_to UUID REFERENCES public.admin_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);
```

### `ticket_messages` (conversa)
```sql
CREATE TABLE public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id),
  sender_id UUID NOT NULL, -- pode ser users ou admin_users
  message TEXT NOT NULL,
  attachments JSON, -- array de URLs
  is_internal BOOLEAN DEFAULT false, -- só equipe vê
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
```

### `integrations` (credenciais)
```sql
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL, -- 'asaas', 'stripe', etc
  config JSONB NOT NULL, -- credenciais criptografadas
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMP WITH TIME ZONE,
  webhook_url VARCHAR(500),
  webhook_secret VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_integrations_provider ON public.integrations(provider);
```

### `integration_logs` (auditoria)
```sql
CREATE TABLE public.integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES public.integrations(id),
  event VARCHAR(100),
  status VARCHAR(20), -- 'success', 'error'
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_integration_logs_integration_id ON public.integration_logs(integration_id);
CREATE INDEX idx_integration_logs_timestamp ON public.integration_logs(timestamp);
```

---

## 🔑 Autenticação Admin

**Fluxo:**
```
1. Admin faz login em /admin/login
2. Email + senha são validados contra tabela `admin_users`
3. Se válido → gera JWT + cookie HTTP-only
4. Middleware verifica permissões por role
5. Cada ação é auditada em `integration_logs`
```

**Roles:**
- 🔴 `super_admin` - acesso total
- 🟡 `moderator` - gerenciar usuários, suporte
- 🟢 `support` - apenas tickets

**Separação de contexto:**
```
Login de Terapeuta:
  /login → /dashboard (therapist)

Login de Admin:
  /admin/login → /admin/dashboard
```

---

## 📁 Estrutura de Pastas

```
therapy-copilot/
├── app/
│   ├── (app)/                 # Área do terapeuta (existente)
│   │   ├── dashboard/
│   │   ├── patients/
│   │   └── sessions/
│   │
│   └── (admin)/               # Área de admin (NOVA)
│       ├── login/
│       │   └── page.tsx
│       ├── dashboard/
│       │   └── page.tsx
│       ├── usuarios/
│       │   ├── page.tsx       # Lista
│       │   ├── [id]/
│       │   │   └── page.tsx   # Editar
│       │   └── novo/
│       │       └── page.tsx   # Criar
│       ├── financeiro/
│       │   ├── page.tsx
│       │   ├── faturas/
│       │   ├── planos/
│       │   └── relatorios/
│       ├── suporte/
│       │   ├── page.tsx       # Lista de tickets
│       │   └── [id]/
│       │       └── page.tsx   # Detalhe + conversa
│       ├── integracoes/
│       │   ├── page.tsx
│       │   └── [provider]/
│       │       └── page.tsx   # Config Asaas, etc
│       └── layout.tsx         # Layout admin (sidebar, topbar)
│
│   └── api/
│       ├── admin/
│       │   ├── login/
│       │   ├── auth/
│       │   └── ...
│       ├── admin-users/       # CRUD de admin_users
│       ├── subscriptions/     # CRUD de planos
│       ├── invoices/          # CRUD de faturas
│       ├── tickets/           # CRUD de tickets
│       └── integrations/      # CRUD de integrations
│
├── components/
│   └── admin/
│       ├── AdminSidebar.tsx
│       ├── AdminTopbar.tsx
│       ├── TicketCard.tsx
│       ├── InvoiceTable.tsx
│       └── IntegrationStatus.tsx
│
├── lib/
│   ├── admin/
│   │   ├── auth.ts            # JWT, validação
│   │   ├── permissions.ts     # RBAC
│   │   └── asaas.ts           # SDK Asaas
│   └── ...
│
└── supabase/
    └── sql/
        ├── 009_admin_users.sql
        ├── 010_user_audits.sql
        ├── 011_subscriptions.sql
        ├── 012_invoices.sql
        ├── 013_support_tickets.sql
        └── 014_integrations.sql
```

---

## 🔗 APIs Necessárias

### Admin Auth
- `POST /api/admin/login` - Autenticação
- `POST /api/admin/logout` - Logout
- `GET /api/admin/me` - Dados do admin

### Usuários
- `GET /api/admin-users` - Listar
- `GET /api/admin-users/[id]` - Detalhe
- `POST /api/admin-users` - Criar
- `PUT /api/admin-users/[id]` - Editar
- `DELETE /api/admin-users/[id]` - Deletar

### Subscriptions
- `GET /api/subscriptions` - Listar planos
- `POST /api/subscriptions` - Criar novo plano
- `PUT /api/subscriptions/[id]` - Atualizar
- `DELETE /api/subscriptions/[id]` - Cancelar

### Invoices
- `GET /api/invoices` - Listar faturas
- `POST /api/invoices` - Gerar fatura (Asaas)
- `PUT /api/invoices/[id]/status` - Marcar como paga

### Tickets
- `GET /api/tickets` - Listar tickets
- `GET /api/tickets/[id]` - Detalhe
- `POST /api/tickets/[id]/messages` - Responder
- `PUT /api/tickets/[id]` - Atualizar status/assignee

### Integrações
- `GET /api/integrations` - Listar
- `POST /api/integrations` - Configurar nova
- `POST /api/integrations/[id]/sync` - Sincronizar agora
- `GET /api/integrations/[id]/logs` - Ver logs

---

## 🔐 Segurança

✅ **Implementar:**
- Validação de email `@cliniva.com.br` para admin
- JWT com expiração curta (~1h)
- Refresh tokens para sessões longas
- Rate limiting no /admin/login
- Auditoria de TODAS as ações
- Criptografia de credenciais de API (chaves Asaas)
- CORS restrito ao domínio admin
- Helmet middleware para headers de segurança

---

## 🌐 Integrações Externas

### Asaas (Pagamentos)
**Recursos usados:**
- Criar cliente → `POST /customers`
- Gerar cobrança → `POST /charges`
- Listar cobranças → `GET /charges`
- Receber webhooks → verificar signature

**Env vars:**
```
ASAAS_API_KEY=sk_live_...
ASAAS_WEBHOOK_SECRET=...
```

---

## 📊 Relatórios Principais

1. **Dashboard Admin**
   - MRR (receita mensal)
   - Usuários ativos/inativos
   - Tickets abertos
   - Status de integrações

2. **Financeiro**
   - Receita por mês
   - Distribuição de planos
   - Taxa de churn

3. **Suporte**
   - Tickets abertos por categoria
   - Tempo médio de resposta

---

## 🚀 Próximas Etapas

1. ✅ Definir schema (este documento)
2. ⏳ Criar migrations SQL (009-014)
3. ⏳ Implementar autenticação admin
4. ⏳ Dashboard admin básico
5. ⏳ Módulo usuários (CRUD)
6. ⏳ Integração Asaas
7. ⏳ Módulo financeiro
8. ⏳ Módulo suporte (tickets)

---

**Status:** 📝 Arquitetura definida, pronto para implementação

