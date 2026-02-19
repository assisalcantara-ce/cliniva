# Admin Panel - Arquitetura Visual & Fluxos

## 🏗️ Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLINIVA SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────┐     ┌──────────────────────────┐ │
│  │   THERAPIST AREA         │     │    ADMIN AREA            │ │
│  │   /app/(app)             │     │    /app/(admin)          │ │
│  │                          │     │                          │ │
│  │  - Dashboard             │     │  - Dashboard (stats)     │ │
│  │  - Patients              │     │  - Usuarios (CRUD)       │ │
│  │  - Sessions              │     │  - Financeiro (MRR)      │ │
│  │  - Materials             │     │  - Suporte (tickets)     │ │
│  │  - Settings              │     │  - Integrações (Asaas)   │ │
│  │                          │     │                          │ │
│  └──────────────────────────┘     └──────────────────────────┘ │
│           ▲                                ▲                    │
│           │                                │                    │
│    Auth: users table             Auth: admin_users table        │
│           │                                │                    │
└───────────┼────────────────────────────────┼────────────────────┘
            │                                │
            │                                │
        ┌───┴────────────────────────────────┴────────┐
        │                                             │
        │        🗄️ SUPABASE PostgreSQL             │
        │                                             │
        │  ┌─────────────────────────────────────┐  │
        │  │ PUBLIC SCHEMA                       │  │
        │  │                                     │  │
        │  │  users          (therapists)        │  │
        │  │  therapists     (tenant principal)  │  │
        │  │  organizations  (empresa)           │  │
        │  │                                     │  │
        │  │  patients       (pacientes)         │  │
        │  │  sessions       (sessões)           │  │
        │  │  materials      (materiais)         │  │
        │  │                                     │  │
        │  │  admin_users    (equipe)            │  │
        │  │  user_audits    (rastreamento)      │  │
        │  │                                     │  │
        │  │  subscriptions  (planos)            │  │
        │  │  invoices       (faturas)           │  │
        │  │                                     │  │
        │  │  support_tickets (suporte)          │  │
        │  │  ticket_messages (chat)             │  │
        │  │                                     │  │
        │  │  integrations   (credenciais)       │  │
        │  │  integration_logs (auditoria)       │  │
        │  │                                     │  │
        │  └─────────────────────────────────────┘  │
        │                                             │
        └─────────────────────────────────────────────┘
                            │
                            │
              ┌─────────────┼─────────────┐
              │             │             │
         🔗 Asaas  📊 Analytics  🔔 Email
              │             │             │
              ▼             ▼             ▼
         Pagamentos    Dashboard     Notificações
```

---

## 🔄 Fluxos Principais

### 1️⃣ Fluxo de Login (Admin)

```
Admin acessa /admin/login
    ↓
POST /api/admin/login { email, password }
    ↓
Buscar em admin_users by email
    ↓
Validar password_hash (bcrypt)
    ↓
✅ Válido → Gerar JWT
           → Set cookie HTTP-only
           → Log em user_audits (action: 'login')
           → Redirect /admin/dashboard
    
❌ Inválido → Return 401
             → Log em user_audits (action: 'login_failed')
```

### 2️⃣ Fluxo de Criar Usuário (Admin → Terapeuta)

```
Admin em /admin/usuarios/novo
    ↓
Preenche form:
  - Email
  - Senha provisória
  - Nome completo
  - Empresa
    ↓
POST /api/admin-users
    ↓
1. Hash senha com bcrypt
2. Validar email @válido
3. Criar em therapists (nome, org)
4. Criar em users (therapist_id, email, password_hash)
5. Log auditoria
    ↓
✅ Sucesso → Notificar novo terapeuta
             → Retornar credenciais
    
❌ Erro → Rollback
         → Mensagem de erro
```

### 3️⃣ Fluxo de Pagamento (Asaas Integration)

```
Terapeuta em período de assinatura
    ↓
Cron job diariamente verifica subscriptions com next_billing_date = hoje
    ↓
Para cada subscription:
  1. POST /api/integrations/asaas/sync
  2. Criar cobrança via Asaas API
  3. Log em integration_logs (event: 'charge_created')
  4. Atualizar invoice status = 'pending'
    ↓
Asaas envia webhook quando pagamento chega
    ↓
POST /api/webhooks/asaas
  1. Validar signature
  2. Atualizar invoice status = 'paid'
  3. Log em integration_logs
  4. Enviar email de confirmação
    ↓
✅ Pagamento confirmado
```

### 4️⃣ Fluxo de Suporte (Ticket)

```
Terapeuta em /dashboard vê problema
    ↓
Clica "Abrir ticket de suporte"
    ↓
POST /api/tickets { title, description, category }
  1. Criar em support_tickets (user_id, status='open')
  2. Notificar admin por email
  3. Log em integration_logs
    ↓
Admin vê ticket em /admin/suporte
    ↓
Admin atribui para si (update assigned_to)
    ↓
Admin + Terapeuta trocam mensagens em /admin/tickets/[id]
  - POST /api/tickets/[id]/messages { message, is_internal=false }
    ↓
Quando resolvido:
  - Admin marca como 'resolved'
  - Terapeuta recebe notificação
    ↓
