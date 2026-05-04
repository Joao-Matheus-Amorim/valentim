# Arquitetura — Valentim

## Objetivo

Definir como o sistema será dividido, como os módulos conversam e qual será a base técnica do MVP.

---

## Visão macro

```txt
apps/web  → interface do usuário
apps/api  → regras de negócio e API
packages/shared → tipos, constantes e validações compartilhadas
PostgreSQL → banco de dados
Storage externo → arquivos enviados pelos clientes
Serviço de e-mail → alertas e notificações
```

---

## Camadas da API

Cada módulo da API deve seguir este padrão:

```txt
modules/clientes/
├── clientes.routes.ts
├── clientes.controller.ts
├── clientes.service.ts
├── clientes.repository.ts
├── clientes.schemas.ts
└── clientes.types.ts
```

### Routes

Define endpoints HTTP.

### Controller

Recebe request, valida entrada e chama service.

### Service

Contém regra de negócio.

### Repository

Acessa banco via Prisma.

### Schemas

Valida dados com Zod.

### Types

Tipos específicos do módulo.

---

## Módulos principais

```txt
auth
users
escritorios
clientes
empresas
documentos
uploads
prazos
alertas
atendimento
financeiro
propostas
audit-logs
```

---

## Fluxo de autenticação

```txt
1. Usuário envia e-mail/senha.
2. API busca usuário.
3. API compara senha com bcrypt.
4. API gera JWT.
5. Front-end salva token.
6. Requests seguintes enviam Authorization: Bearer token.
7. Middleware valida o token.
```

---

## Fluxo de upload

```txt
1. Cliente escolhe arquivo.
2. Front-end envia para API.
3. API valida tipo e tamanho.
4. API envia para storage externo.
5. API salva metadados no banco.
6. Documento muda status para Enviado.
```

---

## Multiempresa / multiescritório

Todas as entidades principais devem possuir `officeId`.

Isso impede que um escritório veja dados de outro.

Exemplo:

```txt
User.officeId
Client.officeId
Company.officeId
DocumentRequest.officeId
Deadline.officeId
Charge.officeId
Proposal.officeId
```

---

## Decisões importantes

- Não misturar regra de negócio dentro do front-end.
- Não acessar Prisma direto no controller.
- Não salvar arquivo sensível no repositório.
- Não commitar `.env`.
- Não implementar WhatsApp automático no MVP sem validar necessidade real.
