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

**As opções do filtro por tribunal são a carteira, não o catálogo.** `/processos`, `/movimentacoes` e `/prazos` montam a lista com `getTribunaisDaCarteira()` (`GET /processes/tribunais`), que devolve só os tribunais em que a conta tem processo, agrupados pelo código-base (`TJDFTG1` + `TJDFTG2` → `TJDFT`, que é o valor mandado em `?tribunal=`). Antes usavam `GET /tribunals`, o catálogo do que a plataforma sabe varrer — errado nos dois sentidos: oferecia dez caixas para uma carteira de dois tribunais e escondia TJSP, TJGO, TRT10, TST e afins, que chegam pelas fontes públicas e não estão no enum do backend. Carteira vazia (ou backend fora do ar) esconde a seção inteira, em vez de mostrar uma legenda sem nada embaixo.

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
| `/status` | `status/PageContent` (`StatusPageContent`) | Tabela de saúde por tribunal, `'use client'` (polling 30s) |
| `/credenciais` | `credenciais/PageContent` (`CredenciaisPageContent`) | Painel de cobertura por sistema + cards de credencial; `'use client'`. Fluxo de criação/edição vive em `credenciais/CredentialSheet` (wizard de 3 passos: sistema → tribunais → acesso/MFA). Catálogo de sistemas/tribunais em `src/lib/credenciais.ts` (`agruparPorSistema`, reaproveitando `agruparPorTribunal` de `/status`) |

`PageContent` recebe:
- Os dados tipados da rota (`processos: Processo[]`, `movimentacoes: {...}[]`, etc.)
- `pageInfo?: ReactNode` — renderiza no início do scroll area antes da lista

### Painel vazio (`/painel`) — três causas, três telas

Carteira vazia não é um estado só, e tratá-la como um era o que fazia o painel pedir **a senha de um tribunal** para quem só precisava dizer a própria OAB:

| Condição | Tela | Pedido |
|---|---|---|
| `!usuario.oab` | `PainelSemOab` | a OAB, ali mesmo (`CadastrarOab`) |
| tem OAB, nenhum secret com `lastSuccessAt` | `PainelSincronizando` | nada — está varrendo |
| tem OAB, já varreu, zero processos | `PainelSemResultado` | conferir a OAB, ou conectar tribunal |

`CadastrarOab` (`components/dashboard/CadastrarOab/`) posta em `/api/scraper/monitorar-oab` — que grava a OAB e enfileira DJEN + consulta pública — e chama `router.refresh()`. Não manda para o `/onboarding` de propósito: aquela tela trata a OAB como resposta já dada e, sem OAB na URL, vai direto pedir o login do tribunal. O login do tribunal fica como saída secundária nas três telas, nunca como pedido principal.

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
| `Sidebar` | Client | rodapé lê o usuário logado via `useUsuarioAtual` |

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

## Rotas de topo

| URL | O que é | Quem entra |
|---|---|---|
| `/` | Landing pública (componentes em `src/app/home/`) | anônimo; **logado é redirecionado a `/painel`** pelo middleware |
| `/painel` | Dashboard do usuário | autenticado |
| `/home` | 308 para `/` | só existe para não quebrar link já compartilhado |
| `/oab/<n>-<uf>` | Resultado da busca pública — **a única rota que resolve uma OAB** | todos, logados inclusive (o link é compartilhável; os CTAs mudam de destino com a sessão) |

A landing assumiu a raiz em 21/08/2026 — antes ela morava em `/home` e `/` era o painel. `ROTA_PAINEL` e `ROTA_LANDING` (`src/lib/rotas.ts`) existem porque "para onde vai quem acabou de entrar" é decidido em cinco lugares: middleware, login por senha, volta do Google, onboarding e o menu.

**A marca leva sempre para `/`** — no menu (fixo e drawer), no header mobile, na landing (topo e rodapé) e nas telas de login/cadastro. Como o middleware devolve quem tem sessão para `/painel`, o mesmo clique serve aos dois estados: visitante vê a landing, usuário volta ao painel.

## A OAB tem uma rota só: `/oab/<n>-<uf>`

Existiam três lugares que perguntavam OAB antes de a conta existir — o hero da landing, o formulário do /cadastro e o onboarding — e cada um resolvia a sua. Era o que fazia a mesma pergunta aparecer duas vezes para quem veio da busca e nenhuma vez para quem entrou pelo Google. Agora **nenhum formulário resolve OAB: todos navegam para `/oab/<numero>-<uf>`**, que consulta o DJEN e mostra os processos. A OAB só entra no cadastro pela URL, vinda de lá.

