# Valentim MVP — WhatsApp-first

Projeto executável do Valentim dentro do repositório.

## Rodar local

```bash
cd valentim-mvp
pnpm install
cp .env.example .env
docker compose up -d
pnpm --filter api prisma generate
pnpm --filter api prisma migrate dev --name init
pnpm --filter api prisma db seed
pnpm dev
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Acessos:

- Web: http://localhost:5173
- API: http://localhost:3333/health

Login seed:

- admin@valentim.local
- Admin@123

## Inclui

- API Fastify + Prisma + JWT
- Web React + Vite
- PostgreSQL + Redis via Docker
- Webhook WhatsApp mockado
- IA mockada
- CRUD base de clientes, empresas, documentos, prazos, financeiro e propostas
