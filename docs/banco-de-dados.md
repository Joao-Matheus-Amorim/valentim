# Banco de Dados — Valentim

Este documento descreve a modelagem inicial do banco de dados do sistema Valentim.

---

## 1. Banco recomendado

Banco principal recomendado:

```txt
PostgreSQL
```

ORM recomendado:

```txt
Prisma
```

Motivo:

- ótimo suporte com TypeScript;
- migrations organizadas;
- relacionamento claro entre entidades;
- facilidade para evoluir o MVP;
- compatível com Supabase, Neon, Railway e Render.

---

## 2. Entidades principais

```txt
Office
User
Client
Company
DocumentRequest
DocumentFile
Deadline
Alert
Message
Charge
Proposal
AuditLog
```

---

## 3. Relacionamentos

```txt
Office 1:N User
Office 1:N Client
Office 1:N Company
Client 1:N Company
Company 1:N DocumentRequest
DocumentRequest 1:N DocumentFile
Company 1:N Deadline
Client 1:N Alert
Client 1:N Message
Client 1:N Charge
Client 1:N Proposal
User 1:N AuditLog
```

---

## 4. Tabela Office

Representa o escritório contábil.

Campos:

```txt
id
name
cnpj
email
phone
createdAt
updatedAt
```

Uso:

- separar dados por escritório;
- permitir no futuro transformar o sistema em SaaS multiempresa.

---

## 5. Tabela User

Representa usuários internos ou clientes com acesso ao portal.

Campos:

```txt
id
officeId
name
email
passwordHash
role
status
createdAt
updatedAt
```

Roles:

```txt
ADMIN
STAFF
CLIENT
```

Status:

```txt
ACTIVE
INACTIVE
BLOCKED
```

---

## 6. Tabela Client

Representa o cliente atendido pelo escritório.

Campos:

```txt
id
officeId
name
type
cpfCnpj
phone
email
internalResponsibleId
status
notes
createdAt
updatedAt
```

Type:

```txt
PERSON
COMPANY
```

Status:

```txt
ACTIVE
INACTIVE
PROSPECT
```

---

## 7. Tabela Company

Representa uma empresa vinculada ao cliente.

Campos:

```txt
id
officeId
clientId
legalName
tradeName
cnpj
stateRegistration
municipalRegistration
taxRegime
mainActivity
cnae
city
state
certificateExpiresAt
status
createdAt
updatedAt
```

TaxRegime:

```txt
MEI
SIMPLES_NACIONAL
LUCRO_PRESUMIDO
LUCRO_REAL
PESSOA_FISICA
OUTRO
```

---

## 8. Tabela DocumentRequest

Representa uma solicitação de documento.

Campos:

```txt
id
officeId
clientId
companyId
title
documentType
referenceMonth
referenceYear
dueDate
status
requestedById
reviewedById
reviewedAt
rejectionReason
notes
createdAt
updatedAt
```

Status:

```txt
PENDING
SENT
UNDER_REVIEW
APPROVED
REJECTED
OVERDUE
```

---

## 9. Tabela DocumentFile

Representa um arquivo enviado.

Campos:

```txt
id
officeId
documentRequestId
uploadedById
originalName
storageKey
mimeType
sizeBytes
createdAt
```

Observação:

- `storageKey` aponta para o arquivo no Supabase Storage, S3 ou Cloudflare R2.
- O arquivo não deve ser salvo no GitHub.

---

## 10. Tabela Deadline

Representa um prazo ou vencimento.

Campos:

```txt
id
officeId
clientId
companyId
title
type
dueDate
amount
status
priority
notes
createdById
completedAt
createdAt
updatedAt
```

Type:

```txt
DAS
DARF
INSS
FGTS
ISS
HONORARIOS
CERTIFICADO_DIGITAL
ALVARA
CONTRATO
OBRIGACAO_ACESSORIA
OUTRO
```

Status:

```txt
OPEN
PAID
DONE
OVERDUE
CANCELED
```

Priority:

```txt
LOW
MEDIUM
HIGH
URGENT
```

---

## 11. Tabela Alert

Representa um alerta gerado pelo sistema ou criado manualmente.

Campos:

```txt
id
officeId
clientId
companyId
type
channel
title
message
status
scheduledFor
sentAt
createdById
createdAt
updatedAt
```

Channel:

```txt
SYSTEM
EMAIL
WHATSAPP
```

Status:

```txt
PENDING
SENT
READ
FAILED
CANCELED
```

---

## 12. Tabela Message

Representa histórico de atendimento.

Campos:

```txt
id
officeId
clientId
companyId
senderType
content
channel
createdById
createdAt
```

SenderType:

```txt
OFFICE
CLIENT
SYSTEM
```

---

## 13. Tabela Charge

Representa cobrança/honorário.

Campos:

```txt
id
officeId
clientId
companyId
description
amount
dueDate
status
paymentMethod
paidAt
notes
createdAt
updatedAt
```

Status:

```txt
OPEN
PAID
OVERDUE
CANCELED
```

---

## 14. Tabela Proposal

Representa proposta comercial.

Campos:

```txt
id
officeId
clientId
leadName
leadEmail
leadPhone
title
description
setupAmount
monthlyAmount
validUntil
status
acceptedAt
createdById
createdAt
updatedAt
```

Status:

```txt
DRAFT
SENT
ACCEPTED
REJECTED
EXPIRED
```

---

## 15. Tabela AuditLog

Registra ações importantes.

Campos:

```txt
id
officeId
userId
action
entity
entityId
metadata
createdAt
```

Exemplos de ações:

```txt
CLIENT_CREATED
DOCUMENT_UPLOADED
DOCUMENT_APPROVED
DOCUMENT_REJECTED
DEADLINE_CREATED
CHARGE_MARKED_AS_PAID
USER_LOGIN
```

---

## 16. Cuidados de modelagem

- Toda tabela sensível deve possuir `officeId`.
- Nunca buscar dados sem filtrar por `officeId`.
- Nunca salvar senha pura.
- Arquivos devem ficar em storage externo.
- Status devem ser enums para evitar bagunça.
- Datas devem ser salvas em UTC.
- Valores financeiros devem ser `Decimal`, não `Float`.
