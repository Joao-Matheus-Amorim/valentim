# Roteiro de Desenvolvimento — Valentim

Este roteiro define a ordem recomendada para construir o projeto sem se perder.

---

## Fase 0 — Preparação

Objetivo: deixar ambiente pronto.

Tarefas:

- instalar Node.js LTS;
- instalar pnpm;
- clonar repositório;
- criar `.env` a partir de `.env.example`;
- escolher banco PostgreSQL;
- criar banco local ou cloud;
- definir stack final.

Comandos previstos:

```bash
git clone https://github.com/Joao-Matheus-Amorim/valentim.git
cd valentim
pnpm install
cp .env.example .env
```

---

## Fase 1 — Criar monorepo

Objetivo: estruturar o projeto.

Tarefas:

- criar `pnpm-workspace.yaml`;
- criar `apps/web`;
- criar `apps/api`;
- criar `packages/shared`;
- configurar TypeScript;
- configurar scripts globais.

Estrutura esperada:

```txt
apps/web
apps/api
packages/shared
```

---

## Fase 2 — Front-end base

Objetivo: criar a interface inicial navegável.

Tarefas:

- criar Vite React;
- configurar React Router;
- criar layout base;
- criar sidebar/topbar;
- criar páginas vazias;
- aplicar identidade visual do protótipo.

Páginas iniciais:

```txt
/login
/dashboard
/atendimento
/clientes
/empresas
/documentos
/prazos
/alertas
/financeiro
/propostas
/configuracoes
```

---

## Fase 3 — API base

Objetivo: criar servidor com Fastify.

Tarefas:

- criar servidor;
- configurar CORS;
- configurar tratamento de erros;
- configurar health check;
- configurar Prisma;
- conectar PostgreSQL.

Rota inicial:

```txt
GET /health
```

Resposta:

```json
{
  "status": "ok"
}
```

---

## Fase 4 — Banco e Prisma

Objetivo: criar schema inicial.

Tarefas:

- criar enums;
- criar models principais;
- gerar migration;
- rodar migration;
- criar seed do escritório;
- criar seed do usuário admin.

Comandos:

```bash
pnpm --filter api prisma generate
pnpm --filter api prisma migrate dev
pnpm --filter api prisma db seed
```

---

## Fase 5 — Autenticação

Objetivo: entrar no sistema com usuário real.

Tarefas back-end:

- criar rota login;
- buscar usuário por e-mail;
- comparar senha com bcrypt;
- gerar JWT;
- criar middleware auth;
- criar rota `/auth/me`.

Tarefas front-end:

- tela de login;
- salvar token;
- proteger rotas;
- criar contexto de autenticação;
- logout.

Critério de aceite:

- usuário admin consegue logar;
- sem token não acessa dashboard;
- com token acessa páginas privadas.

---

## Fase 6 — Clientes

Objetivo: cadastrar clientes reais.

Back-end:

- `GET /clients`;
- `POST /clients`;
- `GET /clients/:id`;
- `PUT /clients/:id`;
- inativar cliente.

Front-end:

- listagem;
- busca;
- formulário;
- detalhes;
- edição.

Critério de aceite:

- cliente cadastrado aparece na lista;
- busca funciona;
- detalhes abrem corretamente.

---

## Fase 7 — Empresas

Objetivo: vincular empresas a clientes.

Back-end:

- CRUD de empresas;
- validação de cliente;
- filtro por cliente.

Front-end:

- aba empresas;
- formulário de empresa;
- vínculo com cliente;
- exibição do regime tributário.

Critério de aceite:

- uma empresa fica vinculada a um cliente;
- empresa aparece no detalhe do cliente.

---

## Fase 8 — Documentos

Objetivo: entregar a principal dor do contador.

Back-end:

- criar solicitação;
- listar solicitações;
- upload;
- download;
- alterar status;
- recusar com motivo.

Front-end:

- painel de documentos;
- filtros por mês/status;
- upload;
- status visual;
- detalhes do documento.

Critério de aceite:

- escritório cria solicitação;
- arquivo é enviado;
- status muda;
- arquivo pode ser acessado.

---

## Fase 9 — Prazos

Objetivo: controlar vencimentos.

Back-end:

- CRUD de prazos;
- filtros por data;
- status vencido.

Front-end:

- lista de prazos;
- cards de urgência;
- formulário;
- marcar como concluído.

Critério de aceite:

- prazo vencido aparece em destaque;
- prazo concluído sai das pendências.

---

## Fase 10 — Alertas

Objetivo: organizar cobranças e lembretes.

Back-end:

- criar alerta;
- listar alertas;
- gerar mensagem pronta;
- registrar histórico.

Front-end:

- central de alertas;
- botão para copiar mensagem;
- enviar alerta interno;
- histórico.

Critério de aceite:

- sistema gera mensagem pronta para cliente;
- alerta fica registrado.

---

## Fase 11 — Financeiro

Objetivo: controlar honorários.

Back-end:

- criar cobrança;
- listar cobranças;
- marcar como paga;
- identificar atraso.

Front-end:

- tabela financeiro;
- totais;
- filtros;
- status visual.

Critério de aceite:

- cobrança vencida aparece como atrasada;
- cobrança paga atualiza dashboard.

---

## Fase 12 — Propostas

Objetivo: ajudar o escritório a vender.

Back-end:

- criar proposta;
- listar;
- alterar status;
- aceitar/recusar.

Front-end:

- lista de propostas;
- formulário;
- detalhes;
- status.

Critério de aceite:

- proposta aceita aparece como oportunidade fechada.

---

## Fase 13 — Dashboard real

Objetivo: substituir dados mockados por dados reais.

Back-end:

- endpoint `/dashboard/summary`;
- agregações por mês;
- agregações por escritório.

Front-end:

- cards reais;
- gráficos simples;
- filtros por período.

Critério de aceite:

- dashboard muda conforme dados cadastrados.

---

## Fase 14 — Deploy

Objetivo: publicar para teste com cliente.

Tarefas:

- publicar banco;
- publicar API;
- publicar front;
- configurar `.env`;
- testar login;
- testar upload;
- testar fluxo completo.

Critério de aceite:

- contador consegue acessar link real;
- consegue cadastrar cliente;
- consegue controlar documentos.

---

## Fase 15 — Validação com cliente

Objetivo: coletar feedback real.

Perguntas:

- O painel mostra o que você precisa?
- O fluxo de documentos faz sentido?
- Quais documentos você cobra todo mês?
- Qual tela mais economizaria tempo?
- O que está confuso?
- O que é obrigatório para usar no escritório?

Resultado esperado:

- ajustes no MVP;
- priorização da próxima fase;
- proposta comercial mais forte.
