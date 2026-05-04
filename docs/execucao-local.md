# Execução Local — Valentim

Guia para rodar a Fase 1 do projeto localmente.

---

## 1. Pré-requisitos

Instale:

```bash
node -v
pnpm -v
```

Versões recomendadas:

```txt
Node.js >= 20
pnpm >= 9
```

---

## 2. Clonar o repositório

```bash
git clone https://github.com/Joao-Matheus-Amorim/valentim.git
cd valentim
```

---

## 3. Instalar dependências

```bash
pnpm install
```

---

## 4. Criar arquivo de ambiente

Linux/WSL:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Na Fase 1, tudo roda com providers mockados:

```env
WHATSAPP_PROVIDER="mock"
AI_PROVIDER="mock"
```

---

## 5. Rodar tudo

```bash
pnpm dev
```

Isso inicia:

```txt
apps/web → http://localhost:5173
apps/api → http://localhost:3333
```

---

## 6. Rodar separado

Front-end:

```bash
pnpm --filter web dev
```

API:

```bash
pnpm --filter api dev
```

---

## 7. Testar API

Health check:

```bash
curl http://localhost:3333/health
```

PowerShell:

```powershell
Invoke-RestMethod http://localhost:3333/health
```

---

## 8. Testar webhook mockado

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

Listar mensagens recebidas:

```bash
curl http://localhost:3333/api/whatsapp/messages
```

PowerShell:

```powershell
Invoke-RestMethod http://localhost:3333/api/whatsapp/messages
```

---

## 9. O que a Fase 1 entrega

```txt
Monorepo pnpm
Pacote shared com tipos de domínio
API Fastify com health check
Webhook WhatsApp mockado
Listagem de mensagens mockadas
Console visual React WhatsApp-first
Documentação de arquitetura e implementação
```

---

## 10. Próxima fase

Fase 2:

```txt
Prisma
PostgreSQL
schema inicial
seed de Office/Admin
Client
Company
DocumentRequest
WhatsAppMessage
AIAnalysis
ConversationState
UnmatchedDocument
```
