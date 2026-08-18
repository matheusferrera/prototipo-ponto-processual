# Landing page `/home` — estilo Tennr, conteúdo Ponto Processual

Referência: https://www.tennr.com (reconhecido via Chrome em 2026-08-18).
Tennr vende orquestração de pacientes para operações de saúde ("agentic patient
orchestration"). Adaptamos a mesma anatomia de página e o mesmo tom editorial
para advogados/escritórios que usam o Ponto Processual (monitoramento de
processos + alertas via WhatsApp).

## O que foi extraído do Tennr (estilo, não conteúdo)

- **Tipografia**: serif leve para headlines (`featureDisplayLight`, peso 300,
  ~64px no hero) + mono tracked em maiúsculas para "eyebrows"/rótulos de seção
  (`abcMarfaMonoNormal`, letter-spacing ~0.18em) + sans para corpo/botões
  (`abcMarfaRegular`). **Isso já bate com o projeto**: JetBrains Mono cobre o
  papel do mono tracked, Manrope cobre o sans. Só falta a serif — usamos
  **Fraunces** (peso 300) via `next/font/google` como equivalente livre.
- **Paleta**: gradiente de seção em seção (não flat) — hero em tom saturado,
  seções intermediárias clareando, footer no tom mais escuro da paleta.
  Adaptado para o verde-gelo do projeto: hero em `--brick-deep`, seções em
  `--paper` → `--paper-2` → `--paper-3`, footer em `--brick-deep`/`--ink`.
- **Botões**: retângulo reto (`border-radius: 0`, já é a regra do projeto),
  texto tracked maiúsculo, sem sombra.
- **Cards**: fundo sólido, borda reta, sombra "sticker" deslocada (offset
  bottom-right), sem radius — combina com a regra "zero border-radius" do
  design system.
- **Decoração recorrente**: um motivo geométrico repetido (raios/dobras no
  Tennr) usado como textura de fundo em hero e footer. Adaptamos para um
  padrão de linhas diagonais discretas usando `--line`/`--brick-soft`.
- **Anatomia da página**: nav fixa → hero → resumo → 3 pilares de resultado →
  prova social (logos) → narrativa de produto (texto + lista) → depoimentos →
  grid de 5 features → casos de uso → selos de confiança → CTA final → footer
  escuro com colunas de link.
- **O que NÃO foi copiado**: não replicamos scroll-jacking/pin de seção nem
  logos de imprensa e depoimentos fabricados como se fossem reais — ver notas
  abaixo.

## Notas de honestidade de conteúdo

- A seção "Trusted nationwide" do Tennr virou **"Cobrimos os tribunais que
  importam"** — uma grade com as siglas dos sistemas/tribunais que o robô do
  Ponto Processual realmente acessa (PJe, e-SAJ, Projudi, CPE, TJSP, TJRJ,
  TJRN, TJPI, TRF, STJ, TST), em vez de logos de clientes fictícios.
- A seção de imprensa ("Fortune, Forbes...") foi **substituída** por uma
  seção de segurança/conformidade (LGPD, sigilo profissional) — publicar
  logos de veículos de imprensa que nunca cobriram o produto seria enganoso.
- Os depoimentos são **ilustrativos** (primeiro nome + cargo genérico, sem
  nome de escritório), no mesmo espírito de "placeholder" que qualquer
  landing page pré-lançamento usa — trocar por depoimentos reais antes de
  publicar para o público.
- Os "casos de uso" descrevem cenários genéricos (ex.: "escritório
  trabalhista"), não empresas reais.

## Tópicos da página (conteúdo final em PT-BR)

### 1. Nav
`Produto` · `Como funciona` · `Depoimentos` · `Segurança` — CTA primário
`COMEÇAR AGORA` (→ `/cadastro`), CTA secundário `ENTRAR` (→ `/login`).

### 2. Hero
- Eyebrow: `PROCESSO CERTO. PRAZO CERTO. SEMPRE.`
- H1: **Fique à frente de cada prazo**
- Subhead: "Ponto Processual é uma plataforma de monitoramento agêntico
  construída para escritórios que não podem errar prazo. Acompanhamos seus
  processos em todos os tribunais, decodificamos cada movimentação e
  avisamos você no WhatsApp — antes que vire prejuízo."
- CTA: `VER COMO FUNCIONA`

### 3. Em resumo
- Eyebrow: `EM RESUMO`
- H2: **Com o Ponto Processual, nenhum prazo escapa**
- Corpo: "Tome decisões operacionais inteligentes em cada movimentação,
  prazo ou intimação. Robôs que leem PJe, e-SAJ, Projudi e CPE — e traduzem
  juridiquês em alerta acionável."

### 4. O resultado (3 pilares)
- Eyebrow: `O RESULTADO`
- H2: **Sem prazo perdido. Menos risco. Processos sob controle.**
- Corpo: "O Ponto Processual processa e organiza automaticamente cada
  movimentação para que escritórios de alta performance nunca sejam pegos
  de surpresa."
- Cards:
  1. **Leia cada movimentação automaticamente** — Elimine a fricção de
     acompanhar manualmente publicações, intimações e despachos em dezenas
     de tribunais diferentes.
  2. **Elimine o prazo perdido** — Transforme o calendário processual em
     alertas automáticos. Priorize o que importa e evite prejuízo ao
     cliente.
  3. **Feche o ciclo com seu cliente** — Mantenha clientes informados pelo
     WhatsApp, sem ligação manual nem planilha de controle.
- CTA: `CONHEÇA O PRODUTO`

### 5. Cobertura (prova social)
- Eyebrow: `ONDE ATUAMOS`
- H2: **Cobrimos os tribunais que importam**
- Corpo: "De bancas grandes a advogados autônomos, monitoramos processos em
  sistemas de todo o país, todos os dias."
- Grade/marquee: PJe · e-SAJ · Projudi · CPE · TJSP · TJRJ · TJRN · TJPI ·
  TRF · STJ · TST · TJMG

### 6. Narrativa de produto
- Eyebrow: `MANTENHA SEUS PRAZOS EM DIA`
- H2: **Prazos monitorados, sempre atualizados**
- Parágrafos:
  1. "O Ponto Processual classifica e organiza automaticamente movimentações
     de qualquer tribunal — PJe, e-SAJ, Projudi, CPE — direto para o
     processo certo."
  2. "Onde a movimentação muda um prazo, o calendário é atualizado
     automaticamente."
  3. "O robô verifica novas publicações e intimações a cada ciclo de
     sincronização, 24 horas por dia."
  4. "O status de cada processo e a proximidade do prazo definem as
     recomendações e alertas do Ponto Processual."
  5. "No fim, toda essa informação move você e sua equipe mais rápido,
     evitando prejuízo e liberando tempo para o que importa: a advocacia."

### 7. Depoimentos (ilustrativos)
- Eyebrow: `DEPOIMENTOS`
- H2: **O que dizem os escritórios**
- 3 citações curtas + primeiro nome/cargo genérico (trocar por reais antes
  de publicar).

### 8. Excelência operacional (grid de 5)
- Eyebrow: `EXCELÊNCIA OPERACIONAL`
- H2: **O Ponto Processual eleva o padrão da advocacia**
- Sub: "Escritórios líderes trabalham mais rápido, cometem menos erros e
  crescem com menos esforço operacional."
- Cards:
  1. **Movimentações no piloto automático** — publicações em PDF, print de
     tela e diário oficial, lidas mais rápido que o estagiário mais
     dedicado — e sem cansar.
  2. **Nunca perca um prazo por falta de informação** — identificamos o que
     está pendente em cada processo, avisamos a pessoa certa e acompanhamos
     até resolver.
  3. **Triagem inteligente de tribunal e credencial** — detectamos mudança
     de vara ou instância cedo e reverificamos credenciais automaticamente.
  4. **Alertas integrados no WhatsApp** — chega de checar sistema de
     tribunal toda manhã; alerta e acompanhamento em um só lugar.
  5. **Uma torre de controle para toda a carteira** — veja o que está
     parado, o que precisa de ação hoje e o que impacta prazos críticos.
- CTA: `COMEÇAR AGORA`

### 9. Casos de uso (genéricos)
- Eyebrow: `CASOS DE USO`
- H2: **Como escritórios usam o Ponto Processual**
- Cards: "Escritório trabalhista reduz 80% do tempo de triagem de
  movimentações" · "Banca previdenciária monitora 3x mais processos com a
  mesma equipe" · "Advogado autônomo nunca mais perde prazo desde que
  automatizou os alertas"

### 10. Segurança e conformidade
- Eyebrow: `SEGURANÇA`
- H2: **Feito para lidar com dados sob sigilo**
- Selos: LGPD · Sigilo profissional protegido · Criptografia em trânsito e
  em repouso

### 11. CTA final
- Eyebrow: `VAMOS TRABALHAR JUNTOS`
- H2: **Nenhum prazo perdido. Só resultado.**
- CTA: `COMEÇAR AGORA` (→ `/cadastro`)

### 12. Footer
Colunas: Produto (Processos, Prazos, WhatsApp) · Empresa (Sobre, Contato) ·
Legal (Privacidade, Termos). Selos LGPD/sigilo. Wordmark "Ponto Processual".

## Implementação

- Rota nova: `src/app/home/page.tsx` + `page.module.css` (pública).
- `src/middleware.ts`: `/home` adicionado a `PUBLIC_ROUTES`.
- Fonte serif: Fraunces 300, carregada só nesta rota (`src/app/home/fonts.ts`).
- Zero componente do dashboard é tocado; `/` continua sendo o app logado.
