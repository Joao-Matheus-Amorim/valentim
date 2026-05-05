# 00 — Visão do Produto

## Nome

**Valentim**

## Proposta

O Valentim é um sistema operacional para escritórios contábeis com abordagem **WhatsApp-first**.

A ideia central é simples:

```txt
Cliente envia documentos pelo WhatsApp
Escritório acompanha pelo dashboard
Sistema organiza documentos, prazos e pendências
```

O cliente não precisa acessar portal, criar senha ou aprender um novo sistema.

---

## Problema

Escritórios contábeis frequentemente lidam com:

- documentos espalhados no WhatsApp;
- clientes que esquecem de enviar arquivos;
- falta de controle sobre pendências mensais;
- prazos fiscais controlados manualmente;
- retrabalho da equipe para cobrar documentos;
- pouca visibilidade sobre documentos recebidos, recusados e em análise;
- controle financeiro básico separado da rotina operacional.

---

## Público-alvo

- Escritórios contábeis pequenos e médios;
- Contadores autônomos com carteira de clientes recorrentes;
- Equipes que usam WhatsApp como principal canal com clientes;
- Escritórios que ainda controlam pendências por planilhas e mensagens soltas.

---

## Usuários

### Administrador

Responsável por:

- gerenciar escritório;
- controlar usuários;
- acompanhar indicadores;
- controlar financeiro;
- acompanhar propostas;
- configurar operação.

### Funcionário

Responsável por:

- cadastrar clientes;
- cadastrar empresas;
- criar solicitações de documentos;
- revisar documentos recebidos;
- acompanhar pendências e prazos.

### Cliente

Responsável apenas por:

- receber pedidos pelo WhatsApp;
- enviar documentos pelo WhatsApp;
- receber confirmações e lembretes.

---

## Escopo do MVP

O MVP atual contempla:

- autenticação;
- cadastro de clientes;
- cadastro de empresas;
- solicitações de documentos;
- prazos;
- financeiro básico;
- propostas;
- webhook WhatsApp mockado;
- IA mockada para classificação inicial;
- dashboard básico;
- banco PostgreSQL via Prisma.

---

## Fora do escopo atual

Não faz parte do MVP atual:

- emissão de guias fiscais;
- cálculo tributário;
- integração direta com Receita Federal;
- conciliação bancária;
- assinatura digital;
- WhatsApp real em produção;
- IA real em produção;
- storage real de arquivos;
- SaaS billing.

---

## Objetivo imediato

Transformar o MVP técnico em uma interface operacional usável pelo escritório:

```txt
Dashboard visual
Clientes
Empresas
Documentos
WhatsApp
Triagem IA
Prazos
Financeiro
Propostas
```