# Deploy na Vercel

Este projeto usa a pasta `valentim-mvp/` como fonte oficial do código.

## Configuração aplicada no repositório

Foi criado um `vercel.json` na raiz do repositório para permitir deploy mesmo quando o projeto da Vercel estiver apontando para a raiz.

A configuração faz:

```txt
installCommand: cd valentim-mvp && pnpm install
buildCommand: cd valentim-mvp && pnpm --filter web build
outputDirectory: valentim-mvp/apps/web/dist
```

## Frontend

O frontend React/Vite fica em:

```txt
valentim-mvp/apps/web
```

O build de produção gera:

```txt
valentim-mvp/apps/web/dist
```

## API em produção

Localmente, o frontend usa `/api` e o Vite redireciona para a API local.

Em produção, se a API estiver em outro host, configure a variável de ambiente no painel da Vercel:

```txt
VITE_API_URL
```

O valor deve apontar para a URL pública da API.

## Checklist no painel da Vercel

Se usar o `vercel.json` da raiz:

```txt
Root Directory: raiz do repositório
Framework Preset: Vite
Build Command: será lido do vercel.json
Output Directory: será lido do vercel.json
Install Command: será lido do vercel.json
```

Alternativa manual:

```txt
Root Directory: valentim-mvp/apps/web
Build Command: pnpm build
Output Directory: dist
```
