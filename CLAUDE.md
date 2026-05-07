# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Ponto Processual — Frontend

Sistema de monitoramento de processos judiciais com alertas via WhatsApp.

---

## Stack

- Next.js 16 (App Router) + TypeScript strict
- Tailwind CSS v4 (`@import "tailwindcss"` + `@theme` no CSS) — mas **não se usa classes Tailwind no JSX**: toda estilização é via `style={{}}` com CSS vars
- Fontes via `next/font/google`: Manrope (UI) + JetBrains Mono (CNJ, timestamps)
- Sem shadcn/ui — componentes manuais com inline styles

## Comandos

```bash
npm run dev       # desenvolvimento
npm run build     # build produção
npm run lint      # eslint
npx tsc --noEmit  # typecheck (não há script dedicado no package.json)
```

## Arquitetura

### Padrão de página

Toda página wrappa `<AppLayout active="NomeDaAba">`, que renderiza a sidebar + `<main>`. O `active` é uma string literal union definida em `Sidebar.tsx` — adicionar nova rota exige atualizar esse tipo.

### Renderização

Componentes de lista são **server components por padrão**. `'use client'` só entra quando há interatividade real (`ToggleSw`, futuros filtros com state). Filtros em `/movimentacoes` são atualmente **estáticos** (sem state, não funcionais).

### Dados

Tudo vem de `src/lib/mock-data.ts`. A timeline em `/processos/[id]` usa `timelineCarlosRibeiro` hardcoded para qualquer processo — isso precisa ser conectado à API.

### Dynamic routes (Next.js 16)

`params` é uma `Promise` — deve ser awaited:
```ts
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
```

### Alias

`@/` resolve para `src/`.

## Design system

Paleta "creme + verde-floresta" — tokens em `src/app/globals.css`.

**Atenção:** `--brick` é **verde-floresta** (`#166534`), não laranja. O nome histórico não foi atualizado. Âmbar/laranja é `--signal` (`#d97706`).

Variáveis principais:
| Token | Uso |
|---|---|
| `--paper` / `--paper-2` / `--paper-3` | Fundos creme (claro → escuro) |
| `--brick` / `--brick-soft` | Verde-floresta — ação primária, novidades, NOVA |
| `--signal` / `--signal-soft` | Âmbar — alertas secundários |
| `--quiet` / `--quiet-soft` | Verde sage — OK, WhatsApp ativo |
| `--alert` / `--alert-soft` | Tinto — erros |
| `--ink` → `--ink-4` | Escala de texto (escuro → fantasma) |
| `--line` / `--line-soft` | Bordas |
| `--ui` | Manrope |
| `--mono` | JetBrains Mono (CNJ, timestamps, números §) |

**Regra de estilo editorial:** zero `border-radius` nos elementos do sistema — bordas sempre retas.

## Próximos passos

- [ ] Conectar `/api/movimentacoes` e `/api/processos` ao backend (substituir mock-data)
- [ ] Nunca chamar a API do backend diretamente do client — usar route handlers `/api/*`
- [ ] Autenticação JWT + middleware de proteção de rotas
- [ ] Filtros interativos (client component com state)
- [ ] Telas: `/credenciais`, `/configuracoes/whatsapp`
- [ ] Onboarding (primeira vez sem processos)
- [ ] Responsivo mobile
