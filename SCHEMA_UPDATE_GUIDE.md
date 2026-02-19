# Schema de Atualização do Supabase - Therapy Copilot

## ✅ Arquivos Criados

### 1. Migration SQL: [supabase/sql/004_patient_personal_fields.sql](supabase/sql/004_patient_personal_fields.sql)

**O que faz:**
- Adiciona 11 colunas desnormalizadas à tabela `patient_anamnesis`
- Cria índices de performance para CPF, email, celular e data de nascimento
- Implementa trigger automático que sincroniza dados do JSONB para as colunas

**Colunas adicionadas:**
```
cpf                TEXT
email              TEXT
celular            TEXT
birth_date         TEXT (formato DD/MM/AAAA)
age_calculated     INT
marital_status     TEXT
education          TEXT
profession         TEXT
living_with        TEXT
has_children       TEXT
updated_at         TIMESTAMPTZ
```

### 2. Documentação: [supabase/MIGRATION_004_README.md](supabase/MIGRATION_004_README.md)

Inclui:
- Instruções passo a passo
- Estrutura completa do JSON
- Como verificar após executar
- Queries SQL de teste

---

## 📋 Campos do Formulário (Sincronizados Automaticamente)

### Dados Pessoais
- ✅ Nome completo (em `patients.full_name`)
- ✅ Data de nascimento (obrigatório) → `patient_anamnesis.birth_date`
- ✅ Idade (calculado automaticamente)
- ✅ CPF → `patient_anamnesis.cpf`
- ✅ Email → `patient_anamnesis.email`
- ✅ Celular (obrigatório) → `patient_anamnesis.celular`
- ✅ Estado civil (select) → `patient_anamnesis.marital_status`
- ✅ Escolaridade (select) → `patient_anamnesis.education`
- ✅ Profissão → `patient_anamnesis.profession`
- ✅ Com quem mora → `patient_anamnesis.living_with`
- ✅ Tem filhos? (select Sim/Não) → `patient_anamnesis.has_children`
- ✅ Quantos filhos? → `patient_anamnesis.payload.personal.children_count`
- ✅ Idades dos filhos → `patient_anamnesis.payload.personal.children_ages`

### Resposta Estruturada
- ✅ 14 grupos de questões com respostas → `patient_anamnesis.payload.groups`

### Notas
- ✅ Notas opcionais → `patients.notes`

---

## 🚀 Como Executar

### Passo 1: Acessar Supabase SQL Editor
1. Vá para seu projeto Supabase: https://app.supabase.com
2. Clique em "SQL Editor" → "New Query"

### Passo 2: Copiar e Colar o SQL
Abra o arquivo `supabase/sql/004_patient_personal_fields.sql` e copie todo o conteúdo.

### Passo 3: Executar
Cole no SQL Editor do Supabase e clique em "Run" (ou Cmd+Enter).

### Passo 4: Verificar
Execute uma dessas queries para confirmar:

```sql
-- Ver as novas colunas
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'patient_anamnesis' 
ORDER BY column_name;

-- Ver os índices
SELECT indexname FROM pg_indexes 
WHERE tablename = 'patient_anamnesis' 
AND indexname LIKE 'patient_anamnesis_%';

-- Ver o trigger
SELECT trigger_name FROM information_schema.triggers 
WHERE event_object_table = 'patient_anamnesis';
```

---

## 📊 Estrutura do Payload JSONB

Exemplo completo de um registro:

```json
{
  "personal": {
    "age": "32",
    "birth_date": "15/03/1992",
    "marital_status": "Casado(a)",
    "cpf": "123.456.789-00",
    "email": "paciente@example.com",
    "celular": "(11) 98765-4321",
    "profession": "Designer",
    "education": "Ens. superior completo",
    "living_with": "Com cônjuge",
    "has_children": "Sim",
    "children_count": "2",
    "children_ages": "8, 11"
  },
  "groups": [
    {
      "id": "queixa-principal",
      "title": "1. Queixa Principal e Motivo da Procura",
      "answers": [
        {
          "question": "O que trouxe você à terapia neste momento?",
          "answer": "Ansiedade relacionada ao trabalho"
        },
        {
          "question": "Há quanto tempo isso tem acontecido?",
          "answer": "Há 6 meses"
        },
        {
          "question": "Como isso afeta sua vida cotidiana?",
          "answer": "Afeta o sono e concentração"
        }
      ]
    }
    // ... mais 13 grupos
  ]
}
```

---

## 🔄 Sincronização Automática

O trigger `trigger_sync_patient_personal_fields` executa em:
- ✅ **INSERT**: Ao criar novo registro
- ✅ **UPDATE**: Ao atualizar um registro

Isso garante que:
- Os dados estejam sempre em sincronismo
- As buscas por CPF/email/celular sejam rápidas
- Nenhuma mudança no código da API é necessária

---

## 📝 Validações no API

O esquema Zod em [app/api/patients/route.ts](app/api/patients/route.ts) já valida:
- ✅ `birth_date` - obrigatório
- ✅ `celular` - obrigatório
- ✅ Email é convertido para minúsculas
- ✅ Todos os campos são trimmed

---

## ✨ Próximos Passos (Opcional)

Se quiser queries mais otimizadas, pode criar views:

```sql
-- View para buscar pacientes por CPF
CREATE OR REPLACE VIEW v_patients_by_cpf AS
SELECT p.*, a.* 
FROM patients p
LEFT JOIN patient_anamnesis a ON p.id = a.patient_id
WHERE a.cpf IS NOT NULL;

-- View para contato
CREATE OR REPLACE VIEW v_patients_contact AS
SELECT p.full_name, a.email, a.celular, a.birth_date, p.created_at
FROM patients p
LEFT JOIN patient_anamnesis a ON p.id = a.patient_id;
```

---

**Data de criação:** 17 de fevereiro de 2026
**Status:** ✅ Pronto para executar
