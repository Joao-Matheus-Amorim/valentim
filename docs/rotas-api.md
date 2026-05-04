# Rotas da API — Valentim

Base URL local:

```txt
http://localhost:3333/api
```

Todas as rotas privadas devem receber:

```txt
Authorization: Bearer <token>
```

---

## 1. Auth

### POST /auth/login

Entrada:

```json
{
  "email": "admin@valentim.com",
  "password": "123456"
}
```

Saída:

```json
{
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "name": "Admin",
    "email": "admin@valentim.com",
    "role": "ADMIN"
  }
}
```

### GET /auth/me

Retorna usuário autenticado.

### POST /auth/logout

No MVP, logout pode ser feito apenas removendo token do front-end.

---

## 2. Dashboard

### GET /dashboard/summary

Query params:

```txt
month=5
year=2026
```

Retorna:

```json
{
  "activeClients": 20,
  "companies": 24,
  "pendingDocuments": 18,
  "sentDocuments": 42,
  "approvedDocuments": 31,
  "upcomingDeadlines": 7,
  "overdueDeadlines": 2,
  "openChargesAmount": 4200
}
```

---

## 3. Clientes

### GET /clients

Filtros:

```txt
search=
status=
page=
limit=
```

### POST /clients

Entrada:

```json
{
  "name": "Padaria do João",
  "type": "COMPANY",
  "cpfCnpj": "12.345.678/0001-90",
  "phone": "21999999999",
  "email": "joao@email.com",
  "notes": "Cliente do Simples Nacional"
}
```

### GET /clients/:id

Retorna detalhes do cliente.

### PUT /clients/:id

Atualiza cliente.

### DELETE /clients/:id

No MVP, prefira inativar em vez de excluir definitivamente.

---

## 4. Empresas

### GET /companies

Filtros:

```txt
clientId=
search=
taxRegime=
status=
```

### POST /companies

Entrada:

```json
{
  "clientId": "uuid",
  "legalName": "Padaria do João LTDA",
  "tradeName": "Padaria do João",
  "cnpj": "12.345.678/0001-90",
  "taxRegime": "SIMPLES_NACIONAL",
  "city": "Magé",
  "state": "RJ"
}
```

### GET /companies/:id

### PUT /companies/:id

### DELETE /companies/:id

---

## 5. Documentos

### GET /documents/requests

Filtros:

```txt
clientId=
companyId=
month=
year=
status=
```

### POST /documents/requests

Entrada:

```json
{
  "clientId": "uuid",
  "companyId": "uuid",
  "title": "Extrato bancário",
  "documentType": "EXTRATO_BANCARIO",
  "referenceMonth": 5,
  "referenceYear": 2026,
  "dueDate": "2026-05-10T00:00:00.000Z"
}
```

### PUT /documents/requests/:id/status

Entrada:

```json
{
  "status": "APPROVED",
  "rejectionReason": null
}
```

### POST /documents/requests/:id/upload

Multipart/form-data:

```txt
file=<arquivo>
```

### GET /documents/files/:id/download

Retorna URL segura ou stream do arquivo.

---

## 6. Prazos

### GET /deadlines

Filtros:

```txt
clientId=
companyId=
status=
from=
to=
priority=
```

### POST /deadlines

Entrada:

```json
{
  "clientId": "uuid",
  "companyId": "uuid",
  "title": "DAS Maio 2026",
  "type": "DAS",
  "dueDate": "2026-05-20T00:00:00.000Z",
  "amount": 312.4,
  "priority": "HIGH"
}
```

### PUT /deadlines/:id

### POST /deadlines/:id/complete

Marca prazo como concluído.

### DELETE /deadlines/:id

---

## 7. Alertas

### GET /alerts

Filtros:

```txt
clientId=
companyId=
channel=
status=
```

### POST /alerts/send

Entrada:

```json
{
  "clientId": "uuid",
  "companyId": "uuid",
  "channel": "SYSTEM",
  "title": "Documento pendente",
  "message": "Olá, ainda falta enviar o extrato bancário de maio."
}
```

### POST /alerts/generate-document-reminders

Gera lembretes para documentos pendentes.

### POST /alerts/generate-deadline-reminders

Gera lembretes para prazos próximos.

---

## 8. Atendimento

### GET /messages

Filtros:

```txt
clientId=
companyId=
channel=
```

### POST /messages

Entrada:

```json
{
  "clientId": "uuid",
  "companyId": "uuid",
  "senderType": "OFFICE",
  "channel": "SYSTEM",
  "content": "Cliente avisado sobre pendência de documentos."
}
```

---

## 9. Financeiro

### GET /charges

Filtros:

```txt
clientId=
companyId=
status=
month=
year=
```

### POST /charges

Entrada:

```json
{
  "clientId": "uuid",
  "companyId": "uuid",
  "description": "Honorários contábeis Maio/2026",
  "amount": 450,
  "dueDate": "2026-05-10T00:00:00.000Z"
}
```

### PUT /charges/:id

### POST /charges/:id/mark-paid

Entrada:

```json
{
  "paymentMethod": "PIX",
  "paidAt": "2026-05-08T12:00:00.000Z"
}
```

---

## 10. Propostas

### GET /proposals

### POST /proposals

Entrada:

```json
{
  "leadName": "Mercado Central",
  "leadEmail": "contato@mercado.com",
  "leadPhone": "21999999999",
  "title": "Proposta de serviços contábeis",
  "description": "Abertura e acompanhamento mensal",
  "setupAmount": 900,
  "monthlyAmount": 550,
  "validUntil": "2026-06-01T00:00:00.000Z"
}
```

### PUT /proposals/:id

### POST /proposals/:id/send

### POST /proposals/:id/accept

### POST /proposals/:id/reject
