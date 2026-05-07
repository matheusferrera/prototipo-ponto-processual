# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Ponto Processual — Frontend

Sistema de monitoramento de processos judiciais com alertas via WhatsApp.

---

## Stack

- Next.js 16 (App Router) + TypeScript strict
- Tailwind CSS v4 (`@import "tailwindcss"` + `@theme` no CSS)
- **shadcn/ui v4** (estilo `base-nova`, usando `@base-ui/react` em vez de Radix UI) — componentes instalados: `button`, `badge`, `switch`, `tabs`, `alert`, `card`, `table`, `sheet`, `scroll-area`, `separator`
- Fontes via `next/font/google`: Manrope (UI) + JetBrains Mono (CNJ, timestamps)

### Regras de estilização
- Componentes shadcn: usar `className` para aplicar tokens do projeto (`var(--brick)`, etc.) — **não usar classes Tailwind arbitrárias com valores raw**
- CSS Modules (`*.module.css`) para estilos de layout e de página
- `buttonVariants` da shadcn para aplicar estilos de botão em Links (`<a>`)
- Base UI **não** suporta `asChild` — usar `render` prop ou `buttonVariants` direto no elemento

## Comandos

```bash
npm run dev       # desenvolvimento
npm run build     # build produção
npm run lint      # eslint
npx tsc --noEmit  # typecheck (não há script dedicado no package.json)
```

---

## Arquitetura

### Visão geral

```
src/app/<rota>/page.tsx          ← Server Component: busca dados, monta metadados, compõe a página
  └─ <AppLayout active="...">    ← 'use client': shell (sidebar fixa + drawer mobile)
       ├─ <PageHeader .../>      ← Server Component: barra topo com título, busca, filtros, ordenação       ← Server Component: faixa animada de alertas
       ├─ <PageContent           ← Server Component: conteúdo principal da rota
             data={...}          ←   recebe os dados buscados no page
             pageInfo={          ←   recebe <PageInfo> já instanciado como ReactNode
               <PageInfo pageInfoContent={...} />
             }
         />
       └─ (detail pages: sem PageHeader, conteúdo inline no page.tsx)
```

### `page.tsx` — orquestrador

O `page.tsx` é o único lugar onde dados são buscados (hoje via `src/lib/mock-data.ts`, futuramente via route handlers `/api/*`). Ele:

1. Define `metadata` / `generateMetadata` (SEO, OpenGraph)
2. Declara constantes de configuração de UI (listas de filtros, ordenação, `pageInfoContent`)
3. Instancia `<PageInfo pageInfoContent={...} />` e o passa como `pageInfo` prop para `<PageContent>`
4. Compõe o JSX final: `<AppLayout> → <PageHeader> → <PageContent>`

Nada de lógica de negócio ou state no `page.tsx` — só composição.

### `<AppLayout active="...">` — shell da aplicação

`'use client'` — gerencia o `useState` do drawer mobile.

- Renderiza `<Sidebar active={active} />` fixa no desktop
- Renderiza `<Sheet>` (shadcn) com `<Sidebar>` dentro para mobile (drawer lateral)
- Renderiza o header mobile com botão hambúrguer e marca "Ponto"
- Envolve `children` em `<main>`

O prop `active` é uma string literal union definida em `Sidebar.tsx`:
```ts
'Dashboard' | 'Processos' | 'Movimentações' | 'Prazos' | 'WhatsApp' | 'E-mail' | 'Credenciais' | 'Configurações' | 'Design System'
```
Adicionar nova rota exige atualizar esse tipo e o array de navegação em `Sidebar.tsx`.

### `<PageHeader>` — barra de topo

Server Component. Recebe props declarativas (não callbacks — filtros ainda não têm state):

| Prop | Descrição |
|---|---|
| `title` | Título da página |
| `breadcrumb` | Caminho de navegação (opcional) |
| `searchLabel` / `searchPlaceholder` | Campo de busca (sem state, estático) |
| `filters` | Array de `{ label, options[] }` — renderiza `<details>` dropdown |
| `sortOptions` | Array de strings — renderiza `<details>` dropdown |
| `loading` | Adiciona classe `page-header--loading` (indicador visual) |
| `whatsBadge` | Badge de status WhatsApp |
| `syncButtonLabel` | Botão de sincronização |

