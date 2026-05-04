# Valentim — Sistema de Gestão para Escritório Contábil

> Plataforma web para organizar clientes, empresas, documentos mensais, prazos, alertas, atendimento, financeiro e propostas de um escritório contábil.

---

## 1. Visão geral

O **Valentim** é um sistema web criado para escritórios contábeis que precisam reduzir retrabalho, organizar documentos dos clientes e controlar prazos importantes.

A primeira versão será um **MVP funcional** para validar com um contador real. O sistema não nasce para substituir sistemas contábeis tradicionais. Ele entra como uma camada de organização operacional: documentos, pendências, prazos, lembretes, atendimento e controle financeiro básico.

Problemas que o Valentim resolve:

- documentos enviados pelo WhatsApp e perdidos em conversas;
- clientes que esquecem de enviar arquivos mensais;
- dificuldade para saber quem está pendente;
- controle de prazos fiscais feito em planilhas;
- retrabalho para cobrar os mesmos documentos todo mês;
- falta de histórico centralizado por cliente, empresa e mês;
- dificuldade para controlar honorários em aberto;
- ausência de um fluxo organizado para propostas comerciais.

Frase comercial:

> O Valentim organiza documentos, prazos e pendências do escritório contábil em um único painel.

---

## 2. Objetivo do MVP

O MVP deve entregar valor real com o menor número possível de funcionalidades.

Objetivo inicial:

1. permitir login do escritório;
2. cadastrar clientes;
3. cadastrar empresas vinculadas aos clientes;
4. criar solicitações mensais de documentos;
5. permitir upload e organização de arquivos;
6. controlar status dos documentos;
7. exibir painel de pendências;
8. controlar prazos e vencimentos;
9. gerar alertas internos e mensagens prontas;
10. controlar honorários básicos;
11. registrar propostas para novos clientes.

---

## 3. Stack recomendada

### Front-end

- React
- Vite
- TypeScript
- React Router
- TanStack Query
- React Hook Form
- Zod
- Tailwind CSS ou CSS Modules

### Back-end

- Node.js
- Fastify
- TypeScript
- Prisma ORM
- JWT
- bcrypt
- Zod

### Banco de dados

- PostgreSQL

### Upload de arquivos

Opções recomendadas:

- Supabase Storage
- Cloudflare R2
- AWS S3

Para o MVP, Supabase Storage é o caminho mais rápido.

### E-mail e alertas

- Resend para e-mails transacionais
- WhatsApp somente em fase futura, preferencialmente via API oficial ou provedor homologado

### Deploy

- Front-end: Vercel
- Back-end: Render, Railway ou Fly.io
- Banco: Supabase, Neon ou Railway PostgreSQL

---

## 4. Arquitetura geral

```txt
Usuário
  ↓
Front-end React
  ↓ HTTP/JSON
API Node.js/Fastify
  ↓ Prisma
PostgreSQL

Uploads:
Front-end → API → Storage externo

Alertas:
API → E-mail / mensagens prontas / WhatsApp futuro
```

---

## 5. Estrutura do repositório

```txt
valentim/
├── README.md
├── .gitignore
├── .env.example
├── package.json
├── pnpm-workspace.yaml
├── apps/
│   ├── web/
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── routes/
│   │       ├── pages/
│   │       │   ├── Login/
│   │       │   ├── Dashboard/
│   │       │   ├── Atendimento/
│   │       │   ├── Clientes/
│   │       │   ├── Empresas/
│   │       │   ├── Documentos/
│   │       │   ├── Prazos/
│   │       │   ├── Alertas/
│   │       │   ├── Financeiro/
│   │       │   ├── Propostas/
│   │       │   └── Configuracoes/
│   │       ├── components/
│   │       ├── services/
│   │       ├── hooks/
│   │       ├── contexts/
│   │       ├── styles/
│   │       ├── types/
│   │       └── utils/
│   └── api/
│       ├── package.json
│       ├── tsconfig.json
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── seed.ts
│       └── src/
│           ├── server.ts
│           ├── app.ts
│           ├── config/
│           ├── modules/
│           │   ├── auth/
│           │   ├── users/
│           │   ├── escritorios/
│           │   ├── clientes/
│           │   ├── empresas/
│           │   ├── documentos/
│           │   ├── prazos/
│           │   ├── alertas/
│           │   ├── atendimento/
│           │   ├── financeiro/
│           │   ├── propostas/
│           │   └── uploads/
│           ├── middlewares/
│           ├── errors/
│           ├── jobs/
│           ├── templates/
│           └── utils/
├── packages/
│   └── shared/
│       ├── package.json
│       └── src/
│           ├── types/
│           ├── constants/
│           └── validators/
├── docs/
│   ├── arquitetura.md
│   ├── banco-de-dados.md
│   ├── regras-de-negocio.md
│   ├── rotas-api.md
│   ├── fluxos-do-sistema.md
│   ├── checklist-mvp.md
│   └── proposta-comercial.md
└── .github/
    └── workflows/
        └── ci.yml
```

