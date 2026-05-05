# Valentim

> Sistema contábil **WhatsApp-first** para organizar documentos, clientes, empresas, prazos, cobranças e propostas de escritórios contábeis.

O Valentim parte de uma premissa simples: o cliente do escritório não deve precisar acessar um portal, lembrar senha ou aprender uma ferramenta nova. O cliente envia documentos pelo **WhatsApp**; o escritório acompanha tudo em um **dashboard web**.

---

## Status atual

O projeto já possui um **MVP técnico funcional** em:

```txt
valentim-mvp/
```

A versão atual já foi validada localmente com:

```txt
pnpm install
prisma generate
prisma migrate
prisma seed
API em localhost:3333
Web em localhost:5173
Login demo
Dashboard JSON inicial
```

---

## Fonte oficial do código

```txt
valentim-mvp/
├── apps/
│   ├── api/      # API Fastify + Prisma
│   └── web/      # Frontend React + Vite
├── packages/
│   └── shared/   # Tipos e contratos compartilhados
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

Qualquer desenvolvimento novo deve partir da pasta `valentim-mvp/`.

---

## Como rodar localmente

```bash
cd valentim-mvp
pnpm install
cp .env.example .env
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate -- --name init
pnpm --filter api prisma:seed
pnpm dev
```

No PowerShell:

```powershell
cd valentim-mvp
Copy-Item .env.example .env
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate -- --name init
pnpm --filter api prisma:seed
pnpm dev
```

Acessos:

```txt
API: http://localhost:3333/health
Web: http://localhost:5173
```

Login demo:

```txt
Email: admin@valentim.local
Senha: Admin@123
```

---

## Documentação profissional

A documentação atualizada fica em:

```txt
docs/
├── 00-visao-do-produto.md
├── 01-arquitetura.md
├── 02-modelagem-dominio.md
├── 03-banco-de-dados.md
├── 04-api-contratos.md
├── 05-whatsapp-ia-pipeline.md
├── 06-execucao-local.md
├── 07-roadmap.md
├── 08-checklist-mvp.md
├── 09-decisoes-tecnicas.md
└── archive/
```

A documentação antiga deve ser tratada como material histórico. A fonte atual de verdade é esta estrutura acima.

---

## Stack atual

### Frontend

```txt
React
Vite
TypeScript
Axios
CSS próprio
```

### Backend

```txt
Node.js
Fastify
TypeScript
Prisma ORM
JWT
bcryptjs
PostgreSQL/Neon
```

### Integrações planejadas

```txt
WhatsApp real: Meta Cloud API / Z-API / Evolution API
IA real: OpenAI / Claude / Gemini
Storage real: Supabase Storage / Cloudflare R2 / S3
Fila: Redis + BullMQ
```

---

## Objetivo do MVP

O MVP não tenta substituir um sistema contábil completo. Ele organiza a operação do escritório:

```txt
clientes
empresas
documentos mensais
mensagens WhatsApp
triagem por IA
prazos
financeiro básico
propostas
```

---

## Próxima fase recomendada

Agora que o MVP técnico já roda, a próxima fase é:

```txt
Fase 2 — Dashboard visual operacional
```

Objetivos:

```txt
substituir dashboard JSON por interface visual
criar sidebar profissional
criar cards reais de indicadores
criar páginas de clientes, documentos, WhatsApp e triagem
manter backend funcionando sem alterar escopo
```

---

## Autor

Projeto desenvolvido por João Matheus Amorim como base para produto/freela voltado a escritórios contábeis.
