# Painel "Caixa de triagem" (sugestão B) — plano de implementação

**Canvas aprovado como proposta:** https://claude.ai/artifact/Au9KqBbLZ6ZuvdYfwn5DmV
(artboards: `Main` = pilha cheia · `Dobra` = o que aparece ao abrir, 390×844 · `Confirmar` = a folha "De quem é este prazo?" · `Vazia` = pilha zerada · `Desktop`)
A alternativa, sugestão A ("Pauta do dia", eixo do tempo): https://claude.ai/artifact/XqBLWfgqgRsJSXfbBRC61G

**O que a tela é.** `/painel` deixa de ser um apanhado de blocos e vira uma **pilha de cartões agrupada por PERGUNTA** — "Já protocolou?", "De quem é este prazo?", "Chegou e pede sua ação" —, indexada por um **veredito** de quatro linhas montado dos dados (não é IA). O que não pede ação do dia sai da pilha e vira lista: "Mais adiante" e "Só para saber".

**A aposta.** O eixo é a decisão, não a data. É o único desenho que dá lugar ao prazo `indefinido` — que hoje **não gera aviso no WhatsApp** (`elegibilidade.ts:93`) e, por isso, só aparece se o advogado abrir a pauta. Na medição de 06/09/2026 eram **119 de 203**.

**O custo.** B exige **uma escrita nova no backend** (`deQuem`) que A não exige. Está isolada na Fatia 4: as fatias 1–3 sobem sem ela e já substituem o painel atual.

---

## 1. O que já existe e não se reescreve

Levantado no código em 20/09/2026. Quase tudo que a tela precisa já está pronto — o painel atual é que não usa.

| Peça da tela | Já existe em | Observação |
|---|---|---|
| Prazos com tudo (`deQuem`, `lembrarEm`, `metodoPrazo`, `fechado`, `ato.ia`, `vencimentoISO`, `diasRestantes`, `cliente`/`parteContraria`) | `getPrazos()` — `lib/api.server.ts:1819`; tipo `Prazo` — `types/index.ts:542` | o painel já chama e **descarta** `ato.ia.peca`, `oQueFazer`, `risco` e `lembrarEm` |
| Novidades desde a última visita | `getMovimentacoes(1, n, { novas: true })` — devolve `naoVistas`, `vistasAte`, `novidadeDesde` | filtrado no banco |
| Os três baldes "Pede sua ação / Outras novidades / Só cartório" | `montarNovidades()` — `lib/novidades.ts:49` | hoje só `/movimentacoes?vista=novas` usa |
| "É comigo?", tom dos dias, etiquetas literais | `lib/situacao-do-ato.ts` (`deQuemDoAto`, `tomDosDias`, `pedeAcao`) | o painel não usa nenhuma |
| Faixas e rótulos de urgência | `lib/prazo-apresentacao.ts` (`faixaPrazo`, `quandoPrazo`) | |
| Verbo **Protocolei** | `<BaixarPrazo prazoId fechado compacto />` | já otimista, já com "Baixado · Desfazer", **a linha não some** |
| Verbo **Lembrar** | `<LembrarPrazo prazoId vencimentoISO lembrarEm />` | descarta opção no passado — ver §5 |
| Marcar tudo como visto | `<MarcarVistas />` + `POST /api/movimentacoes/vistas` | |
| Escrita no prazo | proxy `PATCH /api/prazos/[id]` → `PATCH /deadlines/:id` | hoje encaminha **só** `fechado` e `lembrarEm` |
| Saúde da varredura | `getTribunaisStatus()` → `status`, `lastSyncAt`, `activeProcessesCount` por tribunal | é daí que saem "229 de 243" e "TJRN sem resposta" |
| WhatsApp | `getCanalWhatsapp()` → `ativo`, `telefone` (mascarado) | |
| Panorama em prosa | `GET /ia/carteira` (`ia.router.ts:172`) | **o front não consome**: não há proxy em `app/api/ia/carteira` |
| Casca do celular | `AppLayout` + `BarraInferior` (badges `prazos`/`movimentacoes`) | o painel hoje passa só `prazos` |

---

## 2. O que precisa ser criado

### Backend (`backend-movijus`)