✅ Ticket fechado
```

### 5️⃣ Fluxo de RLS (Isolamento de Dados)

```
GET /api/patients (como terapeuta)
    ↓
SELECT * FROM patients
    ↓
RLS Policy:
  WHERE therapist_id = auth.uid()  ← Filtra automaticamente
    ↓
✅ Retorna APENAS pacientes deste terapeuta

---

GET /api/invoices (como admin)
    ↓
SELECT * FROM invoices
    ↓
RLS Policy:
  WHERE EXISTS (
    SELECT 1 FROM admin_users WHERE id = auth.uid()
  )
    ↓
✅ Retorna TODAS as faturas (admin tem acesso)
```

---

## 🔐 Arquitetura de Segurança

```
┌─────────────────┐
│  Cliente        │
│  (Browser)      │
└────────┬────────┘
         │ HTTPS only
         ▼
┌─────────────────────────────────────┐
│  Next.js (Servidor)                 │
│                                     │
│  middleware.ts                      │
│  └─ Verifica auth_token cookie      │
│  └─ Valida JWT                      │
│                                     │
│  API Routes                         │
│  └─ /api/admin/* (requer JWT admin) │
│  └─ /api/admin-users/* (RBAC)       │
│                                     │
└──────────────────┬──────────────────┘
                   │
                   │ Credenciais via
                   │ Service Role Key
                   ▼
┌──────────────────────────────────────┐
│  Supabase (PostgreSQL)               │
│                                      │
│  RLS Policies                        │
│  ├─ auth.uid() = id (users)          │
│  ├─ admin_users only (integrations)  │
│  └─ therapist_id = auth.uid()        │
│      (therapist data isolation)      │
│                                      │
│  Encrypted Fields                    │
│  └─ admin_users.password_hash        │
│  └─ integrations.config (BYTEA)      │
│                                      │
└──────────────────────────────────────┘
```

---

## 📊 Fluxo de Dados (Financeiro)

```
┌──────────────────────────────────┐
│ Terapeuta assina "Pro"           │
│ R$ 99/mês (9900 centavos)        │
└──────────────────┬───────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
  subscriptions table    Hoje é 1º do mês
  ├─ plan: 'pro'
  ├─ amount_cents: 9900
  ├─ status: 'active'
  ├─ next_billing_date: 2026-03-01
       │
       └──→ CREATE invoice
            ├─ amount_cents: 9900
            ├─ status: 'pending'
            ├─ due_date: 2026-03-01
            │
            └──→ POST Asaas API
                 ├─ customer_id
                 ├─ amount
                 ├─ billingType: 'PIX'
                 │
                 └──→ Retorna charge_id
                     ├─ update invoices.external_id
                     ├─ log em integration_logs
                     │
                     └──→ Terapeuta recebe
                          cobrança para pagar
```

---

## 🎯 Matriz de Acesso (RBAC)

```
┌──────────────────┬──────────┬───────────┬─────────┐
│ Recurso          │ Super    │ Moderator │ Support │
│                  │ Admin    │           │         │
├──────────────────┼──────────┼───────────┼─────────┤
│ Admin Users      │   ✅✅   │    ✅     │    ❌   │
│ Subscriptions    │   ✅✅   │    ✅     │    ❌   │
│ Invoices         │   ✅✅   │    ✅     │    ❌   │
│ Support Tickets  │   ✅✅   │    ✅     │    ✅   │
│ Integrations     │   ✅✅   │    ❌     │    ❌   │
│ User Audits      │   ✅     │    ❌     │    ❌   │
└──────────────────┴──────────┴───────────┴─────────┘

✅✅ = Full access (create, read, update, delete)
✅   = Read-only
❌   = No access
```

---

## 🔗 Integrações Externas

```
ASAAS
├─ API Key: armazenada em integrations.config (encrypted)
├─ Endpoints:
│  ├─ POST /customers
│  ├─ POST /charges
│  ├─ GET /charges
│  └─ Webhooks (receber eventos)
└─ Log: integration_logs (todas as requisições)

WEBHOOK FLOW:
┌──────────────┐
│ Asaas        │
│ Pagamento    │
│ confirmado   │
└──────┬───────┘
       │
       │ POST com signature
       ▼
/api/webhooks/asaas
├─ Validar HMAC signature
├─ Atualizar invoice.status = 'paid'
├─ Log em integration_logs
└─ Enviar email ao terapeuta
```

---

## 📈 Métricas & Dashboards

```
DASHBOARD ADMIN mostra:

┌─────────────────────────────────────┐
│  📊 Estatísticas Gerais              │
├─────────────────────────────────────┤
│  • MRR (Monthly Recurring Revenue)   │
│  • Usuários ativos/inativos          │
│  • Tickets abertos                   │
│  • Taxa de churn (% cancelados)      │
└─────────────────────────────────────┘

FINANCEIRO mostra:

┌─────────────────────────────────────┐
│  💰 Receita                         │
├─────────────────────────────────────┤
│  • Receita total (ano atual)         │
│  • Receita por mês (gráfico)         │
│  • Distribuição de planos (pie)      │
│  • Faturas pendentes/atrasadas       │
│  • ARR (Annual Recurring Revenue)    │
└─────────────────────────────────────┘
```

---

**Arquitetura completa e documentada! 🎉**