### `<Ticker>` — faixa de alertas

Server Component. Busca `tickerItems` direto de `mock-data` internamente — não recebe props de dados. Duplica o array para criar loop contínuo via CSS animation.

### `<PageInfo pageInfoContent={...}>` — painel de resumo

`'use client'` — gerencia scroll/carousel entre seções via `useState` + `useRef`.

Recebe `pageInfoContent: PageInfoContent` (array de seções), onde cada seção tem:
- `title`: string
- `variant`: `'compact' | 'bars' | 'status'` — define o layout visual dos itens
- `items`: `{ label, value, tone?, percent? }[]`

É instanciado no `page.tsx` e passado como `pageInfo?: ReactNode` para `<PageContent>`, que o renderiza no topo do scroll area. Esse padrão mantém `PageContent` genérico — ele não conhece a estrutura de `PageInfo`.

### `<PageContent>` — conteúdo específico da rota

Server Component. Cada rota tem seu próprio `PageContent` em `src/components/<rota>/PageContent/`:

| Rota | PageContent | Responsabilidade |
|---|---|---|
| `/processos` | `processos/PageContent` | Tabela de processos com `<ProcessoRow>` + paginação |
| `/movimentacoes` | `movimentacoes/PageContent` | Feed agrupado por data com `<MovItem>` inline |
| `/prazos` | `prazos/PrazosView` | (mesmo papel, nome diferente) |

`PageContent` recebe:
- Os dados tipados da rota (`processos: Processo[]`, `movimentacoes: {...}[]`, etc.)
- `pageInfo?: ReactNode` — renderiza no início do scroll area antes da lista

### Páginas de detalhe (`/[id]/page.tsx`)

Não seguem o padrão `PageHeader + PageContent`. O layout é montado diretamente no `page.tsx` com `inline styles` (sem CSS Module separado). Exemplo: `/processos/[id]` tem breadcrumb, hero, timeline e sidebar de detalhe, tudo no arquivo.

`TimelineItem` é um sub-componente local definido dentro do `page.tsx` — não foi extraído para `src/components/` ainda.

### Renderização e `'use client'`

| Componente | Modo | Motivo |
|---|---|---|
| `page.tsx` | Server | Busca de dados, metadata |
| `AppLayout` | Client | `useState` do drawer mobile |
| `PageHeader` | Server | Sem estado — filtros são estáticos |
| `Ticker` | Server | Sem estado |
| `PageInfo` | Client | `useState` + `useRef` do carousel |
| `PageContent` | Server | Renderização de lista pura |
| `ProcessoRow` | Server | Sem estado |
| `ToggleSw` | Client | `Switch` interativo do shadcn |

### Dynamic routes (Next.js 16)

`params` é uma `Promise` — deve ser awaited:
```ts
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
```

### Alias

`@/` resolve para `src/`.

---

## Design system

Paleta "creme + verde-floresta" — tokens em `src/app/globals.css`.

**Atenção:** `--brick` é **verde-floresta** (`#166534`), não laranja. O nome histórico não foi atualizado. Âmbar/laranja é `--signal` (`#d97706`).

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

---

## Dados

Tudo vem de `src/lib/mock-data.ts`. A timeline em `/processos/[id]` usa `timelineCarlosRibeiro` hardcoded para qualquer processo — precisa ser conectado à API.

**Regra:** nunca chamar a API do backend diretamente do client — usar route handlers `/api/*`.

---

## Próximos passos

- [ ] Conectar `/api/movimentacoes` e `/api/processos` ao backend (substituir mock-data)
- [ ] Autenticação JWT + middleware de proteção de rotas
- [ ] Filtros interativos (transformar `PageHeader` ou criar wrapper client com state)
- [ ] Telas: `/credenciais`, `/configuracoes/whatsapp`
- [ ] Onboarding (primeira vez sem processos)
- [ ] Responsivo mobile
- [ ] Extrair `TimelineItem` de `/processos/[id]/page.tsx` para componente próprio