---

## 6. Perfis de usuário

### Administrador

Pode:

- gerenciar usuários;
- cadastrar clientes;
- cadastrar empresas;
- controlar documentos;
- controlar prazos;
- acessar financeiro;
- gerar propostas;
- alterar configurações.

### Funcionário

Pode:

- visualizar clientes;
- conferir documentos;
- atualizar status;
- acompanhar prazos;
- registrar atendimento.

Pode ser bloqueado de:

- excluir dados críticos;
- alterar financeiro;
- alterar configurações globais.

### Cliente

Pode:

- acessar apenas sua própria empresa;
- visualizar documentos solicitados;
- enviar arquivos;
- acompanhar status;
- visualizar avisos e pendências.

---

## 7. Módulos do sistema

## 7.1 Autenticação

Responsável por login, sessão e permissões.

Rotas previstas:

```txt
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

No MVP, o primeiro administrador pode ser criado via seed.

---

## 7.2 Painel geral

Tela inicial do escritório.

Indicadores:

- clientes ativos;
- empresas cadastradas;
- documentos pendentes;
- documentos enviados;
- documentos conferidos;
- prazos próximos;
- prazos vencidos;
- honorários em aberto;
- alertas enviados.

Filtros:

- mês;
- cliente;
- empresa;
- status;
- responsável.

---

## 7.3 Clientes

Cadastro dos clientes atendidos pelo escritório.

Campos principais:

```txt
nome
tipo: pessoa física ou jurídica
cpf/cnpj
telefone
e-mail
responsável interno
status
observações
data de cadastro
```

Funcionalidades:

- criar cliente;
- editar cliente;
- listar clientes;
- buscar por nome ou CNPJ;
- ver detalhes;
- visualizar pendências;
- visualizar documentos;
- visualizar financeiro.

---

## 7.4 Empresas

Um cliente pode ter uma ou mais empresas.

Campos principais:

```txt
cliente_id
razão social
nome fantasia
cnpj
inscrição municipal
inscrição estadual
regime tributário
atividade principal
CNAE
cidade
estado
vencimento do certificado digital
status
```

Regimes possíveis:

```txt
MEI
Simples Nacional
Lucro Presumido
Lucro Real
Pessoa Física
Outro
```

---

## 7.5 Documentos

Módulo principal do MVP.

Tipos comuns:

```txt
Notas fiscais de entrada
Notas fiscais de saída
Extrato bancário
Comprovantes de despesas
Folha de pagamento
Pró-labore
Contratos
XML
DAS pago
DARF pago
Recibos
Outros
```

Status:

```txt
Pendente
Enviado
Em análise
Conferido
Recusado
Vencido
```

Funcionalidades:

- criar solicitação de documento;
- gerar pendências mensais;
- upload de arquivo;
- download;
- marcar como conferido;
- recusar com motivo;
- filtrar por mês;
- filtrar por cliente;
- filtrar por empresa;
- histórico por empresa.

---

## 7.6 Prazos

Controle de vencimentos importantes.

Tipos:

```txt
DAS
DARF
INSS
FGTS
ISS
Pró-labore
Honorários
Certificado digital
Alvará
Contrato
Obrigações acessórias
Outros
```

Status:

```txt
Aberto
Pago
Concluído
Atrasado
Cancelado
```

Prioridade:

```txt
Baixa
Média
Alta
Urgente
```

---

## 7.7 Alertas

Primeira versão:

- alertas internos;
- mensagens prontas para WhatsApp;
- histórico de disparos manuais;
- alertas por prazo próximo;
- alertas por documento pendente.

Segunda versão:

- envio automático por e-mail;
- integração com WhatsApp oficial ou provedor homologado.

Canais:

```txt
Sistema
E-mail
WhatsApp
```

Status:

```txt
Pendente
Enviado
Lido
Falhou
Cancelado
```

---

## 7.8 Atendimento

Módulo para registrar comunicação com clientes.

MVP:

- histórico de mensagens internas;
- mensagens prontas;
- registro de contato;
- vínculo com cliente;
- vínculo com documento ou prazo.

Futuro:

- integração com WhatsApp;
- caixa de entrada;
- automações;
- IA para sugerir respostas.

---

## 7.9 Financeiro

Controle básico de honorários.

Campos:

```txt
cliente_id
empresa_id
descrição
valor
vencimento
status
forma de pagamento
data de pagamento
observação
```

Status:

```txt
Aberto
Pago
Atrasado
Cancelado
```

---

## 7.10 Propostas

Módulo comercial para novos clientes.

Campos:

```txt
lead ou cliente
serviço
descrição
valor de implantação
valor mensal
validade
status
observações
```

Status:

```txt
Rascunho
Enviada
Aceita
Recusada
Vencida
```

---

## 8. Modelagem inicial do banco

Entidades principais:

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

Relacionamento geral:

```txt
Office 1:N Users
Office 1:N Clients
Client 1:N Companies
Company 1:N DocumentRequests
DocumentRequest 1:N DocumentFiles
Company 1:N Deadlines
Client 1:N Charges
Client 1:N Proposals
Client 1:N Messages
Client 1:N Alerts
```

---

## 9. Rotas principais da API

### Auth

```txt
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

