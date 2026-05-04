# Valentim WhatsApp-first — Análise, Ajustes e Implementação em Fases

Este documento consolida a nova visão do projeto Valentim: o cliente do escritório contábil não usa portal web. O cliente usa apenas WhatsApp. O painel web fica para ADMIN e STAFF.

---

## 1. Mudança de visão do produto

### Antes

O sistema foi inicialmente pensado como:

```txt
Cliente acessa portal web
Cliente envia documentos pelo portal
Contador acompanha pelo dashboard
```

### Agora

A visão correta passa a ser:

```txt
Cliente usa somente WhatsApp
Cliente envia documentos no WhatsApp
Webhook recebe mensagens e arquivos
IA lê, classifica e extrai dados
Sistema arquiva e atualiza status
Contador acompanha tudo no dashboard web
```

Essa abordagem é mais forte comercialmente porque o cliente final não precisa aprender sistema nenhum.

Frase de produto:

> O Valentim transforma o WhatsApp do escritório em uma esteira inteligente de recebimento, leitura, classificação e organização de documentos contábeis.

---

## 2. Canais por perfil

| Perfil | Canal principal | O que faz |
|---|---|---|
| Cliente | WhatsApp | Recebe pedidos, envia documentos, recebe confirmações e lembretes |
| STAFF | Dashboard Web | Cria solicitações, acompanha IA, revisa documentos e controla pendências |
| ADMIN | Dashboard Web | Gerencia usuários, clientes, templates, relatórios, planos e configurações |
| Sistema | Workers/API | Processa mídia, chama IA, atualiza estados, envia notificações |

---

## 3. Arquitetura WhatsApp-first

```txt
WhatsApp do cliente
  ↓
Provider WhatsApp
Meta Cloud API / Z-API / Evolution API
  ↓
Webhook público Fastify
  ↓
Validação de assinatura / token
  ↓
Registro de WhatsAppMessage
  ↓
Fila BullMQ / Redis
  ↓
Worker de download da mídia
  ↓
Storage temporário
  ↓
AI Processor
  ↓
Classificação + extração + confidence score
  ↓
Matching com DocumentRequest
  ↓
Storage definitivo
  ↓
DocumentFile + AIAnalysis
  ↓
Atualização de DocumentRequest
  ↓
Resposta automática no WhatsApp
  ↓
Dashboard STAFF atualizado
```

---

## 4. Novas entidades do domínio

Além das entidades já documentadas, entram quatro entidades essenciais.

## 4.1 WhatsAppMessage

Registra cada mensagem recebida ou enviada pelo WhatsApp.

Campos recomendados:

```txt
id
officeId
clientId?
companyId?
phone
provider
providerMessageId
direction: INBOUND | OUTBOUND
messageType: TEXT | IMAGE | DOCUMENT | AUDIO | VIDEO | STICKER | UNKNOWN
body?
mediaId?
mediaUrl?
mimeType?
fileName?
rawPayload
processed
processingStatus: RECEIVED | QUEUED | PROCESSING | PROCESSED | FAILED
errorMessage?
receivedAt
createdAt
updatedAt
```

Regras:

- Toda mensagem inbound deve ser salva antes de processar.
- A mensagem precisa ser idempotente pelo `providerMessageId`.
- Mensagem sem cliente conhecido deve virar triagem.

---

## 4.2 AIAnalysis

Salva o resultado da análise feita pela IA.

Campos recomendados:

```txt
id
officeId
documentFileId?
whatsAppMessageId?
model
provider
inputType
extractedDocumentType
competenceMonth?
competenceYear?
cnpj?
cpf?
totalValue?
dueDate?
confidence
summary
flags
rawResponse
analyzedAt
createdAt
```

Regras:

- A IA nunca deve alterar dados sem deixar metadata.
- Resultado com confidence alto pode seguir automático.
- Resultado com confidence médio ou baixo deve ir para revisão.

---

## 4.3 ConversationState

Controla o estado atual da conversa por cliente/telefone.

Campos recomendados:

