# Briefing diário (ler antes de qualquer mudança)

## 1) Objetivo do dia (1 frase)
Amanhã vou retomar a implementação com mudanças pequenas e seguras, priorizando estabilidade e rastreabilidade.

## 2) Regras inegociáveis
- NÃO usar Prisma. Stack é Next.js + TypeScript + supabase-js + fetch OpenAI.
- Segredos só server-side. Nunca expor SUPABASE_SERVICE_ROLE_KEY ou OPENAI_API_KEY no client.
- Conteúdo clínico: NÃO diagnosticar. Só hipóteses e perguntas. Sempre com evidências.
- Sempre rodar moderação na entrada e na saída antes de persistir insights.
- Mudanças pequenas e incrementais. Sem novas libs sem justificativa.

## 3) Checagem rápida (antes de codar)
- `npm run dev` sobe sem erros.
- Env vars presentes em `.env.local`:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY
  - OPENAI_API_KEY
- Supabase:
  - Bucket `materials` existe e é Private
  - Bucket `therapy-files` existe e é Public
  - RPC `match_material_chunks` existe (Database → Functions)

## 4) Teste rápido (2 minutos)
1. /patients → criar paciente
2. paciente → criar sessão
3. sessão → salvar 2 chunks
4. sessão → “Gerar suporte (IA)” e ver:
   - insights persistidos
   - evidências com chunk_id e/ou material_id
5. /materials → envio de PDF/DOCX (se feature em uso)
   - Se falhar: instalar `npm i pdf-parse mammoth`

## 7) Notas para amanhã
- Investigar o erro do `npm run dev` (últimas execuções retornaram exit code 1).
- Confirmar que o bucket `therapy-files` está criado e com acesso público.
- Se houver pendências de copy, revisar acentuação restante nas telas.

## 5) Padrão de execução do trabalho
Antes de implementar:
- Resumir tarefa em 1 frase
- Listar arquivos que serão tocados
- Definir critérios de pronto (compila, endpoint ok, UI ok)

Depois de implementar:
- Listar mudanças por arquivo
- Como testar manualmente
- Riscos/pendências

## 6) Prioridades de produto
- Confiabilidade > features
- Evidência/citação > criatividade
- Segurança/consentimento > automação