1. **`PATCH /deadlines/:id` aceitar `deQuem`** — `features/deadlines/deadlines.router.ts:786`. Hoje desestrutura `tipoDocumento, parte, prazo, dataLimite, fechado` (+ `natureza`, `lembrarEm` lidos de `req.body`). Validar contra o enum `DeQuemPrazo` e recusar valor fora dele — diferente de `lembrarEm`, aqui data inválida virando `null` seria apagar a resposta do advogado.
2. **`Deadline.deQuemManual DeQuemPrazo?`** (migration) — **a parte que não pode ser esquecida**. `reconciliarPrazoDoAto` (`jobs/ia/analise.processor.ts`) faz `prisma.deadline.update` com `deQuem: DeQuemPrazo.destinatario` quando a IA conclui isso. Sem a coluna, a próxima análise do mesmo ato desfaz o que o advogado respondeu. O espelho já existe no produto: `Process.meuPoloManual`.
   - O PATCH grava `deQuem` **e** `deQuemManual`.
   - `reconciliarPrazoDoAto` pula a escrita de `deQuem` quando `deQuemManual != null`.
   - `elegibilidade.ts` continua lendo só `deQuem` — nada muda lá.
3. **`djenSyncedUntil` em `GET /users/me`** (`features/users/users.router.ts:55`) — sustenta "DJEN lido até hoje, 21/09". A coluna existe em `OabMonitorada`; o endpoint já busca essa linha para montar `oab`, é um campo a mais no `select`.
4. *(opcional, Fatia 6)* **`ultimoAviso { enviadoEm, status, template }` em `GET /me/whatsapp`** — sustenta "Aviso de hoje enviado às 08:05". `AvisoEnviado` não é exposto por rota nenhuma hoje. **Enquanto não existir, a linha do WhatsApp mostra só "Avisos ativos · <número>"**, que é o que o canvas publica.

### Front (`prototipo-ponto-processual`)

| Novo | Onde | O que faz |
|---|---|---|
| `lib/triagem.ts` | novo | **O cérebro da tela, puro e testável.** Recebe prazos + novidades e devolve `{ veredito[], grupos[], maisAdiante[], soParaSaber[] }`. Regra de entrada na pilha: vencido sem baixa e prazo seu com ≤ 3 dias → `jaProtocolou`; prazo com `deQuem === 'indefinido'` e data → `deQuemE`; novidade que passa em `pedeAcao` → `chegou`. O resto desce. Ordena cada grupo por `dataLimite` asc. |
| `components/dashboard/Veredito/` | novo | `<ul>` de âncoras, 44px por item, `chevron-down`, negrito sublinhado, tinto só no vencido. Conta a partir do retorno de `triagem.ts` — nunca hardcode. |
| `components/dashboard/LinhaDeConfianca/` | novo | "Verificado hoje às HH:MM · N de M processos", DJEN, e a falha nominal. Um `<a href="/status">`. Reutilizável nas duas sugestões. |
| `components/dashboard/CartaoDeTriagem/` | novo | Faixa de tom (distância 20px/800 + data + TribTag + selo `Nova`), corpo (peça `<h3>`, partes, meta) e rodapé de verbos. **Rodapé é `flex` com `flex: 1 1 auto; white-space: nowrap`** — grade de colunas iguais quebra "Ver o que fazer ›". |
| `components/dashboard/ConfirmarDeQuem/` | novo | A folha da Fatia 4. `role="dialog" aria-modal`, véu, os dois botões empilhados com a consequência embaixo de cada um. |
| `components/dashboard/MaisAdiante/` + `SoParaSaber/` | novo | Listas compactas; `<details>` do "Só cartório" com a contagem por tipo no `<summary>`. |
| `app/painel/page.tsx` | reescrita | Passa a buscar `getPrazos`, `getMovimentacoes(1, 50, { novas: true })`, `getTribunaisStatus`, `getUsuarioAtual`, `getCanalWhatsapp` — **sai `getAtividadeDiaria`** (o heatmap morre) e a amostra de 100 processos da composição da carteira. |
| `app/painel/page.module.css` | reescrita | Limpar junto o CSS morto medido: `.hero`/`.heroDias`/`.heroRow` (só existem no `@media ≥768px`), `.syncStrip` e `.coverage` (sem JSX), `.heroNota` (sem padding lateral e com `var(--text-sm)`, token que não existe), e o `margin-bottom: 16px` do `.avisoCanal` que soma ao `gap` do pai. |
| `app/api/ia/carteira/route.ts` | novo (Fatia 6) | Proxy de `GET /ia/carteira` para o panorama do desktop. |

---

## 3. Ordem de implementação

Cada fatia sobe sozinha e é visível na tela. As três primeiras **não tocam no backend**.