```txt
id
officeId
clientId?
companyId?
phone
state: IDLE | WAITING_DOC | PROCESSING | CONFIRMED | UNDER_REVIEW | REMINDER_SENT | OVERDUE
currentDocumentRequestId?
pendingDocumentRequestIds
lastInboundAt?
lastOutboundAt?
lastMessagePreview?
metadata
createdAt
updatedAt
```

Regras:

- Um telefone deve ter um estado ativo por escritório.
- O estado muda conforme o cliente envia documentos ou ignora lembretes.
- O estado ajuda o bot a responder com contexto.

---

## 4.4 UnmatchedDocument

Registra documentos que chegaram, mas não foram associados com segurança a uma solicitação.

Campos recomendados:

```txt
id
officeId
clientId?
companyId?
whatsAppMessageId
documentFileId?
aiAnalysisId?
phone
reason
triageStatus: PENDING | ASSIGNED | IGNORED | RESOLVED
resolvedById?
resolvedAt?
staffNote?
createdAt
updatedAt
```

Regras:

- Documento sem match nunca deve ser perdido.
- Deve aparecer em uma inbox de triagem para STAFF.
- STAFF pode associar manualmente a um DocumentRequest.

---

## 5. Estados principais

## 5.1 DocumentRequest

```txt
PENDING
  ↓ cliente envia arquivo
SENT
  ↓ staff inicia análise
UNDER_REVIEW
  ↓ aprovado
APPROVED

UNDER_REVIEW
  ↓ rejeitado
REJECTED
  ↓ cliente reenvia
SENT

PENDING
  ↓ dueDate vencido
OVERDUE
```

Com IA:

```txt
PENDING
  ↓ webhook + IA confidence >= 0.75
SENT

PENDING
  ↓ webhook + IA confidence 0.50 até 0.74
UNDER_REVIEW

PENDING
  ↓ webhook + IA confidence < 0.50
PENDING + WhatsApp pedindo reenvio
```

---

## 5.2 ConversationState

```txt
IDLE
  ↓ STAFF cria solicitação
WAITING_DOC
  ↓ cliente envia arquivo
PROCESSING
  ↓ IA aprova match
CONFIRMED
  ↓ ainda há pendências
WAITING_DOC
  ↓ tudo entregue
IDLE
```

Fluxo de atraso:

```txt
WAITING_DOC
  ↓ 3 dias sem resposta
REMINDER_SENT
  ↓ 7 dias sem resposta
OVERDUE
```

---

## 6. Pipeline técnico detalhado

## 6.1 Recepção

Responsável por receber eventos do WhatsApp.

Rotas:

```txt
GET  /webhooks/whatsapp/verify
POST /webhooks/whatsapp
```

Tarefas:

- validar assinatura ou token;
- normalizar payload do provider;
- identificar telefone;
- buscar cliente por telefone;
- salvar WhatsAppMessage;
- enfileirar job.

---

## 6.2 Download da mídia

Tarefas:

- obter `mediaId` ou URL;
- baixar binário;
- validar tamanho;
- validar MIME;
- calcular hash;
- evitar duplicidade;
- salvar temporariamente;
- enviar para IA.

---

## 6.3 IA e classificação

Entrada do modelo:

```txt
arquivo
nome do cliente
empresas vinculadas
solicitações pendentes
tipos esperados de documento
competência atual
```

Saída esperada em JSON:

```json
{
  "documentType": "DAS",
  "competenceMonth": 4,
  "competenceYear": 2026,
  "cnpj": "12.345.678/0001-90",
  "totalValue": 1280.50,
  "dueDate": "2026-05-20",
  "confidence": 0.94,
  "summary": "Guia DAS Simples Nacional abr/2026",
  "flags": []
}
```

Regras de decisão:

```txt
confidence >= 0.75 → match automático
0.50 <= confidence < 0.75 → revisão STAFF
confidence < 0.50 → pede reenvio ou triagem
```

---

## 6.4 Matching

Critérios de associação:

1. cliente por telefone;
2. empresa por CNPJ extraído;
3. tipo de documento;
4. competência/mês;
5. DocumentRequest aberto;
6. confidence score.

