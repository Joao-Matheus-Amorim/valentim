# Checklist do MVP — Valentim

Este checklist define o mínimo necessário para considerar a primeira versão funcional do sistema.

---

## 1. Fundação do projeto

- [ ] Monorepo configurado com pnpm workspaces
- [ ] App web criado em `apps/web`
- [ ] API criada em `apps/api`
- [ ] Pacote compartilhado criado em `packages/shared`
- [ ] TypeScript configurado
- [ ] ESLint configurado
- [ ] Prettier configurado
- [ ] `.env.example` atualizado
- [ ] README atualizado

---

## 2. Banco de dados

- [ ] PostgreSQL configurado
- [ ] Prisma instalado
- [ ] `schema.prisma` criado
- [ ] Migration inicial criada
- [ ] Seed do usuário admin criado
- [ ] Relacionamentos básicos testados

---

## 3. Autenticação

- [ ] Login com e-mail e senha
- [ ] Senha com hash bcrypt
- [ ] JWT gerado no login
- [ ] Middleware de autenticação
- [ ] Rota `/api/auth/me`
- [ ] Logout no front-end
- [ ] Proteção de rotas no front-end

---

## 4. Clientes

- [ ] Criar cliente
- [ ] Listar clientes
- [ ] Buscar cliente
- [ ] Editar cliente
- [ ] Visualizar detalhes
- [ ] Alterar status do cliente

---

## 5. Empresas

- [ ] Criar empresa vinculada a cliente
- [ ] Listar empresas
- [ ] Editar empresa
- [ ] Visualizar documentos da empresa
- [ ] Visualizar prazos da empresa

---

## 6. Documentos

- [ ] Criar solicitação de documento
- [ ] Listar pendências por mês
- [ ] Fazer upload de arquivo
- [ ] Salvar metadados do arquivo
- [ ] Baixar arquivo
- [ ] Marcar como enviado
- [ ] Marcar como em análise
- [ ] Marcar como conferido
- [ ] Recusar documento com motivo

---

## 7. Prazos

- [ ] Criar prazo
- [ ] Listar prazos
- [ ] Filtrar por vencimento
- [ ] Filtrar por status
- [ ] Destacar prazo atrasado
- [ ] Marcar prazo como concluído/pago

---

## 8. Alertas

- [ ] Criar alerta interno
- [ ] Listar alertas
- [ ] Gerar mensagem pronta para documento pendente
- [ ] Gerar mensagem pronta para prazo próximo
- [ ] Registrar histórico de alerta enviado manualmente

---

## 9. Financeiro

- [ ] Criar cobrança de honorário
- [ ] Listar cobranças
- [ ] Marcar como paga
- [ ] Marcar como atrasada automaticamente ou por filtro
- [ ] Exibir total em aberto no dashboard

---

## 10. Propostas

- [ ] Criar proposta
- [ ] Listar propostas
- [ ] Alterar status
- [ ] Marcar como aceita
- [ ] Marcar como recusada

---

## 11. Dashboard

- [ ] Total de clientes ativos
- [ ] Total de empresas
- [ ] Documentos pendentes
- [ ] Documentos enviados
- [ ] Documentos conferidos
- [ ] Prazos próximos
- [ ] Prazos atrasados
- [ ] Honorários em aberto

---

## 12. Segurança mínima

- [ ] Rotas protegidas
- [ ] Dados separados por escritório
- [ ] Validação com Zod
- [ ] Upload com limite de tamanho
- [ ] Upload com tipos permitidos
- [ ] Variáveis sensíveis fora do código
- [ ] Logs básicos de ações críticas

---

## 13. Deploy

- [ ] Banco em produção
- [ ] API publicada
- [ ] Front-end publicado
- [ ] Variáveis configuradas
- [ ] Login testado em produção
- [ ] Upload testado em produção
- [ ] Fluxo de documentos testado em produção
