# Valentim

> CRM **WhatsApp-first** para escritórios contábeis. O cliente envia documentos pelo WhatsApp; o escritório acompanha tudo em um dashboard web.

A premissa é simples: o cliente não precisa acessar portal, lembrar senha ou aprender ferramenta nova. Ele envia pelo WhatsApp. A IA classifica automaticamente. O contador revisa no dashboard.

---

## Estado atual

MVP técnico funcional com:

- Dashboard com KPIs reais do banco
- Módulos completos de clientes, empresas, pessoas, documentos e tarefas
- Webhook WhatsApp recebendo e classificando documentos via IA
- Pipeline de download de mídia assíncrono (BullMQ + Cloudflare R2)
- Três providers de IA implementados: mock, local (pdf-parse + Tesseract.js) e Gemini Flash
- Autenticação JWT com roles (ADMIN, STAFF, CLIENT)
- Multi-tenancy por `officeId` em todas as queries
- Deploy contínuo: API no Railway/VPS + Frontend no Vercel

> ⚠️ O provider de IA ainda aponta para mock. Para ligar o Gemini ou o parser local, configure `AI_PROVIDER` no `.env`. Ver seção [Providers de IA](#providers-de-ia).

---

## Estrutura do repositório

```
valentim-mvp/
├── apps/
│   ├── api/                        # Backend Fastify + Prisma
│   │   ├── src/
│   │   │   ├── app.ts              # Registro de rotas e CORS
│   │   │   ├── server.ts           # Entry point
│   │   │   ├── lib/
│   │   │   │   ├── ai.ts           # Abstração do provider de IA
│   │   │   │   ├── ai-gemini.ts    # Provider Gemini Flash (implementado)
│   │   │   │   ├── ai-local.ts     # Provider local pdf-parse + Tesseract (implementado)
│   │   │   │   ├── ai-mock.ts      # Provider mock (padrão atual)
│   │   │   │   ├── auth.ts         # JWT + bcrypt
│   │   │   │   ├── prisma.ts       # Singleton do Prisma Client
│   │   │   │   └── queue.ts        # BullMQ + Redis
│   │   │   ├── routes/             # 12 routers registrados
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── clients.routes.ts
│   │   │   │   ├── companies.routes.ts
│   │   │   │   ├── people.routes.ts
│   │   │   │   ├── documents.routes.ts
│   │   │   │   ├── document-review.routes.ts
│   │   │   │   ├── tasks.routes.ts
│   │   │   │   ├── deadlines.routes.ts
│   │   │   │   ├── finance.routes.ts
│   │   │   │   ├── proposals.routes.ts
│   │   │   │   ├── dashboard.routes.ts
│   │   │   │   └── whatsapp.routes.ts
│   │   │   └── workers/
│   │   │       ├── index.ts
│   │   │       └── media-download.worker.ts  # Download Meta API → R2 → IA
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       ├── seed.ts
│   │       ├── seed-tasks.ts
│   │       ├── db-check.ts         # Diagnóstico de conectividade
│   │       ├── db-doctor.ts        # Diagnóstico completo do schema
│   │       ├── repair-*.ts         # Scripts de reparo de dados
│   │       └── migrations/
│   └── web/                        # Frontend React + Vite
│       └── src/
│           ├── App.tsx             # Roteamento por estado (useState)
│           ├── pages/              # 10 páginas implementadas
│           │   ├── DashboardPage.tsx
│           │   ├── ClientsPage.tsx
│           │   ├── CompaniesPage.tsx
│           │   ├── PeoplePage.tsx
│           │   ├── DocumentsPage.tsx
│           │   ├── TasksPage.tsx
│           │   ├── LoginPage.tsx
│           │   ├── ArchitecturePage.tsx
│           │   └── ModulePlaceholderPage.tsx
│           ├── services/           # Chamadas Axios para a API
│           ├── context/            # AuthContext
│           └── types/              # Tipos TypeScript compartilhados
├── packages/
│   └── shared/                     # Tipos e contratos entre apps
├── docker-compose.yml              # PostgreSQL + Redis com health checks
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

## Como rodar localmente

### Pré-requisitos

- Node.js 20+
- pnpm 9+
- Docker (para PostgreSQL e Redis)

### Subir banco e fila

```bash
cd valentim-mvp
docker compose up -d
```

### Instalar e configurar

```bash
pnpm install
cp .env.example .env
# Edite .env com suas variáveis (ver seção abaixo)
```

### Migrations e seed

```bash
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate -- --name init
pnpm --filter api prisma:seed
```

### Rodar em desenvolvimento

```bash
pnpm dev
```

**PowerShell:**

```powershell
cd valentim-mvp
Copy-Item .env.example .env
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate -- --name init
pnpm --filter api prisma:seed
pnpm dev
```

### Acessos

| Serviço | URL |
|---|---|
| API | http://localhost:3333 |
| Health check | http://localhost:3333/health |
| Frontend | http://localhost:5173 |

**Login demo:**

```
Email: admin@valentim.local
Senha: Admin@123
```

---

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```env
# Banco de dados (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/valentim"
DIRECT_URL="postgresql://user:password@localhost:5432/valentim"

# Autenticação — OBRIGATÓRIO, nunca usar fallback
JWT_SECRET="troque-por-uma-string-longa-e-aleatoria"

# Frontend (CORS)
FRONTEND_URL="http://localhost:5173"

# WhatsApp webhook — OBRIGATÓRIO em produção
WEBHOOK_SECRET="troque-por-segredo-real"

# Fila assíncrona
REDIS_URL="redis://localhost:6379"

# Provider de IA: mock | local | gemini
AI_PROVIDER="mock"

# Gemini (necessário se AI_PROVIDER=gemini)
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-1.5-flash"

# WhatsApp Meta Cloud API (necessário para download de mídia real)
WHATSAPP_ACCESS_TOKEN=""
META_API_VERSION="v19.0"

# Cloudflare R2 (necessário para storage de documentos real)
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET="valentim-docs"
R2_PUBLIC_URL=""

# Worker
MEDIA_DOWNLOAD_CONCURRENCY="5"
```

---

## Stack

### Backend

| Tecnologia | Uso |
|---|---|
| Fastify | HTTP server com logger estruturado |
| Prisma ORM | Acesso ao banco com migrations |
| PostgreSQL / Neon | Banco relacional principal |
| BullMQ | Fila assíncrona para download de mídia |
| Redis (ioredis) | Backend da fila BullMQ |
| @aws-sdk/client-s3 | Upload para Cloudflare R2 (compatível S3) |
| @google/generative-ai | Gemini Flash para análise de documentos |
| pdf-parse + Tesseract.js | Parser local de PDF/imagem (sem API externa) |
| bcryptjs + jsonwebtoken | Autenticação |
| @fastify/cors | CORS configurado por lista de origens |

### Frontend

| Tecnologia | Uso |
|---|---|
| React 18 | UI |
| Vite | Build e dev server |
| TypeScript | Tipagem |
| Axios | Chamadas HTTP |
| CSS próprio | Estilo por página (sem framework CSS) |

---

## Providers de IA

O sistema tem três providers implementados, controlados pela variável `AI_PROVIDER`:

| Provider | Variável | Quando usar |
|---|---|---|
| `mock` | padrão | Desenvolvimento local sem API externa |
| `local` | `AI_PROVIDER=local` | Produção sem custo de API; usa pdf-parse + Tesseract.js + regex de CNPJ, valores e datas |
| `gemini` | `AI_PROVIDER=gemini` | Produção com maior precisão; requer `GEMINI_API_KEY` |

> O provider `gemini` usa o modelo `gemini-1.5-flash` por padrão. Para trocar, defina `GEMINI_MODEL` no `.env`.

> ⚠️ **Atenção:** o `ai.ts` atual ainda roteia todos os providers para o mock. Para ligar `gemini` ou `local`, o PR 3 deve conectar os imports (ver [Roadmap](#roadmap)).

---

## Pipeline WhatsApp → IA → Dashboard

```
Cliente envia documento via WhatsApp
        ↓
Meta Cloud API notifica o webhook (POST /api/webhooks/whatsapp)
        ↓
Webhook valida WEBHOOK_SECRET, identifica cliente por telefone
        ↓
Cria WhatsAppMessage + DocumentFile no banco
        ↓
Enfileira job no BullMQ (media-download)    ← a ser implementado (PR 3)
        ↓
Worker baixa mídia da Meta Graph API
        ↓
Faz upload para Cloudflare R2
        ↓
Executa analyzeDocument() com o provider configurado
        ↓
Salva AIAnalysis no banco
        ↓
DocumentRequest é atualizado para status SENT
        ↓
Contador visualiza no dashboard e na fila de revisão
```

> Hoje o webhook processa tudo em memória em vez de enfileirar. O worker existe e está correto, mas não é acionado pelo webhook. Isso será corrigido no PR 3.

---

## Módulos do dashboard

| Módulo | Status | Descrição |
|---|---|---|
| Dashboard | ✅ Implementado | KPIs: documentos pendentes, tarefas em aberto, clientes, mensagens WhatsApp |
| Clientes | ✅ Implementado | CRUD completo com empresas vinculadas |
| Empresas | ✅ Implementado | CNPJ, regime tributário, documentos e prazos |
| Pessoas | ✅ Implementado | Sócios, responsáveis e representantes legais |
| Documentos | ✅ Implementado | Solicitações, upload, revisão e aprovação/rejeição |
| Tarefas | ✅ Implementado | Board com status, prioridade, assignee e dueDate |
| WhatsApp | 🔧 Placeholder | Visualização de mensagens — em desenvolvimento |
| Prazos | 🔧 Placeholder | Calendário de obrigações fiscais — em desenvolvimento |
| Financeiro | 🔧 Placeholder | Cobranças e recebimentos — em desenvolvimento |
| Propostas | 🔧 Placeholder | Propostas comerciais — em desenvolvimento |
| Arquitetura | ✅ Implementado | Documentação visual do sistema dentro do próprio app |

---

## API — endpoints disponíveis

### Auth
```
POST   /api/auth/login
GET    /api/auth/me
```

### Clientes
```
GET    /api/clients
POST   /api/clients
PUT    /api/clients/:id
DELETE /api/clients/:id
```

### Empresas
```
GET    /api/companies
POST   /api/companies
PUT    /api/companies/:id
DELETE /api/companies/:id
```

### Pessoas
```
GET    /api/people
POST   /api/people
PUT    /api/people/:id
DELETE /api/people/:id
```

### Documentos
```
GET    /api/documents
POST   /api/documents
GET    /api/documents/:id
PUT    /api/documents/:id
DELETE /api/documents/:id
```

### Revisão de documentos
```
GET    /api/review/queue
POST   /api/review/:id/approve
POST   /api/review/:id/reject
```

### Tarefas
```
GET    /api/tasks
POST   /api/tasks
PUT    /api/tasks/:id
DELETE /api/tasks/:id
```

### Prazos
```
GET    /api/deadlines
POST   /api/deadlines
PUT    /api/deadlines/:id
DELETE /api/deadlines/:id
```

### Financeiro
```
GET    /api/finance/charges
POST   /api/finance/charges
PUT    /api/finance/charges/:id
```

### Propostas
```
GET    /api/proposals
POST   /api/proposals
PUT    /api/proposals/:id
```

### Dashboard
```
GET    /api/dashboard
```

### WhatsApp
```
POST   /api/webhooks/whatsapp
```

### Health
```
GET    /health   → { status, service, mode, database }
```

---

## Banco de dados — modelos principais

```
Office               → escritório contábil (tenant raiz)
User                 → usuários do escritório (ADMIN / STAFF / CLIENT)
Client               → cliente do escritório
  └─ Company         → empresas do cliente (CNPJ, regime)
  └─ Person          → sócios e representantes legais
DocumentRequest      → solicitação de documento mensal
  └─ DocumentFile    → arquivo enviado (storage R2)
  └─ AIAnalysis      → resultado da análise de IA
WhatsAppMessage      → mensagem recebida/enviada
ConversationState    → estado da conversa por cliente/telefone
Task                 → tarefa interna do escritório
Deadline             → prazo fiscal
Charge               → cobrança financeira
Proposal             → proposta comercial
UnmatchedDocument    → documento recebido sem match de solicitação
```

Todos os modelos com acesso por escritório filtram obrigatoriamente por `officeId`.

---

## Roadmap

### PR 1 — Segurança (urgente antes de qualquer acesso externo)
- [ ] `JWT_SECRET` sem fallback — falhar na inicialização se não configurado
- [ ] `WEBHOOK_SECRET` obrigatório em produção
- [ ] Credenciais R2 com validação na startup
- [ ] Rate limiting no `/api/auth/login`
- [ ] `setErrorHandler` global no Fastify

### PR 2 — Validação de input
- [ ] Zod nas rotas principais (auth, tasks, documents, clients)
- [ ] Tipar `request.params` e `request.body` corretamente (remover `as any`)

### PR 3 — Pipeline de IA real
- [ ] Conectar `ai-gemini.ts` e `ai-local.ts` no `ai.ts`
- [ ] Tornar `analyzeDocument` assíncrona
- [ ] Webhook enfileirar job no BullMQ em vez de processar em memória
- [ ] Corrigir `await analyzeDocument(...)` no worker

### PR 4 — React Router
- [ ] Substituir `useState<AppSectionId>` por React Router v6
- [ ] URLs navegáveis por módulo (`/dashboard`, `/tasks`, `/clients` etc.)

### PR 5 — Schema mais rígido
- [ ] Enums para `ChargeStatus`, `DeadlineStatus`, `ProposalStatus`
- [ ] Enum `DocumentType` para `AIAnalysis.documentType`
- [ ] `@@unique([officeId, providerMessageId])` em `WhatsAppMessage`
- [ ] Índice em `Company.clientId`

### PR 6 — Escalabilidade
- [ ] Dead Letter Queue no BullMQ
- [ ] Paginação cursor-based nos endpoints principais
- [ ] Identificação de escritório por instância WhatsApp (tabela `WhatsAppInstance`)

---

## Scripts úteis

```bash
# Diagnóstico de conectividade do banco
pnpm --filter api db:check

# Diagnóstico completo do schema
pnpm --filter api db:doctor

# Seed de tarefas de exemplo
pnpm --filter api prisma:seed-tasks
```

---

## Deploy

### Frontend
Conecte o repositório ao Vercel. O domínio de produção já está no allowlist de CORS da API: `https://valentim-swart.vercel.app`.

### Backend
Railway, Render ou VPS com Docker. Certifique-se de configurar todas as variáveis de ambiente obrigatórias antes do deploy. **Nunca suba `.env` para o repositório.**

### Banco
Neon (PostgreSQL serverless) recomendado para produção. Configure `DATABASE_URL` e `DIRECT_URL` separadamente (Neon exige connection pooling + direct connection para Prisma Migrate).

---

## Autor

Projeto desenvolvido por João Matheus Amorim como produto SaaS voltado a escritórios contábeis brasileiros.