Se encontrar um único match forte:

```txt
criar DocumentFile
criar AIAnalysis
atualizar DocumentRequest
responder WhatsApp
```

Se encontrar mais de um match ou nenhum:

```txt
criar UnmatchedDocument
notificar STAFF
responder WhatsApp de recebimento genérico
```

---

## 6.5 Resposta automática

Templates iniciais:

```txt
doc_request
doc_received
doc_approved
doc_rejected
reminder_3d
overdue_alert
unmatched_received
invalid_file
```

Exemplo:

```txt
Olá {{client_name}}! Recebemos o documento {{doc_type}} referente a {{competence}}.

Status: em análise.

Ainda falta enviar:
{{pending_list}}
```

---

## 7. Módulos novos na API

```txt
modules/whatsapp
modules/webhooks
modules/ai
modules/queues
modules/conversations
modules/unmatched-documents
```

Estrutura recomendada:

```txt
modules/whatsapp/
├── whatsapp.routes.ts
├── whatsapp.controller.ts
├── whatsapp.service.ts
├── whatsapp.provider.ts
├── whatsapp.schemas.ts
├── whatsapp.types.ts
└── templates/

modules/webhooks/
├── whatsapp-webhook.routes.ts
├── whatsapp-webhook.controller.ts
├── whatsapp-webhook.service.ts
└── normalizers/

modules/ai/
├── ai-analysis.service.ts
├── ai-provider.ts
├── prompts/
│   └── document-analysis.prompt.ts
├── schemas/
│   └── document-analysis.schema.ts
└── types.ts

modules/queues/
├── queue.client.ts
├── document-analysis.queue.ts
└── workers/
    └── document-analysis.worker.ts
```

---

## 8. Rotas novas

### Webhook

```txt
GET  /api/webhooks/whatsapp/verify
POST /api/webhooks/whatsapp
```

### WhatsApp interno

```txt
GET  /api/whatsapp/messages
GET  /api/whatsapp/conversations
POST /api/whatsapp/send-message
POST /api/whatsapp/templates/test
```

### IA

```txt
POST /api/ai/analyze-document
GET  /api/ai/analyses/:id
```

### Triagem

```txt
GET  /api/unmatched-documents
GET  /api/unmatched-documents/:id
POST /api/unmatched-documents/:id/assign
POST /api/unmatched-documents/:id/ignore
```

### Filas

```txt
GET /api/queues/health
GET /api/queues/document-analysis/stats
```

---

## 9. Variáveis de ambiente novas

```env
# WhatsApp
WHATSAPP_PROVIDER=mock
WHATSAPP_PROVIDER_URL=
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_WEBHOOK_SECRET=
WHATSAPP_VERIFY_TOKEN=

# IA
AI_PROVIDER=mock
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
AI_CONFIDENCE_THRESHOLD=0.75
AI_REVIEW_THRESHOLD=0.50

# Redis / filas
REDIS_URL=redis://localhost:6379
BULL_CONCURRENCY=3

# Segurança de webhook
WEBHOOK_RATE_LIMIT_MAX=120
WEBHOOK_RATE_LIMIT_WINDOW=60
```

---

## 10. Fases de implementação

## Fase 1 — Dashboard visual e documentação viva

Objetivo:

- transformar o código React fornecido em uma tela real do projeto;
- corrigir aspas inválidas;
- tipar componentes;
- adicionar a visão WhatsApp-first ao repositório.

Entrega:

```txt
apps/web funcionando
página ArchitectureConsole
abas navegáveis
conteúdo WhatsApp-first documentado
```

---

## Fase 2 — Base monorepo

Objetivo:

- criar estrutura `apps/web`, `apps/api`, `packages/shared`;
- instalar TypeScript, Vite, Fastify, Prisma;
- configurar scripts.

Entrega:

```txt
pnpm dev
pnpm build
pnpm lint
```

---

## Fase 3 — Prisma + domínio atualizado

Objetivo:

- atualizar schema com WhatsAppMessage, AIAnalysis, ConversationState e UnmatchedDocument;
- criar migrations;
- criar seed.

