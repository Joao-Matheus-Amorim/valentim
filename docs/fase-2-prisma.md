# Fase 2 — Banco Real + Prisma

Esta fase transforma o Valentim de protótipo mockado para base persistente com PostgreSQL e Prisma.

---

## 1. O que foi adicionado

```txt
apps/api/prisma/schema.prisma
apps/api/prisma/seed.ts
apps/api/src/lib/prisma.ts
```

Também foram adicionados scripts Prisma no `apps/api/package.json`.

---

## 2. Models principais no schema

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
Deadline
Alert
Message
Charge
Proposal
AuditLog
```

---

## 3. Como rodar a Fase 2

Instalar dependências:

```bash
pnpm install
```

Gerar Prisma Client:

```bash
pnpm --filter api prisma:generate
```

Rodar migration:

```bash
pnpm --filter api prisma:migrate -- --name init
```

Rodar seed:

```bash
pnpm --filter api prisma:seed
```

Iniciar API:

```bash
pnpm --filter api dev
```

---

## 4. Login demo criado pelo seed

```txt
E-mail: admin@valentim.local
Senha: Admin@123
```

---

## 5. Dados demo criados

```txt
Office:
- Escritório Valentim Demo

Admin:
- Administrador Valentim

Client:
- Padaria do João
- telefone: 5521999999999

Company:
- Padaria do João LTDA
- CNPJ: 12.345.678/0001-90

DocumentRequests:
- DAS Simples Nacional — Abril/2026
- Extrato bancário — Abril/2026

ConversationState:
- telefone 5521999999999 em WAITING_DOC
```

---

## 6. Testar health check

```bash
curl http://localhost:3333/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "service": "valentim-api",
  "mode": "whatsapp-first",
  "database": "connected"
}
```

---

## 7. Testar webhook persistente

Linux/WSL:

```bash
curl -X POST http://localhost:3333/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "providerMessageId": "msg-001",
    "phone": "5521999999999",
    "messageType": "DOCUMENT",
    "fileName": "das-abril-2026.pdf",
    "mimeType": "application/pdf",
    "mediaUrl": "https://example.com/das.pdf"
  }'
```

PowerShell:

```powershell
$body = @{
  providerMessageId = "msg-001"
  phone = "5521999999999"
  messageType = "DOCUMENT"
  fileName = "das-abril-2026.pdf"
  mimeType = "application/pdf"
  mediaUrl = "https://example.com/das.pdf"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3333/api/webhooks/whatsapp" `
  -ContentType "application/json" `
  -Body $body
```

---

## 8. Listar mensagens persistidas

```bash
curl http://localhost:3333/api/whatsapp/messages
```

PowerShell:

```powershell
Invoke-RestMethod http://localhost:3333/api/whatsapp/messages
```

---

## 9. Comportamento esperado do webhook agora

Ao receber uma mensagem mockada:

```txt
1. busca o primeiro Office cadastrado;
2. tenta casar Client pelo telefone;
3. tenta pegar a primeira Company ativa do Client;
4. salva WhatsAppMessage no banco;
5. atualiza/cria ConversationState;
6. cria AuditLog;
7. retorna pipeline inicial;
8. marca processingStatus como QUEUED.
```

---

## 10. Próxima fase

Fase 3:

```txt
Auth real com JWT
Login do admin
Middleware de autenticação
Rota /api/auth/me
Proteção básica de rotas
Front-end consumindo API
```

Depois:

```txt
CRUD de clientes
CRUD de empresas
DocumentRequest real
Worker de IA mockada
Matching automático
```
