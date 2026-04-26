# 📊 Admin Panel - Checklist de Implementação

**Status:** ✅ Arquitetura e Schema Definidos

---

## 🗓️ Daily Notes (2026-02-19)
- Aplicar migration 019 (openai_api_key_encrypted, openai_api_key_last4) no Supabase.
- Implementar `consent_logs` (tabela + API) para auditoria de consentimento.
- Pipeline de audio/STT e UI de gravacao ainda pendentes (fase 2).
- Ajustar IA por terapeuta em embeddings e status do header (hoje usa chave do servidor).

## 📁 Arquivos Criados

### Documentação
- ✅ [admin-panel-architecture.md](admin-panel-architecture.md) - Visão geral completa

### Migrations SQL (Execute no Supabase)
```
✅ 009_create_admin_users.sql    → Tabela de admin_users
✅ 010_create_user_audits.sql    → Rastreamento de ações
✅ 011_create_subscriptions.sql  → Gerenciar planos
✅ 012_create_invoices.sql       → Faturas (Asaas)
✅ 013_create_support_tickets.sql → Sistema de suporte
✅ 014_create_integrations.sql   → Credenciais de API
```

---

## 🎯 Fases de Implementação

### Fase 1: Infraestrutura (1-2 dias)
- [ ] Executar migrations 009-014 no Supabase
- [ ] Verificar RLS policies
- [ ] Seed data inicial (criar 1 admin super_admin)

### Fase 2: Autenticação Admin (1-2 dias)
- [ ] Criar `/app/(admin)/login/page.tsx`
- [ ] Criar `/api/admin/login` endpoint (bcrypt + JWT)
- [ ] Criar `/api/admin/logout` endpoint
- [ ] Criar `/api/admin/me` endpoint
- [ ] Middleware para proteger `/admin/*`

### Fase 3: Dashboard Admin (1 dia)
- [ ] Layout base (`/app/(admin)/layout.tsx`)
- [ ] Sidebar + Topbar
- [ ] Dashboard home com estatísticas

### Fase 4: Módulo Usuários (2-3 dias)
- [ ] Lista de terapeutas (com filtros)
- [ ] Criar novo terapeuta
- [ ] Editar terapeuta
- [ ] Deletar/Desativar terapeuta
- [ ] Resetar senhas
- [ ] Ver auditoria de logins

### Fase 5: Módulo Financeiro (2-3 dias)
- [ ] Lista de subcriptions
- [ ] Gerenciar planos
- [ ] Visualizar faturas
- [ ] Relatórios MRR, ARR, churn

### Fase 6: Módulo Suporte (2 dias)
- [ ] Lista de tickets
- [ ] Criar ticket (from user side)
- [ ] Gerenciar tickets (admin side)
- [ ] Atribuir a admin
- [ ] Responder tickets

### Fase 7: Módulo Integrações (2-3 dias)
- [ ] Configurar Asaas
- [ ] Testar webhook
- [ ] Ver logs de sincronização
- [ ] Sincronizar manualmente

### Fase 8: Testing & Deploy (1 dia)
- [ ] Testes de segurança
- [ ] Teste de permissões (RBAC)
- [ ] Deploy em staging
- [ ] Deploy em produção

---

## 🔧 Próximas Ações

### 1️⃣ Executar Migrations
```sql
-- Supabase SQL Editor
-- Cole o conteúdo de cada arquivo:
-- 009_create_admin_users.sql
-- 010_create_user_audits.sql
-- 011_create_subscriptions.sql
-- 012_create_invoices.sql
-- 013_create_support_tickets.sql
-- 014_create_integrations.sql
```

### 2️⃣ Seed Data (Após migrations)
```sql
INSERT INTO public.admin_users (email, password_hash, full_name, role, is_active)
VALUES (
  'admin@cliniva.com.br',
  '$2b$10$...', -- bcrypt hash de "mudar-depois"
  'Admin Cliniva',
  'super_admin',
  true
);
```

### 3️⃣ Começar com Fase 2 (Autenticação Admin)

---

## 📝 Notas Importantes

**Segurança:**
- ✅ Validar email `@cliniva.com.br` obrigatoriamente
- ✅ Senhas com bcrypt (min 10 rounds)
- ✅ JWT com expiração (recomendado 1h)
- ✅ Rate limiting em `/admin/login` (máx 5 tentativas/15min)
- ✅ Todas ações auditadas em `user_audits` ou `integration_logs`

**Performance:**
- ✅ Indexes criados em todas colunas usadas em WHERE/JOIN
- ✅ JSONB para dados flexíveis (permissions, config)
- ✅ Pagination em listas (GET /api/... com ?page=1&limit=20)

**Conformidade:**
- ✅ Lei Geral de Proteção de Dados (LGPD)
- ✅ Dados sensíveis criptografados (credenciais Asaas)
- ✅ Logs de auditoria completos

---

## 🔐 Estrutura de Permissões (RBAC)

```json
{
  "super_admin": {
    "usuarios": ["read", "create", "update", "delete"],
    "financeiro": ["read", "create", "update"],
    "suporte": ["read", "update", "delete"],
    "integracoes": ["read", "create", "update", "delete"]
  },
  "moderator": {
    "usuarios": ["read", "update"],
    "financeiro": ["read"],
    "suporte": ["read", "update"],
    "integracoes": []
  },
  "support": {
    "usuarios": ["read"],
    "financeiro": [],
    "suporte": ["read", "update"],
    "integracoes": []
  }
}
```

---

## 🌐 Endpoints API (Mapa Rápido)

```
// AUTH
POST   /api/admin/login
POST   /api/admin/logout
GET    /api/admin/me

// USUÁRIOS
GET    /api/admin-users
GET    /api/admin-users/[id]
POST   /api/admin-users
PUT    /api/admin-users/[id]
DELETE /api/admin-users/[id]

// SUBSCRIPTIONS
GET    /api/subscriptions
POST   /api/subscriptions
PUT    /api/subscriptions/[id]

// INVOICES
GET    /api/invoices
POST   /api/invoices
PUT    /api/invoices/[id]/status

// TICKETS
GET    /api/tickets
GET    /api/tickets/[id]
POST   /api/tickets/[id]/messages
PUT    /api/tickets/[id]

// INTEGRAÇÕES
GET    /api/integrations
POST   /api/integrations
POST   /api/integrations/[id]/sync
GET    /api/integrations/[id]/logs
```

---

**Pronto para começar a implementação! 🚀**