### Fatia 1 — o esqueleto que substitui o painel (front puro)
Veredito + linha de confiança + pilha com os grupos 1 e 3 + "Mais adiante" + "Só para saber" + WhatsApp. Os verbos entram como os componentes que já existem (`BaixarPrazo`, `LembrarPrazo`, `MarcarVistas`). O grupo "De quem é este prazo?" já aparece, **em modo leitura**: cartão com a pergunta, o rótulo "Não sabemos de quem é — não avisamos por WhatsApp." e o rodapé `Ver o que fazer ›`.
*Pronto quando:* `/painel` no celular mostra a pilha com dado real da conta do seed e o badge de "Movs" aparece na barra (hoje o painel não passa `movimentacoes` para `BarraInferior`).

### Fatia 2 — `lib/triagem.ts` com teste
Tirar a regra de dentro do `page.tsx` e cobrir com teste de unidade os casos que doem: vencido sem baixa entra sempre; `deQuem === 'parteContraria'` nunca entra na pilha; ato de mera ciência não entra; prazo sem `dataLimite` vai para "Mais adiante" rotulado, nunca some; **teto de 8 cartões por grupo, com o excedente virando linha contada com link** (nunca corte cego — é a fraqueza nº 3 do painel atual).

### Fatia 3 — os estados
- **Pilha zerada** (`Vazia` no canvas): "Nada pede sua ação agora." + prova + "Baixados hoje · N" com `Desfazer` em cada um + a semana sempre visível.
- **Carteira vazia**: as três telas de `/painel` que já existem (`PainelSemOab`, `PainelSincronizando`, `PainelSemResultado`) continuam intocadas, antes da pilha.
- **Desktop** (≥768px): sidebar + veredito 2×2 + pilha em duas colunas + coluna de 360px com "Mais adiante", "Só para saber" e WhatsApp.

### Fatia 4 — o verbo novo: "De quem é este prazo?" ⚠️ **backend**
Migration `deQuemManual` → PATCH aceitando `deQuem` → guarda em `reconciliarPrazoDoAto` → proxy `/api/prazos/[id]` encaminhando o campo → folha `ConfirmarDeQuem`.
*Ordem obrigatória:* a guarda do `reconciliarPrazoDoAto` **antes** de abrir o botão na tela. Ligar a escrita sem ela cria o pior defeito possível — o advogado responde, a próxima análise desfaz, e ninguém vê acontecer.
*Pronto quando:* responder "É da outra parte" tira o prazo da pilha, deixa a linha em "Mais adiante" em tom neutro, e **uma reanálise do mesmo ato não reverte** (testar chamando o job à mão).

### Fatia 5 — `djenSyncedUntil`
Campo no `GET /users/me` e a segunda metade da linha de confiança.

### Fatia 6 — panorama e recibo do aviso (opcional)
Proxy de `/ia/carteira` para o painel do desktop, sempre com o rótulo **"resumo por IA"**. E, se valer a pena, `ultimoAviso` no `/me/whatsapp`.

---

## 4. Regras que a implementação não pode quebrar

Vieram do código e de decisões já tomadas; estão no canvas e precisam sobreviver ao código.

- **"Protocolei" não remove o cartão.** Ele encolhe no lugar para um recibo com "Desfazer" e o contador do grupo desce. É a decisão escrita em `BaixarPrazo.tsx` ("a linha NÃO some quando alguém clica"), e vale para a pilha inteira.
- **Uma régua de cor só, a de 17/09:** tinto ≤ 3 dias ou vencido, âmbar 4–7, verde > 7. Hoje `/prazos` e `/movimentacoes` discordam entre si (7/14 contra 3/7) — quem for implementar escolhe `tomDosDias` e corrige a divergência, não a copia.
- **Dias corridos** no contador ("faltam 3 dias"). "Dias úteis" só dentro da explicação da conta.
- **Cor nunca sozinha:** todo tom vem com texto ("vence hoje", "Venceu há 3 dias", "perde o prazo processual").
- **Nada de métrica de vaidade.** O heatmap de 28 dias, a rosca por natureza, as barras por tribunal e "Valor em causa" **saem** — nenhum muda o que o advogado faz hoje, e no celular custam duas telas de rolagem.
- **A prova é honesta:** "229 de 243 processos" com a falha nominal embaixo, nunca "243 verificados" ao lado de "14 não verificados".
- **Vocabulário:** "aviso" (nunca "notificação"), "conclusos" (nunca "concluído"), "juntada" (nunca "anexo"), "Protocolei" (nunca "Baixar"), "pede sua ação" (nunca "para decidir" — quem decide é o juiz). Data sem ponto: "qui, 24 set". `≈` **depois** da data quando ela é calculada por nós.
- **Pisos do celular:** 44px de alvo, 16px em campo, fonte ≥ 11px, `overflow-x: clip` (não `hidden`) — já estão no `globals.css`; nenhuma tela nova os redescobre.