### Clientes

```txt
GET    /api/clients
POST   /api/clients
GET    /api/clients/:id
PUT    /api/clients/:id
DELETE /api/clients/:id
```

### Empresas

```txt
GET    /api/companies
POST   /api/companies
GET    /api/companies/:id
PUT    /api/companies/:id
DELETE /api/companies/:id
```

### Documentos

```txt
GET    /api/documents
POST   /api/documents/requests
GET    /api/documents/requests/:id
PUT    /api/documents/requests/:id/status
POST   /api/documents/requests/:id/upload
GET    /api/documents/files/:id/download
```

### Prazos

```txt
GET    /api/deadlines
POST   /api/deadlines
PUT    /api/deadlines/:id
DELETE /api/deadlines/:id
```

### Alertas

```txt
GET  /api/alerts
POST /api/alerts/send
POST /api/alerts/generate-document-reminders
POST /api/alerts/generate-deadline-reminders
```

### Financeiro

```txt
GET  /api/charges
POST /api/charges
PUT  /api/charges/:id
POST /api/charges/:id/mark-paid
```

### Propostas

```txt
GET  /api/proposals
POST /api/proposals
PUT  /api/proposals/:id
POST /api/proposals/:id/send
POST /api/proposals/:id/accept
```

---

## 10. Fluxos principais

### Fluxo de documentos mensais

```txt
1. Admin cadastra cliente.
2. Admin cadastra empresa.
3. Admin define quais documentos a empresa precisa enviar.
4. Sistema cria pendências do mês.
5. Cliente envia arquivo.
6. Funcionário confere.
7. Documento muda para conferido ou recusado.
8. Dashboard atualiza os indicadores.
```

### Fluxo de prazo

```txt
1. Funcionário cria prazo.
2. Sistema mostra no calendário/painel.
3. Quando faltar poucos dias, alerta é gerado.
4. Escritório conclui ou marca como pago.
5. Histórico fica salvo.
```

### Fluxo financeiro

```txt
1. Admin cadastra honorário.
2. Sistema mostra cobrança em aberto.
3. Se passar do vencimento, vira atraso.
4. Admin marca como pago.
5. Dashboard financeiro atualiza.
```

### Fluxo de proposta

```txt
1. Escritório cadastra lead.
2. Cria proposta.
3. Envia proposta.
4. Cliente aceita ou recusa.
5. Se aceitar, pode virar cliente ativo.
```

---

## 11. Segurança e LGPD

Como o sistema lida com dados contábeis, fiscais e pessoais, precisa ter cuidados desde o início.

Obrigatório no MVP:

- senhas criptografadas;
- autenticação com JWT;
- proteção de rotas;
- separação de dados por escritório;
- controle de permissões;
- validação de upload;
- limite de tamanho de arquivo;
- logs de ações importantes;
- variáveis sensíveis fora do código;
- HTTPS em produção.

Futuro:

- 2FA;
- auditoria avançada;
- termo de uso;
- política de privacidade;
- exportação de dados;
- backups automáticos.

---

## 12. Variáveis de ambiente