```
busca da home ─┐
busca do /cadastro ─┼─→ /oab/<n>-<uf> ─┬─ anônimo → /cadastro?oab&uf → conta ─┐
busca do /onboarding ─┘                └─ logado  → monitorar-oab ────────────┴─→ /painel
                                                                                 (PainelSincronizando)

/cadastro sem OAB → conta (Google ou senha) → /onboarding pergunta → /oab
                                            └─ "pular" → /painel → PainelSemOab
```

Decisões que sustentam isso:

- **Criar conta nunca exige OAB.** O botão do Google no /cadastro saiu do porteiro `exigirOab`: barrar o cadastro mais rápido do produto por um dado que a conta recebe depois custava mais do que o onboarding vazio que a regra evitava. Quem chega sem OAB é perguntado uma vez no onboarding e, se pular, encontra o pedido no painel (`PainelSemOab`), que já existia.
- **`/oab` sabe de que lado da porta está quem chegou** (`ctaDaOab`, lendo o cookie `access_token` como o middleware). Sem sessão o CTA é um link para `/cadastro?oab&uf`. **Com sessão ele deixa de ser link e vira botão** (`MonitorarOab`): grava a OAB (`POST /scraper/monitorar-oab`) e vai ao painel, que abre em `PainelSincronizando` — a tela que revela os processos conforme o job os traz. A microcópia muda junto ("a OAB já vai preenchida" não serve para quem já tem conta).
- **Ninguém passa pelo `/onboarding` só para a OAB ser gravada.** Quem grava é quem abre a sessão: `CadastroForm` depois do `/api/auth/register`, e o callback do Google com o token recém-emitido (`monitorarOab`, antes do redirect — é a única passagem pelo servidor que ele tem). Depois disso o destino é `/painel`: os processos já foram vistos em `/oab`, e mostrá-los de novo no onboarding era cobrar um clique a mais para chegar ao mesmo lugar. Falha ao gravar não custa a sessão — o painel recebe a conta com `PainelSemOab`.
- **`/onboarding?oab=` continua funcionando** (busca, `ScannerTribunais` e a lista por tribunal), mas nada mais aponta para lá; é caminho de link antigo, não do funil.
- **O painel continua gravando a OAB ali mesmo** (`CadastrarOab` → `POST /scraper/monitorar-oab`). A regra da rota única vale para *antes* da conta existir; depois dela, tirar a pessoa do painel para uma página de vendas seria o desvio, não o caminho.

## Dados e autenticação

- **Server Components** buscam dados via `src/lib/api.server.ts` (`getProcessos`/`getMovimentacoes`/`getPrazos` + `backendGet*`): lê o JWT do cookie `access_token`, chama o backend (`BACKEND_URL`, default `http://localhost:3000`) com `Authorization: Bearer`, e faz `redirect('/login')` em 401. Os tipos `Backend*` desse arquivo espelham os contratos da API — mudança de contrato no back exige atualizar lá.
- **Client-side** nunca chama o backend direto — usa os route handlers `/api/*` (`src/app/api/auth/{login,register,logout,google}`, `/api/processes`), que fazem proxy repassando o cookie.
- **Quem está logado** vem de `GET /users/me` (nome, e-mail, avatar do Google e a OAB). O JWT carrega só id/e-mail/papel, então o nome tem que ser perguntado. Dois caminhos, de propósito: `getUsuarioAtual()` (`api.server.ts`) para Server Components — é o que o painel usa para decidir o estado vazio — e `useUsuarioAtual()` (`components/layout/useUsuarioAtual.ts`) para o rodapé do menu, que vive dentro do `AppLayout` (client). O hook cacheia a promessa **no módulo**: o `AppLayout` remonta a cada navegação e o `Sidebar` aparece duas vezes por tela (fixo + drawer), então sem isso o nome piscaria e seriam 3–4 idas a `/api/me` por clique. `LogoutButton` chama `esquecerUsuarioAtual()` — senão o próximo login herda o nome do anterior.
- **Cookies de sessão** saem de um lugar só: `gravarSessao` (`src/lib/auth-cookies.ts`), usado pelas três rotas que abrem sessão (login, register e o callback do Google). `sameSite: 'lax'` é obrigatório — em `strict` o cookie não sobreviveria à volta do domínio do Google.
- **Proteção de rotas**: `src/middleware.ts` — sem `access_token`, tudo exceto `/login` e `/cadastro` redireciona para `/login?next=...`; logado, as rotas públicas redirecionam para `/`.
- `mock-data.ts` não existe mais; nenhum componente deve importá-lo.

### Login e cadastro com o Google

