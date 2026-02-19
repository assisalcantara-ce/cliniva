Este é um projeto [Next.js](https://nextjs.org) criado com [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Como rodar

Primeiro, rode o servidor de desenvolvimento:

```bash
npm run dev
```

## Projeto (Copiloto de Terapia)

Documentação interna do projeto:
- [docs/architecture.md](docs/architecture.md)
- [docs/agent-handbook.md](docs/agent-handbook.md)

## Storage (Supabase)

Este projeto espera um bucket publico no Supabase Storage:
- Bucket: `therapy-files`

Se estiver usando migrations, aplique a migration em `supabase/sql/016_create_storage_bucket.sql`.

Abra [http://localhost:3000](http://localhost:3000) no navegador para ver o resultado.

Você pode começar editando a página em `app/page.tsx`. A página atualiza automaticamente conforme você salva.

Este projeto usa [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) para otimizar e carregar automaticamente a fonte [Geist](https://vercel.com/font), da Vercel.

## Saiba mais

Para aprender mais sobre Next.js, veja:

- [Documentação do Next.js](https://nextjs.org/docs) — features e API.
- [Aprenda Next.js](https://nextjs.org/learn) — tutorial interativo.

Você também pode ver o [repositório do Next.js no GitHub](https://github.com/vercel/next.js) — feedback e contribuições são bem-vindos.

## Deploy na Vercel

A forma mais simples de fazer deploy do seu app Next.js é usar a [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Veja a [documentação de deploy do Next.js](https://nextjs.org/docs/app/building-your-application/deploying) para mais detalhes.