Exemplo de `.env`:

```env
NODE_ENV=development
PORT=3333
DATABASE_URL="postgresql://user:password@localhost:5432/valentim"
JWT_SECRET="change-me"
JWT_EXPIRES_IN="7d"
WEB_URL="http://localhost:5173"
API_URL="http://localhost:3333"

STORAGE_PROVIDER="supabase"
SUPABASE_URL=""
SUPABASE_SERVICE_ROLE_KEY=""
SUPABASE_BUCKET="documents"

RESEND_API_KEY=""
EMAIL_FROM="Valentim <noreply@seudominio.com>"
```

---

## 13. Comandos previstos

Instalação:

```bash
pnpm install
```

Rodar tudo em desenvolvimento:

```bash
pnpm dev
```

Rodar front-end:

```bash
pnpm --filter web dev
```

Rodar back-end:

```bash
pnpm --filter api dev
```

Prisma:

```bash
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate
pnpm --filter api prisma:seed
```

Build:

```bash
pnpm build
```

Lint:

```bash
pnpm lint
```

---

## 14. Ordem de desenvolvimento

### Etapa 1 — Fundação

- criar monorepo;
- configurar TypeScript;
- configurar front-end;
- configurar back-end;
- configurar Prisma;
- conectar PostgreSQL;
- criar seed do admin.

### Etapa 2 — Auth

- login;
- middleware de autenticação;
- rota `/me`;
- proteção no front-end;
- logout.

### Etapa 3 — Clientes e empresas

- CRUD de clientes;
- CRUD de empresas;
- tela de listagem;
- tela de detalhes;
- busca e filtros.

### Etapa 4 — Documentos

- criar solicitações;
- listar pendências;
- upload de arquivos;
- alterar status;
- download;
- histórico por mês.

### Etapa 5 — Prazos

- CRUD de prazos;
- filtros por data/status;
- alertas visuais;
- prazos vencidos.

### Etapa 6 — Alertas

- alertas internos;
- mensagens prontas;
- histórico;
- e-mail futuramente.

### Etapa 7 — Financeiro

- cobranças;
- status pago/aberto/atrasado;
- totais no dashboard.

### Etapa 8 — Propostas

- criar proposta;
- status;
- PDF futuramente;
- converter proposta aceita em cliente.

### Etapa 9 — Deploy

- publicar front-end;
- publicar API;
- configurar banco;
- configurar variáveis;
- testar ambiente de produção.

---

## 15. Checklist do MVP

O MVP só está pronto quando:

- [ ] existe login funcional;
- [ ] usuário admin consegue entrar;
- [ ] cliente pode ser cadastrado;
- [ ] empresa pode ser cadastrada;
- [ ] documento pode ser solicitado;
- [ ] arquivo pode ser enviado;
- [ ] documento pode mudar de status;
- [ ] dashboard mostra pendências reais;
- [ ] prazo pode ser cadastrado;
- [ ] prazo vencido aparece destacado;
- [ ] honorário pode ser cadastrado;
- [ ] proposta pode ser registrada;
- [ ] sistema está online;
- [ ] dados sensíveis estão em `.env`;
- [ ] README está atualizado.

---

## 16. Escopo que NÃO entra no primeiro MVP

Para evitar travar o projeto, não entra inicialmente:

- integração direta com Receita Federal;
- emissão automática de guias;
- cálculo tributário automático;
- WhatsApp automático em massa;
- assinatura digital avançada;
- integração bancária;
- emissão de nota fiscal;
- conciliação automática;
- IA avançada.

Essas funções podem entrar depois, quando o MVP estiver validado.

---

## 17. Proposta comercial resumida

O Valentim pode ser apresentado para o contador assim:

> Uma plataforma personalizada para organizar documentos, prazos e pendências dos clientes do escritório, reduzindo retrabalho e centralizando informações que hoje ficam espalhadas no WhatsApp, planilhas e anotações.

Primeira entrega recomendada:

```txt
Login
Painel geral
Clientes
Empresas
Documentos
Prazos
Alertas internos
Financeiro básico
Propostas
```

---

## 18. Status do projeto

Status atual:

```txt
Fase: Planejamento e estruturação
Objetivo atual: montar base técnica e documentação
Próximo passo: criar monorepo e iniciar implementação do MVP
```

---

## 19. Autor

Desenvolvido por João Matheus Amorim.

Projeto criado como base para freelas e sistemas sob medida para escritórios contábeis.
