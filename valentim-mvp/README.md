# Valentim – Sistema Contábil WhatsApp-first

Este projeto é um sistema contábil orientado a WhatsApp. Os clientes enviam documentos via WhatsApp e o sistema recebe, analisa e organiza de forma automatizada. O contador e a equipe utilizam um dashboard web para acompanhar as pendências de documentos, prazos e cobranças.

## Estrutura do projeto

- **apps/api** – API em Fastify (TypeScript) com Prisma como ORM.
- **apps/web** – Dashboard web em React com Vite.
- **packages/shared** – Tipos e enums compartilhados.
- **docker-compose.yml** – Serviços do banco de dados (PostgreSQL) e Redis para fila assíncrona (ainda não utilizada).
- **prisma/schema.prisma** – Modelagem do banco.

## Executando localmente

Pré-requisitos: Node.js 20+, pnpm, Docker Desktop.

```bash
# Instale dependências
pnpm install

# Copie .env de exemplo
cp .env.example .env

# Suba banco de dados e Redis
docker compose up -d

# Gere Prisma Client
pnpm --filter api prisma:generate

# Execute migrações iniciais
pnpm --filter api prisma:migrate -- --name init

# Popule dados de exemplo
pnpm --filter api prisma:seed

# Rode API e Web em paralelo
pnpm dev
```

A API estará em `http://localhost:3333` e o dashboard web em `http://localhost:5173`.

Usuário demo:

- **Email:** admin@valentim.local
- **Senha:** Admin@123

## Próximos passos

Este projeto serve como base para um MVP. Futuros desenvolvimentos incluem:

- Integração real com a API oficial do WhatsApp (Meta Cloud API).
- Integração com serviços de IA para analisar documentos (Ex.: Anthropic Claude, OpenAI GPT-4o).
- Worker assíncrono com BullMQ e Redis para processar mensagens e documentos.
- Funcionalidades avançadas no dashboard: upload de documentos, relatórios, contratos, propostas.
- Segurança e boas práticas de deploy.