Authorization Code + PKCE, orquestrado por dois route handlers. **O front é o cliente OAuth** (dele são o `redirect_uri` e o `GOOGLE_CLIENT_SECRET`); **o backend é a autoridade de identidade** — recebe o `id_token`, verifica assinatura/`iss`/`aud`/validade contra o JWKS do Google e devolve a mesma sessão do login por senha (`POST /auth/google`).

```
[/login | /cadastro]  →  GET /api/auth/google/start
                          ├─ sorteia state + code_verifier (PKCE S256)
                          ├─ grava os dois no cookie httpOnly `g_oauth` (10 min, path /api/auth/google)
                          └─ 307 → accounts.google.com
                                    ↓
                         GET /api/auth/google/callback?code&state
                          ├─ confere o state (timing-safe) contra o cookie
                          ├─ troca o code por id_token (client secret + verifier)
                          ├─ POST {BACKEND}/auth/google → { accessToken, refreshToken, criado }
                          ├─ gravarSessao() + apaga o `g_oauth`
                          └─ 307 → /onboarding?oab=… | /onboarding | next | /
```

| Arquivo | Papel |
|---|---|
| `src/lib/google-oauth.server.ts` | config, `googleAtivo()`, `redirectUri()`, PKCE, `urlDeAutorizacao`, troca do code |
| `src/app/api/auth/google/start/route.ts` | passo 1 — cookie de estado + redirect ao Google |
| `src/app/api/auth/google/callback/route.ts` | passo 2 — valida, troca, abre sessão, decide o destino |
| `src/components/auth/GoogleButton.tsx` | âncora (não `<button>`: o destino é navegação real) com estado "Abrindo o Google…" |
| `src/components/auth/google-erros.ts` | `?erro=<código>` → frase, compartilhado por /login e /cadastro |

Decisões que não se leem no código:

- **Sem client id/secret o botão não aparece.** `googleAtivo()` roda no Server Component (`/login/page.tsx`, `/cadastro/page.tsx`) e o botão só é renderizado se der `true` — botão que existe e falha no clique é pior que botão ausente. Por isso `/login` deixou de ser `'use client'` e virou página + `LoginForm`, como o /cadastro.
- **O botão do Google nunca exige OAB.** Até 21/08/2026 o /cadastro travava a saída (`exigirOab`) porque o Google responde nome e e-mail, mas não a OAB. Hoje a OAB tem rota própria e o onboarding pergunta quando ela falta — ver [A OAB tem uma rota só](#a-oab-tem-uma-rota-só-oabn-uf). O botão leva a OAB junto **quando ela já veio** de `/oab`.
- **A OAB viaja no cookie de estado**, não na URL, e volta no destino (`/onboarding?oab=…&uf=…`) — inclusive quando o fluxo falha, para o formulário não ser reencontrado vazio.
- **Destino depois de entrar**: com OAB → o callback grava a OAB na conta e manda ao `/painel`; sem OAB e `criado: true` → `/onboarding`, que abre perguntando a OAB; senão → o `?next=`, saneado por `destinoSeguro` (`src/lib/utils.ts`), que barra `//evil.com`.
- **Conta que só tem Google** tentando entrar por senha: o backend devolve `code: 'GOOGLE_ACCOUNT'` (401 no login, 409 no register) e a tela mostra o botão do Google em vez de "credenciais inválidas".
- **Entrar pelo Google nunca cria a segunda conta de alguém.** Quem decide isso é o backend (`entrarOuCriarComGoogle`): `googleId` → e-mail verificado, **sem depender da caixa das letras** → só então cria. Por isso as duas portas (`/login` e `/cadastro`) podem oferecer o mesmo botão sem risco: `criado` só volta `true` quando a pessoa realmente não existia.
- **Variáveis**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e o opcional `GOOGLE_REDIRECT_URI` — documentadas no `.env`. O redirect URI tem de estar registrado no Google Cloud Console **caractere a caractere**, porta do `next dev` inclusive.

---

## Próximos passos

- [x] Conectar `/api/movimentacoes` e `/api/processos` ao backend (mock-data removido)
- [x] Autenticação JWT + middleware de proteção de rotas (`src/middleware.ts`)
- [x] Filtros/busca/ordenação interativos via URL search params (feito em `PageHeader` + `api.server`)
- [x] Tela `/credenciais` — cobertura por sistema (PJe/CPE/Projudi) + CRUD de `ScraperSecret` via `/api/secrets/*`, upload de QR do MFA
- [x] Login e cadastro com o Google (OAuth Authorization Code + PKCE)
- [ ] Tela `/configuracoes/whatsapp`
- [ ] Onboarding (primeira vez sem processos)
- [ ] Responsivo mobile
- [ ] Extrair `TimelineItem` de `/processos/[id]/page.tsx` para componente próprio
