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

**`/resumo` é a exceção: as opções são o DIA, não a carteira.** Um resumo cobre um dia; oferecer os oito tribunais da carteira num dia que trouxe dois é a mesma falha, um nível abaixo. `tribunaisDoDia` (`src/lib/resumo.ts`) conta os atos por tribunal no próprio payload — vira a lista de opções e a legenda de cada caixa ("TJDFT · 4 atos"). O filtro por seção só oferece as seções que aquele dia teve. Dia sem resumo não renderiza controle nenhum: sem nada para filtrar, o painel abriria com a legenda e nada embaixo.

### `<PageInfo pageInfoContent={...}>` — painel de resumo

`'use client'` — gerencia scroll/carousel entre seções via `useState` + `useRef`.

Recebe `pageInfoContent: PageInfoContent` (array de seções), onde cada seção tem:
- `title`: string
- `variant`: `'compact' | 'bars' | 'summary'` — define o layout visual dos itens
  - `compact` — grade de 3 colunas de rótulo + número grande (`items`)
  - `bars` — uma barra de progresso por item, com valor e `percent` (`items`); as linhas são automáticas, então cabem três ou quatro faixas
  - `summary` — três números à esquerda (`stats`) e uma barra empilhada com legenda (`segments`), para parte-do-todo. A variante existia no tipo e no JSX desde o começo mas **sem CSS**: nunca tinha tido consumidor até o Resumo do dia usá-la para a distribuição por tribunal
- `items`: `{ label, value, tone?, percent? }[]`

É instanciado no `page.tsx` e passado como `pageInfo?: ReactNode` para `<PageContent>`, que o renderiza no topo do scroll area. Esse padrão mantém `PageContent` genérico — ele não conhece a estrutura de `PageInfo`.

### `<PageContent>` — conteúdo específico da rota

Server Component. Cada rota tem seu próprio `PageContent` em `src/components/<rota>/PageContent/`:

| Rota | PageContent | Responsabilidade |
|---|---|---|
| `/processos` | `processos/PageContent` | Lista de casos (`ProcessList`, padrão) ou tabela configurável (`ProcessTable`), alternadas por `ProcessView` conforme a preferência salva; barra de estado (`ProcessSummaryBar`) + paginação |
| `/movimentacoes` | `movimentacoes/PageContent` | Feed agrupado por data com `<MovItem>` inline |
| `/prazos` | `prazos/PrazosView` | (mesmo papel, nome diferente) |
| `/status` | `status/PageContent` (`StatusPageContent`) | Tabela de saúde por tribunal, `'use client'` (polling 30s) |
| `/resumo`, `/resumo/[dia]` | `resumo/PageContent` | Panorama do dia + seções (`Precisa de você`, `Na agenda`, `Decidido`, `Só para saber`) + coluna de dias anteriores |
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

