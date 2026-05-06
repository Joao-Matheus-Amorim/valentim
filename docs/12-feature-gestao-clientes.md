# Feature — Gestão de Clientes

Esta feature transforma a aba **Clientes** em uma tela funcional e demonstrável para escritórios contábeis.

## Objetivo

Permitir que o escritório consiga gerenciar clientes de forma simples, visual e operacional.

A gestão de clientes é a base do fluxo do Valentim:

```txt
Cliente → Empresa → Documentos → Tarefas → Cobranças → Prazos
```

## Por que começar por Clientes

A tela de clientes é uma feature de alto valor para o MVP porque:

```txt
1. Tem valor visual para demonstração
2. Usa backend que já existe
3. Tem baixo risco técnico
4. É base para empresas, documentos, tarefas e financeiro
5. Ajuda o sistema a parecer produto real, não apenas protótipo
```

## Escopo inicial

A aba Clientes deve permitir:

```txt
1. Listar clientes reais da API
2. Criar novo cliente
3. Editar cliente
4. Excluir cliente com confirmação
5. Ver empresas vinculadas ao cliente
6. Exibir cards de resumo
7. Mostrar estados de loading, erro e lista vazia
```

## Backend já disponível

Rotas existentes:

```txt
GET    /api/clients
GET    /api/clients/:id
POST   /api/clients
PUT    /api/clients/:id
DELETE /api/clients/:id
```

## Resultado visual desejado

A tela deve ter:

```txt
Clientes
├── Cabeçalho da página
├── Cards de resumo
│   ├── Total de clientes
│   ├── Clientes com empresas
│   ├── Clientes sem empresa
│   └── Último cliente cadastrado
│
├── Formulário de cliente
│   ├── Nome
│   └── Telefone
│
├── Lista/tabela de clientes
│   ├── Nome
│   ├── Telefone
│   ├── Quantidade de empresas
│   └── Ações
│
└── Detalhes simples
    ├── Dados do cliente
    ├── Empresas vinculadas
    └── Próximos passos operacionais
```

## Plano de execução

```txt
10.5.1 — Auditar tela atual de Clientes
10.5.2 — Auditar services/types do frontend para clientes
10.5.3 — Criar ou ajustar service clients.ts
10.5.4 — Melhorar ClientsPage com listagem real
10.5.5 — Adicionar formulário de novo cliente
10.5.6 — Adicionar edição simples
10.5.7 — Adicionar delete com confirmação
10.5.8 — Testar local com pnpm verify
10.5.9 — Push e validar produção
```

## Critérios de aceite

A feature só será considerada pronta quando:

```txt
1. pnpm verify passar localmente
2. Vercel ficar Ready
3. Login em produção continuar funcionando
4. Aba Clientes abrir em produção
5. Criar cliente funcionar
6. Editar cliente funcionar
7. Excluir cliente funcionar
8. Lista atualizar sem recarregar manualmente a página
```

## Fora do escopo inicial

Não será feito nesta primeira versão:

```txt
1. Cadastro completo de empresa
2. Importação em massa
3. Busca avançada
4. Paginação
5. Histórico detalhado
6. Integração WhatsApp real
```

Esses itens podem virar próximas features.

## Comando de validação

Antes de subir a feature:

```powershell
cd D:\Valentim\valentim\valentim-mvp
pnpm verify
```