Entrega:

```txt
Office
User
Client
Company
DocumentRequest
DocumentFile
WhatsAppMessage
AIAnalysis
ConversationState
UnmatchedDocument
```

---

## Fase 4 — Webhook mockado

Objetivo:

- implementar webhook com provider mock;
- receber payload fake;
- salvar WhatsAppMessage;
- enfileirar job fake.

Entrega:

```txt
POST /api/webhooks/whatsapp
GET /api/whatsapp/messages
```

---

## Fase 5 — Worker e fila

Objetivo:

- conectar Redis;
- criar BullMQ;
- job de processamento de mensagem;
- retry e dead letter.

Entrega:

```txt
document-analysis.queue
document-analysis.worker
queue health
```

---

## Fase 6 — AI mock primeiro, IA real depois

Objetivo:

- criar interface de provider IA;
- implementar provider mock;
- depois implementar Anthropic/OpenAI.

Entrega:

```txt
AIProvider.analyzeDocument(file, context)
MockAIProvider
AnthropicAIProvider
```

Regra:

> O sistema deve funcionar localmente sem gastar API de IA usando `AI_PROVIDER=mock`.

---

## Fase 7 — Matching automático

Objetivo:

- buscar DocumentRequests pendentes;
- comparar tipo, CNPJ, competência e confidence;
- decidir automático ou revisão.

Entrega:

```txt
match automático
unmatched documents
inbox de revisão
```

---

## Fase 8 — WhatsApp provider real

Objetivo:

- implementar envio/recebimento com provider real;
- começar com Z-API/Evolution em ambiente de teste;
- preparar interface para Meta Cloud API.

Entrega:

```txt
WhatsAppProvider interface
MockWhatsAppProvider
ZApiWhatsAppProvider ou MetaWhatsAppProvider
```

---

## Fase 9 — Dashboard operacional STAFF

Objetivo:

- listar mensagens WhatsApp;
- listar documentos recebidos;
- mostrar análise da IA;
- permitir aprovar/rejeitar.

Entrega:

```txt
Atendimento
Inbox de triagem
Documentos pré-analisados
Aprovação/rejeição
```

---

## Fase 10 — Jobs automáticos

Objetivo:

- geração mensal de documentos;
- lembretes WhatsApp;
- atualização de atrasos;
- alertas para STAFF.

Entrega:

```txt
job mensal
job diário
job de lembrete
job de expiração
```

---

## 11. Decisão técnica estratégica

Não vamos começar usando WhatsApp real e IA real direto.

A ordem correta é:

```txt
mock visual
mock webhook
mock IA
mock WhatsApp
banco real
fila real
storage real
provider WhatsApp real
IA real
```

Motivo:

- evita custo desnecessário;
- permite testar arquitetura local;
- reduz bloqueio com APIs externas;
- acelera a entrega do MVP;
- permite demonstrar valor antes da integração oficial.

---

## 12. Correções necessárias no código React fornecido

O código fornecido precisa de ajustes antes de entrar no projeto:

1. trocar aspas curvas `“ ”` por aspas normais `"` ou `'`;
2. remover blocos ``` que entraram como markdown no meio do JSX;
3. tipar componentes com TypeScript;
4. separar dados estáticos em arrays tipados;
5. criar `ArchitectureConsole.tsx` em vez de deixar tudo no `App.tsx`;
6. usar Tailwind configurado no Vite;
7. evitar importar fontes via `<style>` inline em produção;
8. criar componentes reutilizáveis:
   - Badge;
   - Card;
   - Node;
   - Arr;
   - Step;
9. isolar seções em arquivos próprios depois da primeira versão.

---

## 13. Primeira entrega de código recomendada

A primeira entrega prática deve ser:

```txt
apps/web
  React + Vite + Tailwind
  tela ValentimArchitectureConsole
  abas funcionais
  conteúdo WhatsApp-first

apps/api
  Fastify health check
  estrutura inicial de módulos

packages/shared
  enums e tipos iniciais
```

Isso transforma a visão em software navegável e prepara o terreno para API real.
