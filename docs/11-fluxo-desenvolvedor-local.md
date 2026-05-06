# Fluxo local do desenvolvedor — Valentim

Este documento explica como rodar, testar e publicar alterações no Valentim sem se perder entre local, Vercel, Render e Neon.

## 1. Estrutura principal

```txt
valentim/
├── vercel.json
├── docs/
└── valentim-mvp/
    ├── apps/
    │   ├── api/   # API Fastify + Prisma
    │   └── web/   # Frontend React + Vite
    ├── package.json
    └── pnpm-workspace.yaml
```

A pasta principal de trabalho é:

```txt
valentim-mvp
```

## 2. Ambientes em produção

```txt
Vercel → frontend web
Render → API Fastify
Neon   → PostgreSQL
```

A Vercel publica apenas:

```txt
valentim-mvp/apps/web
```

O Render publica apenas:

```txt
valentim-mvp/apps/api
```

## 3. Entrar na pasta correta

No Windows PowerShell:

```powershell
cd D:\Valentim\valentim\valentim-mvp
```

## 4. Instalar dependências

```powershell
pnpm install
```

## 5. Variáveis de ambiente locais

Existem dois arquivos importantes:

```txt
valentim-mvp/.env
valentim-mvp/apps/api/.env
```

Ambos devem conter, no mínimo:

```env
DATABASE_URL="URL Neon com pooling"
DIRECT_URL="URL Neon sem pooling"
JWT_SECRET="chave secreta"
WHATSAPP_PROVIDER="mock"
AI_PROVIDER="mock"
REDIS_URL="redis://localhost:6379"
```

Não versionar senhas reais no GitHub.

## 6. Gerar Prisma Client

```powershell
pnpm prisma:generate
```

## 7. Rodar migrations

Para aplicar migrations no banco configurado no `.env`:

```powershell
pnpm prisma:migrate -- --name nome-da-migration
```

Exemplo usado no Neon:

```powershell
pnpm prisma:migrate -- --name init-neon
```

## 8. Rodar seed

```powershell
pnpm prisma:seed
```

O seed cria dados iniciais, incluindo usuário demo quando configurado no projeto.

## 9. Rodar API local

Em um terminal:

```powershell
cd D:\Valentim\valentim\valentim-mvp
pnpm dev:api
```

A API local fica em:

```txt
http://localhost:3333
```

Health check:

```txt
http://localhost:3333/health
```

## 10. Rodar frontend local

Em outro terminal:

```powershell
cd D:\Valentim\valentim\valentim-mvp
pnpm dev:web
```

O frontend local fica em:

```txt
http://localhost:5173
```

## 11. Testar antes de subir

Comando principal:

```powershell
pnpm verify
```

Ele roda:

```txt
pnpm check
pnpm security:audit
```

Detalhe dos scripts:

```txt
check:web          testa o frontend
check:api          gera Prisma Client e testa a API
check              testa API + frontend
security:audit     audita dependências de produção
security:audit:all audita produção + desenvolvimento
verify             check + auditoria de produção
```

## 12. Fluxo de commit seguro

Na raiz do repositório:

```powershell
cd D:\Valentim\valentim
git status
```

Adicionar somente os arquivos corretos:

```powershell
git add caminho/do/arquivo
```

Commit:

```powershell
git commit -m "mensagem clara"
```

Push:

```powershell
git push origin main
```

## 13. Cuidados

Não subir arquivos soltos como:

```txt
valentim-mvp.zip
.env
senhas
URLs completas com senha
```

Antes de commitar, sempre conferir:

```powershell
git status
```

## 14. Produção atual

Frontend:

```txt
Vercel
```

API:

```txt
Render
```

Banco:

```txt
Neon
```

Variável da Vercel que aponta para a API:

```txt
VITE_API_URL=https://valentim-api.onrender.com/api
```

## 15. Login demo

```txt
Email: admin@valentim.local
Senha: Admin@123
```

## 16. Comando de confiança

Antes de subir mudança importante:

```powershell
pnpm verify
```

Se passar, o projeto está em bom estado para commit e push.