`CadastrarOab` (`components/dashboard/CadastrarOab/`) posta em `/api/scraper/monitorar-oab` — que grava a OAB e enfileira DJEN + consulta pública — e chama `router.refresh()`. Não manda para o `/onboarding` de propósito: sair do painel para outra tela só para digitar a OAB seria um desvio, e a pergunta é a mesma. O login do tribunal fica como saída secundária nas três telas, nunca como pedido principal — e desde 11/09/2026 `/credenciais` é o ÚNICO lugar do produto que o oferece (ver [O onboarding não pede credencial](#o-onboarding-não-pede-credencial-11092026)).

### Páginas de detalhe (`/[id]/page.tsx`)

Não seguem o padrão `PageHeader + PageContent`. O layout é montado diretamente no `page.tsx` com `inline styles` (sem CSS Module separado). Exemplo: `/processos/[id]` tem breadcrumb, hero, timeline e sidebar de detalhe, tudo no arquivo.

A timeline do processo saiu do `page.tsx` em 06/09/2026: é `components/movimentacoes/TimelineProcesso/` (`'use client'`). Ver [A timeline do processo](#a-timeline-do-processo-dia-a-dia-com-carregar-mais).

### Renderização e `'use client'`

| Componente | Modo | Motivo |
|---|---|---|
| `page.tsx` | Server | Busca de dados, metadata |
| `AppLayout` | Client | `useState` do drawer mobile |
| `PageHeader` | Server | Filtros/busca/abas via URL params (Links), sem state de cliente |
| `PageInfo` | Client | `useState` + `useRef` do carousel |
| `PageContent` | Server | Renderização de lista pura |
| `ProcessList` | Server-compatível (renderiza dentro de `ProcessView`, client) | Linha = link; sem estado |
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

### Espaçamento e empilhamento também são tokens (desde 06/09/2026)

`--space-2xs` (2px) · `--space-xs` (4) · `--space-sm` (8) · `--space-md` (12) · `--space-lg` (16) · `--space-xl` (24) · `--space-2xl` (32) · `--space-3xl` (48). Base 4pt, não 8: entre 8 e 16 falta 12 o tempo todo numa lista densa.

Existem porque **não existiam**: medido nos CSS Modules da tela de movimentações, eram 23 valores px distintos com **todos os inteiros de 1 a 10 presentes** — 2px, 3px e 4px fazendo o mesmo trabalho em seletores vizinhos. Sem um conjunto declarado, a próxima linha inventa 7px e ninguém percebe. Nome semântico, não numérico: renomear valor não pode virar renomear variável.

`--z-sticky` (10) · `--z-dropdown` (20) · `--z-scrim` (30) · `--z-panel` (40) · `--z-modal` (50) · `--z-toast` (60), na ordem em que as camadas se cobrem. Eram nove inteiros crus, e a consequência era real: `.sortPanel` tinha `30` na base e **`20` no ≥768px, com o próprio backdrop em `29`** — no desktop o painel de ordenação abria por baixo do véu que ele mesmo acende. Número solto não tem como estar errado; camada nomeada tem.

**`--ink-3` e `--ink-4` continuam fora de texto** (4,32:1 e 2,33:1, medidos nesta tela contra `--paper`). A afirmação anterior de que "as telas de movimentações já usam só `--ink-2`/`--brick`/`--alert`" estava desatualizada: `--ink-3` aparecia em 10 seletores do feed, inclusive nos três campos da linha (assunto, órgão, "autos nº") e no cabeçalho do dia. Corrigido no feed; **o resto do app ainda merece a passada.**

---

## Processos (`/processos`): lista por padrão, tabela por opção

A carteira abre como **lista de casos**, não como planilha. Cada linha responde, nesta ordem: *de quem é* (Polo ativo × Polo passivo, o mesmo título da página de detalhe), *o que mudou* (última movimentação + "há 2 d", com o selo `Nova` quando o backend marca `state: signal`) e *até quando* (chip de prazo só quando existe). Tribunal, CNJ e órgão julgador ficam à direita, menores. A linha inteira é um único `<Link>`.

- **Os números da carteira são filtros.** `ProcessSummaryBar` desenha "Todos 37 · Com novidade 1 · Com erro 0" como chips que trocam `?state=`. O backend devolve `counts.all/signal/alert` **ignorando o filtro de estado** (senão os outros chips zerariam ao clicar em um). "Com erro" só aparece quando há erro ou quando está ativo.
- **A tabela não morreu.** `viewMode: 'list' | 'table'` mora nas mesmas preferências do localStorage (`process-table-preferences.ts`); o segmentado Lista/Tabela e a engrenagem ficam na barra de resumo, e o painel lateral só mostra colunas/densidade/fonte no modo tabela. O botão "Colunas" saiu do header.
- **Ordena quem é COLUNA do processo — 14 das 19; as outras 4 não são "mais um cabeçalho".** A ordenação é do servidor (`?sort=&order=` → `orderBy` do Prisma), então ordenar no cliente ordenaria só os 20 da página. `SORT_KEY_BY_COLUMN` (`ProcessTable.tsx`) mapeia coluna → chave da API e alimenta os dois lugares que precisavam saber disso: o cabeçalho clicável e o `aria-sort` do `<th>`. Ficam de fora **Estado** e **Próximo prazo** (derivados: o estado sai de `syncStatus`+`lastMovAt`, o prazo é o mínimo dos `Deadline` abertos — Prisma só ordena por `_count` de relação), **Polo ativo/passivo** (colunas Json) e **Grau** (sufixo de `tribunal`, que ordenar por tribunal já agrupa). Os quatro exigem SQL cru na listagem — que significa reescrever em SQL a busca livre, os 15 filtros e os 3 contadores do `$transaction` — ou coluna denormalizada; só o próximo prazo paga esse preço.
- **A direção padrão de cada chave é espelho do backend** (`PROCESS_SORT_DEFAULT_ORDER` em `lib/process-filters.ts` ↔ `PROCESS_SORT` em `processes.router.ts`): texto sobe, data/valor/contagem descem. Divergir desenha uma seta que mente sobre a lista — ela decide para onde a seta aponta antes do primeiro clique e o que o clique seguinte pede.
- **O seletor mobile traz TODAS as chaves, mesmo as de coluna que o card não mostra.** No mobile não há cabeçalho para clicar: chave fora do `SORT_OPTIONS` é chave que chega pela URL e o seletor não consegue mostrar como ativa.
- **Partes em caixa alta viram Título de Caso** (`nomeLegivel`, em `lib/processo-apresentacao.ts`): conectivos ficam minúsculos, tokens de até duas letras e siglas conhecidas ficam em caixa alta. Só se aplica quando o nome veio 100% maiúsculo.
- **Tokens `--signal-ink` e `--quiet-ink`** existem porque `--signal` (2,9:1) e `--quiet` (3,7:1) reprovam como texto sobre os próprios fundos `-soft`; os chips de prazo da lista e da tabela usam os novos.
- **Proibido:** borda lateral colorida como marcador de estado (side-stripe). Novidade se mostra por selo com ícone + texto, peso do título e fundo da linha.
- **A barra é compartilhada** (`components/filters/SummaryBar.tsx`): em Processos, chips de contagem que filtram à esquerda e Lista/Tabela à direita; em Prazos (`PrazoSummaryBar`), só Pauta/Kanban/Calendário, à esquerda. O header de Prazos ficou com quatro botões alinhados num grupo só: busca, filtro, ordenação e o PDF só-ícone (`ExportPrazosPdfButton compact`, injetado via `trailing` do `PrazoFilterControls`). Mesma estrutura no celular e no desktop.

## Resumo do dia (`/resumo`)

A leitura do último dia útil do diário: um panorama em prosa e as publicações agrupadas em quatro seções por urgência. `/resumo` abre no dia mais recente **que tem resumo** (a lista do backend já vem ordenada; o primeiro item é a resposta) e `/resumo/<dia>` abre um dia específico — sem adivinhar "ontem" no front, porque o dia coberto depende do calendário forense e o palpite produziria página vazia toda segunda-feira.

- **`GET /resumos/{dia}` devolve muito mais que o panorama.** Vem `publicacoes[]` — cada expediente do DJEN que entrou na conta, com processo, classe, órgão julgador, partes, prazo, `dataLimite`, natureza, `metodoPrazo` e a leitura da IA — e o `eixo` com que o dia foi recortado. É daí que saem os números do topo; `publicacoes.length` é sempre igual a `totalPublicacoes`, porque as duas saem do mesmo recorte.
- **O painel do topo fala do DIA INTEIRO, nunca do recorte filtrado.** É o número que o advogado repete para si ("hoje foram 14, 3 com prazo") e não pode encolher porque alguém digitou algo na busca. Quem responde ao filtro é a contagem de cada seção, que passa a mostrar `03 / 11` ali onde a lista encurtou.
- **Não há ordenação.** Nas outras listas o `sort` é preferência; aqui a ordem **é** o produto — quem agrupou e priorizou foi a leitura do dia inteiro (`shared/ia/analisar-dia.ts`), e um "mais recentes primeiro" desmontaria justamente o que se pagou para montar. `dia` também não é search param: é o path, porque um resumo é a página de um dia, não uma lista filtrada por data.
- **"Vencem em 5 dias" usa a mesma regra que fecha `totalPrazos` no backend** (`dataLimite` presente **e** `ia.deQuem !== 'parteContraria'`), repetida em `correContraMim`. Regra diferente faria o recorte desmentir o total exibido ao lado dele.
- **`resumo-pagina.ts` existe por uma razão de módulo**: `resumo-filters.ts` importa os rótulos das seções de `resumo.ts`, então `resumo.ts` só pode conhecer os filtros como *tipo*. Quem precisa dos dois como valor — parse e derivação juntos — é esse terceiro arquivo, que também mantém os dois `page.tsx` da rota como composição pura, sem duplicar a conta.

## Movimentações (`/movimentacoes` e `/movimentacoes/[id]`)

A linha do tempo do acervo. Desde 03/09/2026 ela é **100% DJEN**: o DataJud parou de gravar movimentação e ficou só na capa do processo, então toda linha aqui é a publicação de um ato no diário, com o inteiro teor guardado.

### A linha é UMA, e mora em `MovimentacaoRow`

A mesma movimentação tinha **três implementações** no produto: o feed (cartão com borda, 140px), o painel (JSX com estilo inline dentro de `painel/page.tsx`, 48px) e a pauta de prazos. A do painel era a mais legível e a mais barata — e era a única sem componente. Desde 06/09/2026 feed e painel usam `components/movimentacoes/MovimentacaoRow/`, com `densidade: 'compacta' | 'confortavel'`.

A gramática é a de `ProcessList`: corpo à esquerda, calha de identificação e prazo à direita, filete embaixo, **sem caixa**. Duas telas com a mesma gramática valem mais que duas telas com o ótimo local de cada uma.

**O ato é o título; o cliente é a segunda linha.** Era o contrário — cliente em 15px/700, o que aconteceu em 13px cinza. Num feed cronológico o cliente é o endereço e o ato é a notícia; e como metade das linhas de um acervo repete "Juntada de petição", o que diferencia uma linha da outra estava justamente no tipo menor.

**O prazo é um chip à direita, e só ocupa espaço quando existe.** Era uma coluna fixa de 92px em toda linha. Medido em 06/09/2026: **3 de 20** linhas da primeira página abriam prazo, e no acervo inteiro são 222 prazos abertos para 22.713 movimentações. A justificativa da coluna vazia era ler as datas na vertical — mas a lista é ordenada por **publicação** e os vencimentos caem de 5 a 30 dias depois, então a coluna nunca esteve em ordem, e coluna de datas fora de ordem não se lê na vertical.

**O que a linha mostra abaixo do vencimento é `quando`, não `dias`.** `dias` é o TAMANHO do prazo ("15 dias"); lido embaixo de "VENCE / 24 set", dizia "faltam 15 dias". O helper já calculava `quando` ("vence em 3 dias", "venceu há 2 dias") e a tela nunca o usava. Errava **tarde**, no único campo em que errar tarde custa o prazo.

**O estado tem dois canais, não quatro.** `state: 'signal'` acendia a borda inteira em `--brick`, tingia o tipo, e ainda imprimia o selo. Com 12 de 20 linhas marcadas numa carteira recém-importada, vinte molduras verdes deixam de significar "novo" e passam a significar "lista" — é a mesma medição que já tinha corrigido a timeline do processo. Ficam o selo e o fundo da linha, que são os dois canais que este arquivo sanciona.

**Resultado medido (1920×929, mesma carteira):** 140px → **68px** por linha, 6,6 → **13** linhas por tela, 20 → **50** por página (324 → 130 páginas). No celular (396px), 133px → **93px**.

Fora da linha: o **cabeçalho do dia gruda no topo** e subiu para 12px/700 em `--ink-2` (era 11px em `--ink-3`, que mede 4,32:1 e reprova o AA). Ele é a única estrutura do feed e estava desenhado com a tipografia mais fraca da página.

**`≈` antes da data quer dizer "calculamos".** Só `metodoPrazo: textoExplicito` é o ato declarando os dias; `prazoLegal`, `padraoCpc218` e `analiseIa` são cálculo nosso sobre a regra do art. 4º da Lei 11.419, que não conhece feriado estadual, prazo em dobro nem suspensão por portaria. O feed abrevia num caractere; o detalhe escreve a ressalva por extenso. Exibir os dois com a mesma cara faria estimativa passar por vencimento oficial — o erro caro, e na direção perigosa.

**O selo `NOVA` compara duas datas, não uma.** `detectedAt` sozinho mentia: um backfill de 2 anos grava tudo agora e marcava **as vinte linhas da página** como novas, inclusive publicações de 2024. `atoRecemPublicado` (`api.server.ts`) exige detecção nas últimas 48h **e** publicação nos últimos 7 dias. Quando tudo é novo, nada é.

### O ato abre NA LISTA — e a página do ato continua de pé

`?aberta=<id>` expande a linha no lugar, com a leitura completa: prazo por extenso + fundamento + ressalva, providência, inteiro teor (fechado acima de 2.400 chars) e os documentos. Uma linha por vez.

**A linha continua sendo um `<a>`; só muda o destino.** Aponta para `?aberta=<id>` (e, quando já aberta, para o href sem o parâmetro — o mesmo clique fecha), com `scroll={false}`. Consequência: **zero JavaScript novo**, o botão voltar fecha o painel, recarregar não perde o lugar e o endereço é compartilhável. É a mesma disciplina dos filtros — a URL é a fonte da verdade —, aplicada a um estado que quase todo mundo resolveria com `useState`.

**A rota `/movimentacoes/[id]` NÃO morreu, e não é do feed: é do ATO.** Apontam para ela a timeline do processo (`TimelineProcesso.tsx`) e o "ver o ato" da pauta de prazos (`PrazosView.tsx`) — matá-la deixaria duas telas sem destino e tiraria do ato o único endereço que se manda para um colega. O painel traz "abrir a página do ato" como saída.

**Os blocos são os MESMOS objetos** (`components/movimentacoes/AtoDetalhe/`), consumidos pela página e pelo painel — inclusive a **ficha**, que virou a sidebar da página. Sem isso seria a quarta implementação do mesmo ato no produto — e a primeira a divergir seria a regra do prazo, que é onde divergir custa caro.

#### O painel foi desenhado a partir do celular, e para o ato SEM texto

Duas coisas o painel não é: uma cópia da página em miniatura, e uma tela de desktop encolhida.

- **A ordem é a da urgência no telefone** — prazo → providência → texto (fechado) → arquivos → ficha —, e é a mesma ordem do DOM, do Tab e do leitor de tela. A partir de 768px as áreas do grid põem o texto à esquerda e arquivos + ficha na calha de 320px, **sem reordenar o DOM**.
- **O `<details>` do teor abre fechado acima de 800 caracteres no painel** (a página usa 2.400). O corte é do celular: a 396px, 800 chars já são ~20 linhas, e um ato de 8 KB empurraria arquivos e ficha para 1.500px abaixo do polegar.
- **Rolagem própria só no desktop.** No celular o texto flui na página — caixa rolável dentro de lista rolável rouba o gesto do polegar. No desktop ela existe (`max-height: 52vh`) porque o texto divide a altura com a calha.
- **O layout padrão é o do ato SEM inteiro teor, que é o caso comum**: têm texto 100% das linhas `djen`, 2,0% das de `tribunalPublico` e 0,1% das de `pdpj`. Com a grade de duas colunas, a frase "o inteiro teor só existe no diário" ficava sozinha num vão de 1.269px. `:has(.semTexto)` troca as áreas: a frase ocupa a largura e a **ficha se espalha em duas colunas de pares**.
- **Nada no painel repete a linha acima.** O bloco verde de 24px com a data saiu: ele repetia, em cartaz, o chip que está 40px acima. A data volta por extenso, em 17px, com o que o chip não cabia.

#### O mapeador estava jogando fora metade do registro

`toPrazoDoAto` (`api.server.ts`) guardava **6 dos 13 campos** que o backend manda no prazo. Morriam ali: `canal` (diário ou portal — contam de dias diferentes), `deQuem` e `parte`, `emDobro` (CPC 180/183/186), `origem` (o que separa o prazo que o tribunal publicou do que nós calculamos), `fundamento` e `publicadoEm`. O painel é a primeira tela que precisava deles, e a linha de qualificação do prazo — `prazo de 15 dias · manifestação · pelo diário · sem dobra · do destinatário` — é literalmente esse resgate.

Junto vieram `fontes[]` (**quais** fontes confirmaram o ato: `pdpj + diário` quando dois sistemas independentes concordam — só aparece com mais de uma, porque "confirmado por 1 fonte" não é informação) e `nMovimento`, ambos mandados pelo backend e exibidos em tela nenhuma.

> Três defeitos que só a tela real mostrou: `OrigemMovimentacao` não tinha `pdpj` (o enum do banco tem, e é a origem de 22 mil linhas), então a ficha imprimia o valor cru; `grauLabel` devolve `'DJEN'`, que não é grau, e a ficha escrevia "DJEN grau"; e a distribuição vinha com hora colada ("28/05/2007 03:00"), dando precisão de relógio a um fato de calendário — a hora ali é o carimbo de importação.

**O detalhe é buscado só quando alguém abre.** `textoOriginal` não vem na listagem de propósito (medido: 100% das linhas `djen` têm inteiro teor, com média de 8 KB e 151 KB no maior; nas outras origens são 2,0% e 0,1%), então abrir custa uma requisição — e o `getMovimentacao` só roda se o id estiver **nesta** página.

**`?aberta=` de um ato fora do recorte não abre nada e não redireciona.** A URL do feed descreve a LISTA; o parâmetro só tem efeito sobre o que está nela. Quem quer o ato tem o endereço dele. O id é saneado (`[A-Za-z0-9_-]{1,64}`) antes de virar requisição, e o href da linha carrega a página atual — senão abrir um ato na página 2 voltaria para a 1, onde ele não está.

> **O custo declarado:** abrir uma linha re-renderiza a página no servidor, inclusive as 50 linhas. Medido localmente em ~50ms. Se em produção pesar, a saída é envolver só o painel num `<Suspense>` — não foi feito preventivamente.

#### A pauta mostra a PEÇA na linha fechada (10/09/2026)

`expedientePrazo` é o rótulo do cartório — "Sentença", "Despacho" —, e ele diz o que CHEGOU, não o que fazer. Quem varre a pauta decidindo o que atacar hoje procura a segunda coisa, e ela existe desde a fusão ato+prazo: `ia.peca` ("Apelação"), com `ia.risco` ao lado quando ele custa direito. O resto da leitura continua no painel expandido, onde há espaço.

- **Só a peça sobe para o sumário.** Checklist, "falta obter", complexidade e observação são para quem já decidiu abrir a linha; na lista eles competiriam com a data, que é o eixo da tela.
- **Sem leitura não há chip** — nem moldura vazia. `peca` é `null` em mera ciência, e a linha volta a ser exatamente o que era.
- **Cor de alerta só em `preclusao`, `perdaDeDireito` e `revelia`.** Pintar "multa" e "nenhum" de vermelho gastaria o sinal que a preclusão precisa.

> **O painel do prazo já mostrava tudo — o que faltava era o DADO.** Medido em 10/09/2026: as leituras gravadas na versão 1 do prompt (25 delas, todas anteriores à fusão) têm `peca`, `checklist` e `risco` **nulos**, então a pauta exibia "o que aconteceu" e nada em "o que fazer", sem nada explicando o vazio. Quem conserta isso é o backend, que passou a tratar leitura de prompt antigo como cache inválido nas rotas sob demanda — ver `SEM_LEITURA_NA_VERSAO_ATUAL` no CLAUDE.md do backend.

#### "Analisar processo" lê o processo INTEIRO, em rodadas (10/09/2026)

O botão existia e parecia não fazer nada. Eram **três defeitos empilhados**, e nenhum deles aparecia como erro na tela:

1. **O contador olhava a janela errada.** `/api/processos/{id}/leitura` contava os resumos dentro de `getProcessoMovements(id, 100)` — as **100 movimentações mais NOVAS** —, enquanto a IA escolhe o que ler por CATEGORIA (decisório antes de trâmite), não por data. Medido num processo de 292 movimentações: 9 lidas, **6** dentro daquela janela. O botão esperava um número que nunca alcançava o alvo, girava dez minutos e terminava anunciando "análise concluída" sem a tela ter mudado. Agora a rota responde pela COBERTURA do dossiê (`GET /ia/processos/{id}`), que conta o processo inteiro — e o payload grande dele fica no servidor: para o navegador continuam indo três números.
2. **Uma chamada não esgotava o processo.** O backend racionava a leitura com os tetos da ronda (25 atos, 8 documentos), então um processo com 48 atos legíveis lia 25 e devolvia `excedentes: 23` num campo que ninguém lia. O teto virou parâmetro no backend e o botão agora pede **rodadas** até uma delas não enfileirar mais nada — parando antes se a fila deixar de andar.
3. **Ato que falhava ficava inalcançável por uma semana.** O `jobId` da leitura é fixo por movimentação e o job falho era retido 7 dias — o BullMQ engolia todo enqueue seguinte daquele ato, em silêncio. Corrigido no backend (`removeOnFail: true`).

Decisões do componente que não se leem no código:

- **A espera é por PROGRESSO, não por relógio.** O teto absoluto de 10 minutos era a medida errada: 48 atos levam ~16 min só para drenar, e a fila `ia` é global — pode estar ocupada com a ronda de outra conta. Enquanto ato novo aparece, a espera continua; **três minutos calados** encerram a rodada. Depois que a rodada já leu o que pediu, a paciência cai para **30 s**, senão toda rodada terminaria com três minutos de poll contra uma fila parada.
- **"Movimentações lidas ≥ atos enfileirados" é indício, não prova.** Uma leitura escreve em todas as movimentações do mesmo ato (o agrupamento é pelo hash do teor), então 25 atos podem virar 40 movimentações lidas — usar isso como condição de parada encerraria a espera com jobs ainda na fila. Quem diz que acabou é a fila, quando para de produzir.
- **Rodada que não lê nada encerra o ciclo.** Insistir repetiria o mesmo pedido: o ato sem texto continua sendo candidato a cada rodada (o livro-razão de falha de download é de outro caminho), e sem essa saída o botão pediria para sempre.
- **A parada NÃO é `excedentes + adiadosPorOrcamento === 0`.** Parecia a saída óbvia — o backend diz o que adiou —, mas ela perde o ato que se TORNA legível durante a rodada: buscar a peça grava o teor, e um ato sem texto no começo tem texto no fim. Medido no `0700891-02.2023.8.07.0002`: a rodada 1 devolveu os dois campos zerados e a rodada seguinte ainda encontrou **5 atos** para ler. Quem encerra o ciclo é a rodada que não enfileira nada.
- **`MAX_RODADAS = 8`** é para a aba esquecida aberta, não para o processo: com os tetos novos, o acervo de teste resolve tudo em uma rodada.

#### O botão de leitura por IA mora DENTRO do collapse (10/09/2026)

A rota que lê UM ato existe desde 07/09/2026 (`POST /ia/movimentacoes/{id}`, era `POST /movements/{id}/analise`) e **nenhuma tela a chamava**: a leitura só acontecia em lote — a ronda do dia, ou o botão "Analisar processo", que lê o processo inteiro. Quem abria uma linha da timeline e via o rótulo cru do cartório não tinha como pedir a leitura daquela linha, apesar de ela ser a análise mais barata das quatro: um ato, uma chamada.

`LeituraDoAto` (client) embrulha `LeituraIaDoAto` (o bloco que mostra) e acrescenta o botão. Aparece nos dois consumidores do mesmo bloco: o painel do feed / da timeline do processo, e a página do ato.

| resposta | o que é | o que a tela faz |
|---|---|---|
| **200** | já lido — o backend cacheia | mostra a leitura na hora |
| **202** | enfileirado | acompanha até o resumo aparecer |
| **409 `ATO_NAO_LEGIVEL`** | não há texto para ler | explica, em vez de girar |

- **O 202 não traz `jobId`** — e é a diferença desta rota para `/ia/prazos/{id}` e `/ia/processos/{id}`, que trazem. O resultado da leitura do ato mora nas COLUNAS da movimentação, não em `Analise`, então quem responde "já saiu?" é a própria movimentação. Daí `GET /api/movimentacoes/{id}/leitura`, que devolve só o bloco `ia`: `GET /movements/{id}` traz o ato inteiro (3,8 KB de média, 288 KB no maior) e o poll roda de 5 em 5 segundos por até 5 minutos — puxar o detalhe a cada volta seria pagar o texto do ato dezenas de vezes para ler seis campos. Mesmo argumento de `/api/processos/{id}/leitura`.
- **O botão não aparece onde a IA não lê**, e o predicado é `podeLerComIa` (`lib/leitura-do-ato.ts`), espelho do recorte do backend: origem pública (`djen`, `tribunalPublico`, `pdpj`) e categoria fora de `publicacao`/`tramite`. **`categoria` nula PASSA** — o ato do DJEN é gravado sem categoria e é a única fonte de ato endereçado; tratá-la como "não lê" esconderia o diário inteiro. Sem esse filtro o botão seria oferecido para a maior parte do acervo e devolveria 409 — a mesma classe de defeito das rotas órfãs de 07/09, em que um 404 do Express virava "a IA não leu nada" na tela.
- **No ato já lido o rótulo é "Ler de novo"**, e ele manda `?forcar=true`. É o caso de o inteiro teor ter chegado depois da primeira leitura — o backend derruba só o `analisadoEm IS NULL`, as outras condições continuam valendo.
- **`router.refresh()` quando a leitura chega**: o título da linha ACIMA do collapse é o resumo da IA (`resumoMovimentacao`), renderizado no servidor. Sem o refresh, o painel mostraria a leitura e o título continuaria sendo o rótulo do cartório.
- **Estourar o teto de espera não é erro.** A fila `ia` é global e serial (~20 s por ato, `KIMI_RPM` 3): um ato pedido enquanto a ronda drena espera a vez. Passados 5 minutos o poll para e a leitura aparece na próxima vez que a tela carregar — dizer "falhou" ali seria mentira.
- **`LeituraIaDoAto` saiu de `AtoDetalhe.tsx` para arquivo próprio** porque quem o renderiza depois da resposta é um client component ao lado; deixá-lo onde estava faria `AtoDetalhe → LeituraDoAto → AtoDetalhe`, ciclo de import atravessando a fronteira client/server. `AtoDetalhe` o reexporta — `PrazoRow` mostra a leitura dentro do collapse do PRAZO, onde o botão é outro.
- **A página do ato ganhou o bloco que lhe faltava**: sem vencimento, o card do prazo não existe — e com ele sumia também a leitura, que mora lá dentro. O ato de mera ciência (a maioria) chegava à página sem lugar nenhum onde pedir a leitura, embora o painel do feed já a mostrasse.

Medido ao vivo em 10/09/2026, no `Ato ordinatório — 4ª Vara Federal Cível da SJDF` (DJEN, ainda não lido): `202 {enfileirados: 1}` → resumo na tela em ~10 s, `confianca: alta`, e **nenhum `Deadline` criado** — a IA concluiu o mesmo que a heurística nova (`ciencia`): "o prazo de 5 dias é para o arquivamento dos autos, não impondo obrigação específica à parte".

### O corte é a CATEGORIA, e a faixa de métricas saiu

O topo do feed gastava 108px com "Novas (48h) 12 · Nesta página 20 · Total 6478", e dois desses três números não eram informação — "nesta página" é o tamanho da página e "total" já está na paginação. O lugar valia mais como o corte que a página não oferecia: **decisões · petições · publicações · prazos · trâmite**, que o backend já filtra no banco e para o qual **já existia componente pronto (`CategoriaFilter`), montado em tela nenhuma**.

- **`newToday` é da PÁGINA, não da conta** (`getMovimentacoes` conta dentro do conjunto trazido). Escrito "Novas (48h)", o número parecia um fato da conta inteira e ia a zero na página 2; o rótulo agora diz "novas nesta página".
- **No celular a faixa de categorias ROLA, não quebra**: com `wrap`, as seis opções viram quatro linhas e ~110px antes da primeira movimentação. Mesmo tratamento do seletor de anos do calendário do processo.

### O filtro de ORIGEM é o que desdobra a linha repetida

O mesmo ato existe **duas vezes** no feed quando o portal e o diário o viram: o pareamento do PDPJ+DJEN (`pdpj-djen-merge.ts`) carimba `fontes` nas duas linhas e **não apaga nenhuma**, porque cada uma carrega o que a outra não tem — o diário traz o inteiro teor e o ato endereçado, o portal traz todo movimento, inclusive o que nunca foi publicado. O selo de procedência da linha (`origemDaLinha`) já dizia qual era qual; o que faltava era poder ler **uma fonte de cada vez**.

`?origem=pdpj|djen` filtra no banco (`?origem=` de `/movements`) e é o único filtro da tela que reduz repetição em vez de estreitar assunto. É um `select`, não caixas de seleção: a API aceita um valor por vez, e marcar as duas seria o mesmo que não filtrar — que é o padrão.

`scraper`, `tribunalPublico` e `datajud` existem no enum e ficam fora da lista (`ORIGENS_MOVIMENTACAO`, em `lib/movimentacao-filters.ts`): nenhum tem par para desempatar, e oferecê-los daria três opções que devolvem lista vazia na carteira de hoje.

### Ordenar por tribunal não pode desmentir o cabeçalho do dia

`sort=tribunal` ordenava por tribunal e **depois** agrupava por data: um grupo "§ 5 SET" reunia vários tribunais e a ORDEM dos grupos virava "o primeiro tribunal que por acaso teve aquela data" — cabeçalhos de dia fora de ordem cronológica, sem nenhum agrupamento por tribunal visível. Agora tribunal é **desempate dentro do dia** (`sortMovEntries`, com `diaDe` usando a mesma chave de dia de `formatDateGroup` — e por isso lendo `getUTC*` sem descontar fuso, porque a data já chega em wall-clock de Brasília gravado nos campos UTC).

### O detalhe responde três perguntas, nesta ordem

```
o que aconteceu  →  a leitura da IA como título (o rótulo do ato quando ela não rodou)
até quando       →  o bloco do prazo: data por extenso, fundamento legal, ressalva de estimativa
o texto          →  a íntegra do ato, em <details> nativo
```

Antes o maior tipo da página era o nome do cliente e o segundo era o CNJ — mas quem abre esta tela já sabe de que processo veio, clicou nele no feed. A pergunta que traz a pessoa aqui é o que o juízo decidiu e o que ela faz com isso.

**Os três blocos não moram mais aqui**: são `PrazoDoAto`, `ProvidenciaDoAto`, `TeorDoAto` e `DocumentosDoAto` em `components/movimentacoes/AtoDetalhe/`, porque a linha expandida do feed mostra exatamente os mesmos. A página os intercala com o hero e a coluna do processo; o painel os mostra sozinhos. O que sobrou de inline aqui é layout de página (breadcrumb, hero, sidebar), e o `page.module.css` caiu de 173 para 72 linhas.

- **A íntegra abre FECHADA acima de 2.400 caracteres** (`CHARS_ATO_ABERTO`). O corte de 20.000 na gravação caiu em 03/09/2026, então o campo guarda o ato inteiro: 3,8 KB de média, 151 KB no maior desta carteira. `<details>` nativo, sem client component — a página é Server Component e o elemento faz exatamente isso sem JavaScript.
- **`Date.now()` não entra no render.** O ESLint do Next 16 reprova (chamada impura), e a resposta é sobre o dado: `novo` é calculado em `getMovimentacao`, como o feed já fazia.
- **Saíram da sidebar** `Sync: success` e a bolinha vermelha de `Não monitorado` — estado interno da varredura, e processo vindo da consulta pública é `monitored: false` por construção, então a bolinha assustava sem informar. A data de detecção aparece uma vez, no rodapé da coluna; aparecia três vezes na página.

> **Prazo vencido dizia "vence hoje".** `diasAteVencimento` tinha um `Math.max(0, …)` grampeando o resultado em zero, então um prazo de 24/05 aparecia em vermelho como vencendo hoje, 04/09. Cascateava: `prazosAbertos` filtra `>= 0` e nunca removia vencido, a contagem de `criticos` (`<= 3`) engolia o acervo vencido, e o ramo `dias < 0 → 'vencido'` de `prazoLabel` era código morto. A conta agora é por dia de calendário em wall-clock de Brasília, com sinal.

> **Contraste: `--ink-3` e `--ink-4` não servem para texto.** Medido: `--ink-3` dá 3,8–4,3:1 contra os fundos do sistema (o mínimo é 4,5) e `--ink-4` dá 2,0–2,3:1. `--signal` como cor de TEXTO dá 2,6–3,0:1 — ele é fundo (`--signal-soft`), não tinta. O que passa: `--ink-2` (7,8–9,0), `--brick` (5,9–6,8), `--brick-deep` (7,5–8,7) e `--alert` (6,9–7,9). As telas de movimentações já usam só esses; **o resto do app ainda usa `--ink-3` em texto secundário** e vale uma passada.

## Documentos: a peça do tribunal e a certidão de publicação

**Resposta curta para "dá para trazer os documentos?": dá, e é uma requisição HTTP.**

O DJEN devolve um `hash` por comunicação (presente em **100%** de 1.562 medidas), e `GET comunicaapi.pje.jus.br/api/v1/comunicacao/{hash}/certidao` responde o PDF oficial — sem autenticação e sem captcha. O documento traz cabeçalho do tribunal, "Diário de Justiça Eletrônico Nacional de <data>", número da certidão, capa do processo, destinatário, **todos os advogados com OAB** e o teor integral. É o que se junta aos autos para demonstrar tempestividade.

As três vias, medidas em 04/09/2026:

| via | cobertura | o que responde |
|---|---|---|
| `hash` → certidão | **100%** | o PDF, direto |
| `link` do ato | 98% | HTTP 200 e uma página do PJe com **hCaptcha** |
| `Movement.documentos` | **0%** no acervo público *(em 04/09; hoje é a via principal do TJDFT — ver abaixo)* | na medição, só o scraper autenticado preenchia |

O `link` não recusa nem manda para o login — serve a `ConsultaDocumento` do tribunal com um `hcaptcha.com/1/api.js` embutido. Tratá-lo como "baixar documento" entregaria um captcha; ele ficou como **"Ver no PJe"**, com o aviso na tela.

- **A chave nunca chega ao browser.** Ela vale numa rota pública do CNJ sem autenticação nenhuma, então devolvê-la na API entregaria o documento de um processo a quem lesse a resposta. A API expõe só `temCertidao: boolean`; o download passa por `GET /movements/{id}/certidao` (backend, confere o acervo) via `/api/movimentacoes/{id}/certidao` (proxy do Next, tem o cookie).
- **`Content-Disposition: inline`** — abre em aba, não baixa um arquivo que o advogado teria de procurar na pasta.
- **A aba de documentos do processo saiu de 0 para 11** neste processo de teste. Ela só conhecia `Movement.documentos` e por isso dizia "nenhum documento extraído das movimentações" para um acervo inteiro que tem documento.

### A peça em si (TJDFT): `baixavel`, não `urlDocumento`

A certidão acima é do DJEN. Na origem `tribunalPublico` o documento é outro — o PDF do próprio despacho, da decisão, da petição — e ele **existia e não aparecia**: `toDocumentos` filtrava por `urlDocumento`, e o backend só grava esse link quando a varredura busca o inteiro teor do ato. Medido em 05/09/2026: **57 de 532** movimentações com documento tinham URL. As outras 475 tinham a chave do tribunal e a tela as descartava como se documento não houvesse — num processo real, a aba mostrava 5 de 22 peças.

O backend passou a marcar cada documento com `baixavel: true` quando sabe entregá-lo (`GET /movements/{id}/documento?i=`), e a regra do front virou:

```
baixavel   → /api/movimentacoes/{id}/documento?i={índice}   (proxy daqui, leva o cookie)
senão      → urlDocumento                                    (o link do tribunal, do scraper)
```

- **O índice é o de `documentos[]` no backend**, então os `subDocumentos` são mapeados por fora, pelo `urlDocumento` deles: `?i=` não endereça a concatenação das duas listas.
- **A tela de detalhe da movimentação lista as peças acima da certidão** — o PDF do ato é o que se abre para ler; a certidão prova que ele foi publicado. "Ver no PJe" só aparece quando aquele href **não** está na lista, senão seria o mesmo link duas vezes com dois rótulos.
- Como antes, a chave do tribunal não precisa chegar ao browser para o documento chegar: quem a troca pelo arquivo é o backend.
- **Nem todo documento é PDF, e o proxy deixou de fingir que é.** Desde 06/09/2026 TRF1 e TRF3 (PJe de consulta pública) também têm peça baixável, e ali o tribunal serve **HTML** — a consulta pública do PJe não tem PDF do ato. `/api/movimentacoes/{id}/documento` repassa o `Content-Type` do backend em vez de fixar `application/pdf`; com o tipo fixo o navegador abria uma aba de lixo binário. O backend manda a página já recortada e fechada (sem script, sem CSS do tribunal, sem imagem remota), então ela abre direto na aba.
- **O 502 do PJe é transitório e diz isso** (`code: TRIBUNAL_NAO_SERVIU`): servir documento é propriedade da sessão do tribunal, e o backend já troca de sessão três vezes antes de desistir. Vale oferecer "tentar de novo" em vez de dizer que o documento não existe.
### Quem decide se o botão de documento aparece é o BACKEND (08/09/2026)

`MovementView.documentoEstado` — `nenhum | disponivel | provavelIndisponivel |
trancado` — existe desde 06/09 justamente para o front parar de refazer essa
conta, e **o front não o lia**: `temDocumentoTrancado` reimplementava um pedaço
dela em `api.server.ts`, sem acesso ao que só o backend tem.

O que só ele tem é o **livro-razão de `Documento`**: quais chaves já foram
pedidas ao portal e voltaram sem arquivo. Medido em 08/09/2026: **195 de 309
pedidos (63%) devolvem 404** — o PDPJ referencia mais peça do que serve, e o
rótulo genérico `'Documento'` (o portal dizendo "não sei classificar isto")
falhou em 3 de 3 na sondagem ao vivo.

- **`documentoEstado` manda; a conta local virou segunda via.** Ela roda só
  quando o campo vem ausente (backend anterior a 06/09) — não como regra, porque
  discordaria justamente nos casos que importam.
- **`provavelIndisponivel` chegou à tela.** O botão continua clicável (a peça de
  parte abre quando a conta é parte no processo, e não há como saber sem tentar),
  mas ganha "(pode não abrir)" e um `title` explicando. Avisar antes é melhor que
  o advogado descobrir com uma aba vazia — e melhor que esconder um documento que
  às vezes abre.

### Duas vias de documento saíram da aba (08/09/2026)

Não foi decisão de tela: **as rotas do backend deixaram de existir** quando as
fontes foram para `_backup/` em 07/09.

| rota | o que servia |
|---|---|
| `GET /processes/{id}/documentos/{tribunal}/{doc}` | a peça pelo scraper autenticado — o "catálogo público" do processo |
| `GET /processes/{id}/certidao-andamento` | a certidão de andamento do STJ, o único documento que cobria a timeline inteira lá |

As duas respondiam **404 em HTML**, e o `res.json()` do proxy estourava nele: a
tela dizia "Serviço indisponível" em vez de "não existe". Saíram os dois links,
os dois route handlers e os campos órfãos (`temCertidaoAndamento`,
`documentosPublicos`, `documentosPublicosCompletos`), que o backend também já
não serve.

> **Como isto foi encontrado, e vale repetir:** extrair todo caminho que o front
> chama (`src/app/api/**/route.ts` + `api.server.ts`), extrair as rotas que o
> Express monta, e **bater uma a uma contra o backend de pé** — 404 com
> `text/html` é rota que não existe, 401 JSON é rota viva. O `tsc` não vê nada
> disso, e duas rotas mortas conviveram com typecheck e build limpos.
>
> Só o método completo serve — e o próprio parágrafo que ficava aqui é a prova:
> ele afirmava que `/scraper/monitorar-oab` e `/scraper/preview-djen` eram falso
> positivo da extração estática e **estavam vivas**. Não estavam. Sondadas com
> token em 11/09/2026, as duas respondem **404 em `text/html`**. **Sondar antes
> de afirmar** — inclusive para inocentar uma rota.
>
> **Sondar sem token não serve para nada neste backend**: os routers montam
> `authenticate` antes do casamento de rota, então `POST /scraper/rota-que-nao-existe`
> também responde 401. O par que discrimina é **404 `text/html` (Express, rota
> inexistente) × qualquer JSON (a aplicação respondeu)** — e só aparece com um
> token válido na mão.

### As duas rotas mortas que esvaziavam a conta nova (11/09/2026)

Elas mataram o fluxo inteiro de cadastro pelo Google, e o sintoma não apontava para lugar nenhum: **conta criada, OAB digitada, 88 processos na tela de `/oab` — e painel vazio, sem `OabMonitorada`, sem job, sem erro.**

| o front chamava | estava | o certo |
|---|---|---|
| `POST /scraper/monitorar-oab` (callback do Google) | 404 desde 04/09 | `POST /consulta-publica/geral` |
| `GET /scraper/preview-djen` (prévia do onboarding) | 404 desde 04/09 | `GET /consulta-publica/previa` |

**O 404 não bastava para causar o dano — quem causou foi como cada chamador lia a resposta.** É a parte que se repete, e a que vale guardar:

- O callback do Google fazia `return res.status === 409`. Um booleano com três significados possíveis: gravou, conflitou, ou **a rota não existe** — e os dois últimos caíam no mesmo `false`, que o destino lia como "gravou". Agora são três estados (`ok | conflito | falhou`), e só `ok` manda para o painel: falhar manda para o `/onboarding` com a OAB na URL, que refaz a pergunta.
- O proxy da prévia fazia `res.json()` sobre o `<!DOCTYPE html>` do 404, estourava no parse e caía no `catch`, que diz "Serviço indisponível" — e o onboarding traduzia para **"Falha ao conectar ao servidor"**. Erro de rede para um servidor que respondeu na hora. Os proxies agora conferem o `content-type` antes do parse e logam quando ele não é JSON, como `previa.server.ts` já fazia.
- O onboarding engolia `ligarMonitoramento` quando o resultado não era conflito. A tela seguia dizendo "já estamos trazendo esses processos para o seu painel" com nada gravado. Agora o erro sobe para a tela, com "tentar de novo".

A lição, em uma linha: **rota morta é barata de achar e cara de esconder** — o caro nunca é o 404, é o chamador que traduz "não existe" para "deu certo".

## A timeline do processo: dia a dia, com "carregar mais"

`components/movimentacoes/TimelineProcesso/` — `'use client'`, e o mínimo que precisa ser: a **primeira página vem renderizada do servidor** (prop `inicial`), então quem chega pela URL lê o conteúdo antes de qualquer JavaScript. O estado só existe para acumular o que vier depois.

**A data é cabeçalho, não coluna.** Era uma linha por ato com a data repetida à esquerda em cada uma — num dia de seis movimentações, "29 de agosto de 2026" escrito seis vezes. Agora o dia é um cabeçalho com ícone e trilho vertical, e os atos daquele dia são cartões sob ele.

**Acima de 3 atos no mesmo dia, o resto fica atrás de um "mostrar mais"** (`<details>` nativo, sem JS). O caso que motivou: um dia de cartório rende seis "Decorrido prazo de FULANO" seguidos, um por parte, que são o mesmo fato repetido — e sozinhos empurravam o dia seguinte para fora da tela.

**"Carregar mais" ANEXA; não é paginação.** Medido na base: mediana de **40** movimentações por processo, p90 de **288**, máximo de **4.900**. Com Anterior/Próxima, percorrer o p90 custava 15 recarregamentos, cada um devolvendo a pessoa ao topo. A página subiu de 20 para **50** (a mediana passa a caber inteira) e o clique passou a fazer a lista crescer com o scroll onde está.

> **Não carrega sozinho ao rolar.** A 534 bytes por movimentação (medido), o processo de 4.900 daria ~2,5 MB de dados e ~54 mil nós de DOM. Scroll infinito chegaria lá sem ninguém pedir; o clique é o teto.

> **O "Carregar mais" leva os MESMOS filtros da página 1, e `todas` é o caso que quebra.** A página sem filtro pede `['todas']` — 4.900, trâmite incluído —, enquanto lista vazia faz o backend aplicar o default, que **esconde** trâmite (3.986). O route handler não pode sanitizar esse valor com `parseCategorias`: ela valida contra o enum de categorias e `todas` não é uma, então virava lista vazia e a página 2 vinha de um conjunto menor que a 1 — o cartório sumia no primeiro clique e a contagem nunca fechava.

> **Dedupe por id ao anexar.** A ronda roda 3× ao dia; se o acervo ganha movimentação entre uma página e a seguinte, o mesmo ato escorrega para a página de baixo e voltaria repetido — chave de React duplicada é erro de render, não detalhe.

> **Um canal só para "novo": o selo NOVA.** As primeiras versões acendiam também a borda do cartão e o ícone do dia. Na tela isso se provou errado: `state: 'signal'` cobre 48h de DETECÇÃO, não de ocorrência, então num processo recém-importado — que é todo processo no primeiro dia — os 316 atos entram juntos e a coluna inteira fica verde. Quando tudo está em destaque, nada está.

> **Os estilos de documento moram em `components/movimentacoes/documentos.module.css`**, e não no CSS Module da página: o cartão (client) e a aba Documentos (server) renderizam a mesma lista, e desde a extração não podem mais compartilhar o module do `page.tsx`.

## O calendário do processo (`?aba=calendario`)

Um heatmap de um ano por vez: cada casa é um dia, e **quanto mais escuro, mais aconteceu**. `components/movimentacoes/CalendarioProcesso/`, Server Component — a escolha do ano viaja em `?ano=`, como todo filtro deste projeto.

**Os degraus são buckets fixos, não escala linear, e isso saiu de medição.** Dos 2.441 dias com movimentação no acervo, **61% têm exatamente 1** e 92% têm até 3, enquanto o topo chega a **732 num dia só** (ação coletiva de 1989, centenas de intimações no mesmo despacho). Numa escala linear, 2 movimentações pintariam 0,3% do verde: o calendário sairia branco com meia dúzia de quadrados escuros, e a variação que interessa — 1 contra 3 — some. Os cortes (`1 · 2–3 · 4–9 · 10–29 · 30+`) são redondos porque quantis puros dariam "2,4" e "8,7", ilegíveis numa legenda, e cada faixa tem massa real: 61% / 30% / 7,7% / 0,4% / 0,5%.

**A rampa foi validada, não escolhida a olho** (`scripts/validate_palette.js` da skill `dataviz`, modo ordinal): lightness monótona, ΔL ≥ 0.06 entre vizinhos, hue única (8° de variação) e o passo mais claro em 2.04:1 contra a superfície.

> **`--brick-soft` FALHOU como primeiro degrau** — dá **1.14:1** sobre o creme `--paper`, e o degrau 1 é 61% dos dias com movimentação, ou seja, a maior parte do mapa seria invisível. Por isso o degrau 1 (`#91bba1`) é bem mais escuro do que a intuição pede: **sobre fundo creme, verde claro some**. É o tipo de erro que só o cálculo pega — no olho, o `--brick-soft` parece um verde perfeitamente visível.

**Um ano por vez, e o ano padrão é o último COM movimentação, não o corrente.** O maior processo da base vai de 1990 a 2026: 37 anos, ~13.500 casas, ilegível numa tela. E abrir no ano corrente mostraria vazio num processo que parou em 2019 — parar é o estado normal de metade de um acervo.

**Cada dia com movimentação é um link que filtra a timeline naquele dia**, preservando os filtros da tela; dia vazio não é link, porque levaria a uma lista vazia. É o que faz o calendário ser navegação e não enfeite: achar o quadrado escuro de outubro e clicar nele é mais rápido que rolar 4.900 movimentações.

> **A agregação é do backend** (`GET /movements/por-dia`), nunca derivada da lista carregada: a timeline mostra 50 por vez, e derivar dela pintaria só o pedaço já rolado — o mapa de 37 anos apareceria como duas semanas. Ela respeita o MESMO filtro de categoria da lista (inclusive o default que esconde trâmite): um dia aceso que a lista não tem levaria a um clique que não devolve nada. Medido: 172 dias / 3.986 movs no default, 339 dias / 4.900 com `categoria=todas` — os dois batendo com o total da listagem.

> **O rótulo de mês entra uma vez por mês, comparando com a semana anterior.** A primeira versão marcava toda semana com um dia ≤ 7 e a régua saiu com "jan jan", "abr abr", "mai mai" na tela: a virada do mês cai no meio da semana com frequência, então duas colunas seguidas têm dias ≤ 7 do mesmo mês.

> **O seletor de anos é uma FAIXA que rola, não uma grade que quebra.** Com `flex-wrap: wrap`, os 37 anos do processo mais antigo da base viravam uma parede: medido no mobile, **495 px de altura** só de botões de ano — quem abria a aba via a lista de anos e mais nada, com o calendário empurrado para fora da tela. Em faixa (`nowrap` + `overflow-x: auto` + `min-width: 0` nela e no cabeçalho), o seletor ocupa **35 px** em qualquer largura. No desktop ele volta ao canto direito, ao lado do título.

> **A rampa da legenda é indivisível.** Medido a 150 px, a escala partia ao meio — "menos ▪▪▪" numa linha e "▪▪ mais" na outra —, e uma rampa lida em dois pedaços deixa de mostrar a progressão, que é a única coisa que ela faz. Os cinco degraus e os dois rótulos vivem num `inline-flex` com `nowrap`; as faixas por extenso (`1 · 2–3 · …`) é que caem para a linha de baixo.

> **A grade rola dentro de si, e a página não vaza.** `overflow-x: auto` no container das semanas: 53 colunas não cabem em tela de celular, e encolher a casa abaixo de 12 px tiraria o alvo de toque e o degrau de cor. Conferido a 150 px de viewport: `scrollWidth` 814 dentro de `clientWidth` 103, com a página sem rolagem horizontal.

> **Tudo em UTC** (`Date.UTC`, `getUTCDay`): as datas chegam como `YYYY-MM-DD` já em wall-clock de Brasília, e construir a grade com o fuso do servidor deslocaria o calendário inteiro em um dia sempre que a aplicação rodasse fora de -03.

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
- **Trocar a OAB de uma conta é uma pergunta, nunca um efeito colateral.** O backend recusa (`409 OAB_JA_MONITORADA`) ligar uma OAB nova sobre uma conta que já monitora outra, e os quatro pontos que gravam OAB tratam esse 409 com a mesma tela — `ConfirmarTrocaOab` (`components/oab/`), alimentada por `ligarMonitoramento` (`lib/monitorar-oab.ts`), o contrato num lugar só. O caso que criou a regra: cadastrar uma OAB nova sobre um **e-mail que já existe** levava ao login da conta antiga e daí a uma troca silenciosa, com os dois acervos misturados no painel. Quem chega logado por `/oab`, pelo onboarding, pelo painel (`CadastrarOab`) ou pelo Google vê as duas OABs nomeadas e escolhe. Trocar **arquiva** o acervo da anterior — não apaga, e ele volta se a OAB voltar.
- **O callback do Google não tem tela, então não decide.** Ele é o único caminho sem UI (quem está do outro lado é um redirect), e por isso nunca manda `confirmarTroca`: no 409 ele redireciona para `/onboarding?oab=…&uf=…`, que faz a pergunta. Antes ele gravava direto — era o caminho mais silencioso dos quatro.
- **O painel continua gravando a OAB ali mesmo** (`CadastrarOab` → `POST /scraper/monitorar-oab`). A regra da rota única vale para *antes* da conta existir; depois dela, tirar a pessoa do painel para uma página de vendas seria o desvio, não o caminho.

### O onboarding não pede credencial (11/09/2026)

A conta nova nasce com **OAB e fontes públicas, e nada mais**. O `/onboarding` tinha um estágio inteiro só para isso (`credencial`), o `CredentialSheet` embutido, e cada um dos seus cinco estados terminava num botão de cadastrar o login do tribunal — inclusive a tela de resultado, que oferecia "Conectar" por tribunal encontrado. Saíram todos.

O motivo é de funil, não de arquitetura: **a senha do tribunal é o pedido mais caro do produto** — CPF, senha e o segredo do MFA — e estava sendo feito no primeiro acesso, antes de a pessoa ter visto valor nenhum. Ela não é mais necessária para o produto funcionar: quem consulta o PDPJ é o sistema, com uma credencial de SERVIÇO, e o DJEN não tem credencial nenhuma. O que a credencial ainda alcança — processo em segredo de justiça, que não aparece em base pública — virou **passo opcional em `/credenciais`**, e as telas dizem isso em texto, sem botão.

- **O porteiro da página mudou junto.** `/onboarding` redirecionava ao painel quando `getScraperSecrets()` vinha não-vazio — "tem credencial" como sinônimo de "conta pronta". Com a credencial fora do fluxo, a conta pronta é a que **monitora uma OAB**: o porteiro é `getUsuarioAtual().oab`. Sem essa troca, toda conta nova (zero secrets) voltaria a cair na pergunta que ela já respondeu no cadastro.
- **`sistemas` continua sendo prop da tela**, agora por um motivo só: traduzir a sigla do DJEN (`TRF1`) no nome do tribunal na lista de resultados.
- **As saídas deixaram de ser "pular por agora".** Não há mais o que pular: a OAB já foi gravada e a varredura já está na fila quando a tela mostra o resultado. O botão é "Ir para o painel".
- **A tela de varredura do painel perdeu o botão** (`PainelSincronizando`). Ele era `botaoPrimario` enquanto a busca ainda não tinha achado nada — ou seja, a ação mais destacada oferecida a quem acabou de entrar era "digite a senha do seu tribunal", durante a espera da primeira varredura. Sem nada achado, a área de ações não renderiza: a tela presta contas, não pede. Com processos achados, sobra só "Abrir o dashboard →".
- **Os estados vazios do painel continuam como estavam** (`PainelSemOab`, `PainelSemResultado`): o login do tribunal ali é um link de texto discreto para `/credenciais`, nunca o pedido principal — que é a OAB, no campo da própria tela.
- **Entrar de novo re-sincroniza.** Desde a mesma data, `POST /auth/login` e `POST /auth/google` enfileiram no backend a consulta geral da OAB monitorada (janela de 30 min para não repetir). É o que garante que sair do onboarding pelo caminho mais curto não deixe a conta parada até o próximo cron.

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
- [x] Extrair `TimelineItem` de `/processos/[id]/page.tsx` para componente próprio (`TimelineProcesso`)