---

## 5. Decisões que são do dono

1. **A folha "De quem é" existe?** É o que diferencia B de A e é a única dependência de backend. Sem ela, B ainda funciona — o cartão vira leitura e manda para o ato.
2. **"É da outra parte" some do celular?** O risco assimétrico está escrito em `situacao-do-ato.ts`: *"dispensar o que é seu é o erro caro, e a dúvida erra para cedo"*. O canvas já põe esse botão **só dentro da folha**, nunca no rodapé do cartão, com "dá para desfazer" declarado embaixo. Vale confirmar que é suficiente.
3. **"Lembrar" fica onde?** `LembrarPrazo` descarta opção que cai no passado (`if (data < hoje) return null`), então em prazo vencido, de hoje ou de amanhã o menu abre **vazio**. O canvas tirou o verbo desses três casos. A alternativa é oferecer "amanhã de manhã" como quarta opção — mas isso é código novo no componente.
4. **O lembrete que cai hoje aparece onde?** O canvas o mostra como cartão âmbar "Você pediu para lembrar hoje". Hoje `/painel` não lê `lembrarEm`, e o comentário do schema promete que o prazo "sobe para a faixa 'esta semana' do painel" — promessa em aberto desde 17/09.
5. **O painel some com o heatmap e a carteira?** Se o dono quiser manter a composição da carteira, ela volta como **bloco do desktop**, nunca na primeira dobra do celular.

---

## 6. Como medir antes de dizer que está pronto

O teste que importa não é o `tsc` — ele não valida `where`/`select` do Prisma, e `grep | head` já escondeu quebra aqui.

1. **Playwright do backend** (`backend-movijus/node_modules/playwright`, `chromium.launch({ channel: 'chrome' })`), logando com um advogado do seed em `localhost:3001`, visitando `/painel` a **390px e 360px**. Medir: elemento fora da janela, `scrollWidth > clientWidth` (descontando faixas com `overflow-x: auto`), alvo < 44px, campo com fonte < 16px, texto < 11px. Falso positivo conhecido: `<details>` fechado.
2. **A primeira dobra**: o rodapé do cartão do prazo que vence hoje tem de terminar **acima de y = 788px** em 390×844. É o critério que o canvas cumpre.
3. **Contraste** dos pares em uso — os do canvas foram medidos e passam: `#991b1b`/`#fae5e5` 6,9:1 · `#92400e`/`#fef3c7` 6,4:1 · `#fff`/`#166534` 7,1:1 · `#14532d`/`#dcf0e3` 7,6:1 · `#56655a`/`#eef2ef` 5,5:1.
4. **Conta com carga real**: 25 prazos na semana e 40 novidades no dia. É onde o teto de 8 cartões e as linhas contadas provam que não viraram rolagem infinita.
5. **iPhone de verdade**, via ngrok, para a rolagem e o sticky — o WebKit do Mac acerta regra de CSS, não a rolagem do iOS.

---

## 7. Riscos

| Risco | Onde aparece | Como evitar |
|---|---|---|
| A IA desfazer a resposta do advogado | `reconciliarPrazoDoAto` escreve `deQuem: destinatario` | `deQuemManual` **antes** de abrir o botão (Fatia 4) |
| A pilha nunca zerar | 119 de 203 prazos eram `indefinido` em 06/09 | teto por grupo + linha contada; "Mais adiante" sempre visível, não condicionada a zerar |
| "Marcar vistas" levar junto o que pede ação | a marca d'água é única (`movimentacoesVistasAte`) | nota literal sob o botão: "Os prazos que elas abriram continuam na pauta." |
| Toque errado em "Protocolei" no corredor | pilha densa, polegar | o recibo com "Desfazer" fica no lugar até a próxima carga — já é o comportamento do componente |
| Prazo sem `dataLimite` sumir | `dataLimite` nulo é estado válido | cai em "Mais adiante" rotulado "sem data definida", nunca filtrado fora |
| Divergência de régua de cor entre telas | `/prazos` 7/14 × `/movimentacoes` 3/7 | unificar em `tomDosDias` na Fatia 2, com teste |
