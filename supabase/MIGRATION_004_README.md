# Instruções para executar o migration no Supabase

## Schema: 004_patient_personal_fields.sql

Este migration adiciona campos desnormalizados à tabela `patient_anamnesis` para melhor performance e queries.

### O que será criado:

1. **Novas colunas denormalizadas** (dados também ficam em JSONB):
   - `cpf` - Para consultas por CPF
   - `email` - Para consultas por email
   - `celular` - Para consultas/contato
   - `birth_date` - Data de nascimento (DD/MM/AAAA)
   - `age_calculated` - Idade calculada (int)
   - `marital_status` - Estado civil
   - `education` - Escolaridade
   - `profession` - Profissão
   - `living_with` - Com quem mora
   - `has_children` - Tem filhos?
   - `updated_at` - Timestamp de atualização

2. **Índices de performance**:
   - Índice em `cpf`, `email`, `celular`, `birth_date`
   - Melhora significativamente queries de busca

3. **Trigger automático**:
   - Função `sync_patient_personal_fields()` que sincroniza os dados do `payload` JSONB para as colunas denormalizadas
   - Executa automaticamente em INSERT e UPDATE
   - Garante dados consistentes

### Como executar:

#### Opção 1: SQL Editor do Supabase (Recomendado)
1. Vá para https://app.supabase.com/project/[seu-project]/sql/new
2. Cole o conteúdo do arquivo `004_patient_personal_fields.sql`
3. Clique em "Run"

#### Opção 2: Terminal (via supabase-cli)
```bash
supabase db push
```

### Estrutura do JSON que será armazenado:

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
    "living_with": "Com cônjuge e filhos",
    "has_children": "Sim",
    "children_count": "2",
    "children_ages": "6, 9"
  },
  "groups": [
    {
      "id": "queixa-principal",
      "title": "1. Queixa Principal e Motivo da Procura",
      "answers": [
        {
          "question": "O que trouxe você à terapia neste momento?",
          "answer": "Resposta do paciente..."
        }
      ]
    }
  ]
}
```

### Importante:

- O trigger sincroniza dados **automaticamente**
- Os dados no JSONB são a fonte de verdade
- As colunas denormalizadas são **read-optimized**
- Nenhuma mudança no código da aplicação é necessária
- O API continua salvando exatamente como está no `payload` JSONB

### Verificação após executar:

```sql
-- Verificar estrutura:
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'patient_anamnesis' 
ORDER BY column_name;

-- Verificar índices:
SELECT indexname FROM pg_indexes 
WHERE tablename = 'patient_anamnesis';

-- Verificar triggers:
SELECT trigger_name FROM information_schema.triggers 
WHERE event_object_table = 'patient_anamnesis';
```

