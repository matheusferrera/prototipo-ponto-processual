# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Subagentes** (`.claude/agents/`) — delegue via Task, sem colar prompt:
> - `ui-page` — rotas, páginas, componentes e design system (App Router + shadcn base-nova + tokens).
> - `api-bridge` — `api.server.ts`, route handlers `/api/*`, auth por cookie JWT e middleware.

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
npm run dev        # desenvolvimento
npm run build      # build produção
npm run lint       # eslint
npm run typecheck  # tsc --noEmit (roda também no hook Stop do Claude Code)
```

---

## Arquitetura

### Visão geral

```
src/app/<rota>/page.tsx          ← Server Component: busca dados, monta metadados, compõe a página
  └─ <AppLayout active="...">    ← 'use client': shell (sidebar fixa + drawer mobile)
       ├─ <PageHeader .../>      ← Server Component: barra topo com título, busca, filtros, ordenação
       ├─ <PageContent           ← Server Component: conteúdo principal da rota
             data={...}          ←   recebe os dados buscados no page
             pageInfo={          ←   recebe <PageInfo> já instanciado como ReactNode
               <PageInfo pageInfoContent={...} />
             }
         />
       └─ (detail pages: sem PageHeader, conteúdo inline no page.tsx)
```

### `page.tsx` — orquestrador

O `page.tsx` é o único lugar onde dados são buscados (via `src/lib/api.server.ts`, que chama o backend com o JWT do cookie). Ele:

1. Define `metadata` / `generateMetadata` (SEO, OpenGraph)
2. Declara constantes de configuração de UI (listas de filtros, ordenação, `pageInfoContent`)
3. Instancia `<PageInfo pageInfoContent={...} />` e o passa como `pageInfo` prop para `<PageContent>`
4. Compõe o JSX final: `<AppLayout> → <PageHeader> → <PageContent>`

Nada de lógica de negócio ou state no `page.tsx` — só composição.

### `<AppLayout active="...">` — shell da aplicação

`'use client'` — gerencia o `useState` do drawer mobile.

- Renderiza `<Sidebar active={active} />` fixa no desktop
- Renderiza `<Sheet>` (shadcn) com `<Sidebar>` dentro para mobile (drawer lateral)
- Renderiza o header mobile (só aparece em `≤768px`) com botão hambúrguer + `mobileTitle`/`mobileBreadcrumb` (substituem a marca "Ponto") + `mobileActions`
- Envolve `children` em `<main>`

**Header unificado no mobile:** no mobile o `PageHeader` inteiro fica `display:none` e os controles migram para a barra do menu. As páginas passam `mobileTitle`/`mobileBreadcrumb` (nome no lugar da marca) e `mobileActions={<HeaderControls … variant="mobile" />}` (busca/filtro/ordenação à direita, abas em linha própria abaixo). No desktop vale o `PageHeader` normal e a barra do menu some. A barra do menu tem `data-mobile-header`; o form de busca aberto marca `data-search-open`, e um `:has()` esconde o título/abas para a busca ocupar a barra.

O prop `active` é uma string literal union definida em `Sidebar.tsx`:
```ts
'Dashboard' | 'Processos' | 'Movimentações' | 'Prazos' | 'WhatsApp' | 'E-mail' | 'Credenciais' | 'Configurações' | 'Design System'
```
Adicionar nova rota exige atualizar esse tipo e o array de navegação em `Sidebar.tsx`.

### `<PageHeader>` — barra de topo

Server Component. Filtros/busca/ordenação/abas são **funcionais via URL search params** (sem state de cliente): cada opção é um `<Link>` que altera um param, e o header marca o ativo lendo `currentParams`. O helper `buildQuery` (`src/lib/utils.ts`) monta os hrefs preservando os demais params e resetando `page`.

Os controles em si (busca/filtro/ordenação/abas) vivem em `HeaderControls` (mesma pasta) — reutilizado em dois lugares: dentro do `PageHeader` no desktop (`variant="desktop"`, fragmento na linha do título) e na barra do menu do `AppLayout` no mobile (`variant="mobile"`, via prop `mobileActions`). O `PageHeader` recebe os mesmos props que `HeaderControls`; as páginas definem um objeto `headerControls` e o espalham (`{...headerControls}`) nos dois. O `SearchControl` usa `useId` (evita id duplicado entre as duas instâncias).

| Prop | Descrição |
|---|---|
| `basePath` | Caminho base para montar os hrefs (ex.: `"/processos"`) |
| `currentParams` | `Record<string, string \| undefined>` — params atuais da URL (marca ativo + preserva no form de busca) |
| `title` | Título da página |
| `breadcrumb` | Caminho de navegação (opcional) |
| `tabs` | `{ param, options: { label, value }[] }` — segmented control na linha do título (ex.: view Lista/Kanban/Calendário em Prazos) |
| `searchLabel` / `searchPlaceholder` | Campo de busca — `<form method="get">` que envia `q` + hidden inputs com os params atuais |
| `searchValue` | Valor inicial da busca (vem de `?q=`) |
| `filters` | Array de `{ label, param, options: { label, value }[] }` — dropdown `<details>`; 1ª opção (value `""`) = default/TODOS |
| `sortParam` / `sortOptions` | Param (default `"sort"`) e opções `{ label, value }[]` de ordenação |
| `loading` | Adiciona classe de indicador visual |
| `whatsBadge` | Badge de status WhatsApp |
| `syncButtonLabel` | Botão de sincronização |

Filtragem/ordenação real acontece no servidor em `api.server.ts` (`getProcessos`/`getMovimentacoes`/`getPrazos` recebem um objeto de filtros): como o backend filtra pouco, busca-se um conjunto amplo (`limit=100`) e filtra-se/ordena-se no servidor, colapsando em 1 página quando há filtro/busca ativos.

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
| `PageHeader` | Server | Filtros/busca/abas via URL params (Links), sem state de cliente |
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

## Dados e autenticação

- **Server Components** buscam dados via `src/lib/api.server.ts` (`getProcessos`/`getMovimentacoes`/`getPrazos` + `backendGet*`): lê o JWT do cookie `access_token`, chama o backend (`BACKEND_URL`, default `http://localhost:3000`) com `Authorization: Bearer`, e faz `redirect('/login')` em 401. Os tipos `Backend*` desse arquivo espelham os contratos da API — mudança de contrato no back exige atualizar lá.
- **Client-side** nunca chama o backend direto — usa os route handlers `/api/*` (`src/app/api/auth/{login,register,logout}`, `/api/processes`), que fazem proxy repassando o cookie.
- **Proteção de rotas**: `src/middleware.ts` — sem `access_token`, tudo exceto `/login` e `/cadastro` redireciona para `/login?next=...`; logado, as rotas públicas redirecionam para `/`.
- `mock-data.ts` não existe mais; nenhum componente deve importá-lo.

---

## Próximos passos

- [x] Conectar `/api/movimentacoes` e `/api/processos` ao backend (mock-data removido)
- [x] Autenticação JWT + middleware de proteção de rotas (`src/middleware.ts`)
- [x] Filtros/busca/ordenação interativos via URL search params (feito em `PageHeader` + `api.server`)
- [ ] Telas: `/credenciais`, `/configuracoes/whatsapp`
- [ ] Onboarding (primeira vez sem processos)
- [ ] Responsivo mobile
- [ ] Extrair `TimelineItem` de `/processos/[id]/page.tsx` para componente próprio
