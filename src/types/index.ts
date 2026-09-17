export type StatusType = 'signal' | 'quiet' | 'alert';

/**
 * De onde a linha do tempo veio — espelha `OrigemMovimento` da API.
 *
 * `djen` não é um movimento do tribunal: é a **publicação** do ato no Diário
 * de Justiça Eletrônico Nacional, e desde 03/09/2026 é ela que faz a linha do
 * tempo pública inteira.
 *
 * `datajud` continua no union por ser LEGADO, não por ser produzido: desde a
 * mesma data ele enriquece só a CAPA do processo (classe, assunto, autuação,
 * grau) e não grava mais movimentação. Numa carteira real rendia 818 linhas
 * contra 29 do DJEN, e 75% delas eram trâmite de cartório ("Recebimento",
 * "Conclusão", "Remessa") sem texto do ato — para o mesmo despacho o DJEN dava
 * uma linha nomeada com o inteiro teor e o DataJud dava três de serventia.
 * Linhas gravadas antes disso ainda chegam da API, então tirá-lo do tipo faria
 * a tela quebrar num dado que existe.
 */
export type OrigemMovimentacao = 'scraper' | 'tribunalPublico' | 'datajud' | 'djen' | 'pdpj';

/**
 * A que serve a movimentação — o eixo que separa o que se lê do que o cartório
 * registra. Vem de `Movement.categoria` no backend.
 *
 * Existe por uma medição: metade da movimentação pública é `tramite`
 * ("Juntada de certidão", "Recebidos os autos", "Conclusos"), e numa página de
 * vinte linhas treze eram isso. **A API esconde `tramite` por padrão**; a tela
 * oferece o filtro para trazê-lo de volta.
 *
 * `null` em linha gravada antes da classificação existir.
 */
export type CategoriaMovimentacao = 'decisorio' | 'atoDeParte' | 'publicacao' | 'prazo' | 'tramite';

/** O que perder o prazo custa. */
export type RiscoPrazo = 'preclusao' | 'perdaDeDireito' | 'revelia' | 'multa' | 'nenhum';

/**
 * A leitura do ato pela IA. Só a origem `djen` traz o inteiro teor, logo só ela é analisada.
 *
 * **Fundida com "o que produzir até a data" desde `<data>`** — antes essa
 * metade só existia depois de um `Deadline` ser analisado à parte
 * (`POST /deadlines/{id}/analise`, hoje removida). Agora `peca`,
 * `checklist`, `documentosNecessarios`, `risco`, `complexidade` e
 * `precisaDosAutos` chegam sempre junto, mesmo em mera ciência (`peca: null`,
 * checklist de conferência).
 */
export interface LeituraIa {
  /** O que o juízo decidiu, em linguagem humana. */
  resumo: string | null;
  /**
   * De onde saiu o número de dias — o dispositivo legal, ou o próprio ato.
   *
   * É o que separa "15 dias" de "15 dias porque o art. 1.003, § 5º, do CPC
   * manda". Sem a procedência a tela pede confiança cega num número, e a
   * conferência custa uma ida ao tribunal.
   */
  fundamento: string | null;
  /**
   * `alta` | `media` | `baixa` — quanto o modelo confia na própria leitura.
   *
   * A tela usa isto para PEDIR CONFERÊNCIA em vez de afirmar. `baixa` sai
   * quando o ato chegou sem dispositivo, e esconder isso é apresentar palpite
   * como fato num campo que o advogado usa para não perder prazo.
   */
  confianca: string | null;
  deQuem: 'destinatario' | 'parteContraria' | 'terceiro' | 'indefinido' | null;
  analisadoEm: string | null;
  /** A providência que o ato cobra e seu efeito, 2-3 frases. `null` = ainda não lido. */
  oQueFazer: string | null;
  /** Nome técnico da peça a produzir — "contrarrazões de apelação". `null` quando é só ciência. */
  peca: string | null;
  /** Ações verificáveis — "conferir a data de juntada do AR". */
  checklist: string[];
  /** O que falta obter ou juntar para a peça existir. */
  documentosNecessarios: string[];
  risco: RiscoPrazo | null;
  complexidade: 'baixa' | 'media' | 'alta' | null;
  /** Dá para redigir só com o ato, ou é indispensável abrir o processo? */
  precisaDosAutos: boolean;
  /** Quando o ato diverge do que foi informado (dias, de quem). Nunca muda a data. */
  observacao: string | null;
}

/**
 * O prazo que ESTE ato abriu — no máximo um, e só quando abre.
 *
 * `null` na movimentação é a resposta comum e correta: mera ciência, pauta e
 * ata não abrem prazo, e eram 46% dos atos numa medição real.
 */
/**
 * A CONTA DO VENCIMENTO, aberta — os quatro marcos que a produzem.
 *
 * É a mesma cadeia que o CNJ imprime no rodapé de toda certidão de publicação:
 * disponibilização → publicação (1º dia útil seguinte, Lei 11.419 art. 4º § 3º)
 * → início da contagem (o dia útil seguinte, § 4º e CPC 224) → vencimento.
 *
 * **Só vem no detalhe** (`GET /movements/{id}`), e `null`/ausente é comum e
 * correto. O backend recusa explicar em quatro casos, todos deliberados:
 * origem `painel`/`grid` (o vencimento é do TRIBUNAL, não há conta nossa a
 * abrir), sem disponibilização, sem dias declarados, e quando o recálculo não
 * reproduz a data gravada. Neste último a tela mostra a data sozinha — uma
 * cadeia terminando num dia com o chip mostrando outro seria a tela se
 * desmentindo no campo em que errar custa o prazo.
 *
 * Datas em `dd/mm/yyyy`, como o backend as calcula.
 */
export interface CadeiaDoPrazo {
  disponibilizadoEm: string;
  publicadoEm: string;
  inicioEm: string;
  /** Igual a `dataLimite` — é o que a guarda do backend garante. */
  venceEm: string;
  contagem: 'uteis' | 'corridos';
  dias: number;
}

export interface PrazoDoAto {
  id: string;
  /** ISO. Vazio quando o texto não declarou os dias — prazo sem data é estado válido. */
  dataLimite: string | null;
  /** Dias declarados no ato. */
  dias: number | null;
  natureza: 'ciencia' | 'manifestacao' | null;
  /**
   * COMO a data foi obtida. Só `textoExplicito` é o ato dizendo; os demais são
   * cálculo nosso, e a tela precisa poder dizer isso em vez de apresentar
   * estimativa como vencimento oficial do tribunal.
   */
  metodoPrazo: 'textoExplicito' | 'prazoLegal' | 'padraoCpc218' | 'cienciaPublicacao' | 'analiseIa' | null;
  fechado: boolean;
  /** De onde o PRAZO veio. `djen` e `tribunalPublico` são cálculo; `painel`/`grid` é o tribunal. */
  origem?: 'painel' | 'grid' | 'djen' | 'tribunalPublico' | null;
  /** Diário (ciência na publicação) ou portal (ciência no dia da expedição — a mais cedo possível). */
  canal?: 'diario' | 'portal' | null;
  /**
   * De quem é o prazo, no ato do tribunal. `indefinido` merece um "a confirmar"
   * na tela: está na agenda, mas ninguém afirmou que é do usuário.
   */
  deQuem?: 'destinatario' | 'parteContraria' | 'indefinido' | null;
  emDobro?: boolean | null;
  /** O dispositivo que sustenta o número — "apelação — CPC, art. 1.003, § 5º". */
  fundamento?: string | null;
  /** A publicação que fez o prazo correr — o marco, não a data do ato. */
  publicadoEm?: string | null;
  /** A parte intimada, como o ato a nomeia. */
  parte?: string | null;
  /** A ciência foi registrada pelo sistema, não pelo intimado. */
  cienciaFicta?: boolean | null;
  /** O lembrete marcado neste prazo — o mesmo de `Prazo.lembrarEm`. */
  lembrarEm?: string | null;
  /** A conta do vencimento, aberta — ver `CadeiaDoPrazo`. Só no detalhe. */
  cadeia?: CadeiaDoPrazo | null;
}

/**
 * O prazo do PROCESSO que já estava correndo quando este ato aconteceu.
 *
 * **Não confundir com `PrazoDoAto`**, que é o prazo que este ato ABRIU. Os dois
 * convivem na mesma linha e respondem perguntas opostas:
 *
 * | | pergunta | quando é `null` |
 * |---|---|---|
 * | `prazo` | este ato abriu prazo? | 46% dos atos (ciência, pauta, ata) |
 * | `prazoEmCurso` | este ato caiu dentro de um prazo meu? | 169 dos 180 processos medidos |
 *
 * É a ligação que faltava para acompanhar a movimentação **no decorrer do
 * prazo**: sem ela, achar no feed o que toca um prazo aberto é varrer 370
 * páginas (18.485 movimentações) atrás dos eventos de 11 processos.
 */
export interface PrazoEmCurso {
  id: string;
  /** O rótulo do cartório — "Despacho", "Intimação". */
  tipoDocumento: string;
  /** A peça que a IA nomeou ("Contestação"). `null` quando o prazo não foi lido. */
  peca: string | null;
  natureza: 'ciencia' | 'manifestacao' | null;
  metodoPrazo: PrazoDoAto['metodoPrazo'];
  /** ISO. `null` enquanto o tribunal não calculou. */
  dataLimite: string | null;
  /** Dias DECLARADOS no ato — pode ser em dias úteis. Não é `totalDias`. */
  dias: number | null;
  /** ISO — onde o fio começa: a disponibilização no diário, ou o próprio ato. */
  inicioEm: string;
  /**
   * A janela em dias de CALENDÁRIO entre `inicioEm` e `dataLimite`.
   *
   * Um prazo de 15 dias úteis dá 21 aqui. É esta a janela que a barra desenha —
   * e é por isso que a tela nunca escreve "dia 13 de 15" a partir dela: o
   * numerador e o denominador seriam de contagens diferentes. `null` sem
   * `dataLimite`: a faixa mostra o nome do prazo e não desenha barra.
   */
  totalDias: number | null;
  decorridos: number | null;
  /** Dias até vencer. **Negativo quando já venceu** — o prazo aberto e vencido. */
  restam: number | null;
  /** Esta linha É o ato que abriu o prazo — o primeiro do fio. */
  abriuEsteAto: boolean;
  /**
   * Movimentações do processo dentro da janela, **sem o ato que a abriu**.
   *
   * Só vem em `GET /movements/{id}`: `null` significa "não foi contado" (a
   * listagem não conta), que é diferente de `0` — "nada aconteceu desde que o
   * prazo abriu", o caso de 5 dos 11 prazos abertos medidos.
   */
  novas?: number | null;
}

export interface Movimentacao {
  /**
   * Ainda não vista por esta conta — derivado no backend contra a marca
   * d'água `User.movimentacoesVistasAte`.
   *
   * **Não é o mesmo que `state: 'signal'`**, que fala de publicação recente:
   * um ato de 2024 que chega hoje pelo backfill é NOVIDADE para quem
   * acompanha, e não é recente.
   */
  naoVista?: boolean;
  id: string;
  tribunal: string;
  cnj: string;
  orgaoJulgador: string;
  parte: string;
  assunto: string;
  tipo: string;
  detail: string;
  /**
   * `HH:MM` do ato. **Ausente quando o ato só tem data** — a publicação no
   * diário é assim: o DJEN publica numa data, não num horário, e mostrar
   * "00:00" (ou, pior, "21:00" depois de um fuso aplicado por engano) inventa
   * precisão que o dado não tem.
   */
  time?: string;
  state: StatusType;
  origem: OrigemMovimentacao;
  /**
   * Todas as fontes que confirmaram ESTE ato. Com mais de uma, o ato foi visto
   * por duas — é o caso do mesmo despacho que sai no diário e aparece na linha
   * do portal. `[]` em linha anterior ao carimbo.
   */
  fontes?: string[];
  /** A que serve o ato. `null` em linha anterior à classificação. */
  categoria: CategoriaMovimentacao | null;
  /** Todos os campos `null` quando a IA não rodou — caminho degradado, não erro. */
  ia: LeituraIa;
  /** O prazo que este ato abriu. `null` na maioria — a maioria dos atos não abre. */
  prazo: PrazoDoAto | null;
  /**
   * O prazo do processo que JÁ CORRIA quando este ato aconteceu — ver
   * `PrazoEmCurso`. `null` é o caso comum. Ausente em backend anterior a
   * 15/09/2026, e aí a linha volta a ser exatamente o que era.
   */
  prazoEmCurso?: PrazoEmCurso | null;
  /**
   * O ato ÍNTEGRO, em texto plano. **Só vem no detalhe** — a listagem o omite
   * no banco, porque a média é de 3,8 KB e o maior medido tem 288 KB.
   * `undefined` = não foi pedido; `null` = este ato não tem texto.
   */
  textoOriginal?: string | null;
  /**
   * **Há TEXTO do ato** — o que o diário publicou ou o que se extraiu do PDF.
   *
   * Só isso. Até 08/09/2026 este campo respondia "há algo pra abrir", fundindo
   * texto com documento anexado, e por isso a linha dizia "Com inteiro teor"
   * para ato que só tinha um PDF sem texto. São dois fatos independentes e
   * agora têm dois sinais — ver `documentoEstado`.
   */
  temInteiroTeor?: boolean;
  /**
   * **Há DOCUMENTO, e o que esperar dele** — calculado pelo backend
   * (`estadoDocumento`), que é a única camada que enxerga o livro-razão da
   * aquisição: quais chaves já foram pedidas ao portal e voltaram sem arquivo.
   *
   * `trancado` é bloqueio DECLARADO pelo tribunal (abre quando liberarem);
   * `provavelIndisponivel` é medição nossa (404 registrado, ou o rótulo
   * genérico do PDPJ). Confundir os dois faz a tela prometer que um arquivo
   * inexistente vai abrir depois.
   */
  documentoEstado?: 'nenhum' | 'disponivel' | 'provavelIndisponivel' | 'trancado';
  /**
   * **Há CERTIDÃO DE PUBLICAÇÃO** — o PDF oficial do CNJ, com cabeçalho do
   * tribunal, destinatário, advogados com OAB e o teor integral. É o que se
   * junta aos autos para demonstrar tempestividade.
   *
   * Verdadeiro em 100% dos atos de origem `djen` (o `hash` vem em toda
   * comunicação) e falso nas demais. Distinto de `documentoEstado`, que é a
   * PEÇA anexada ao ato: um despacho do diário não tem peça e tem certidão.
   */
  temCertidao?: boolean;
  /**
   * **O `link` do ato serve o documento**, e não uma página com captcha.
   * Depende do tribunal: no STJ o link é o PDF; no PJe é a `ConsultaDocumento`
   * com hCaptcha, e aí isto é falso. Quem entrega o arquivo é a rota
   * autenticada — a chave nunca chega ao browser.
   */
  temDocumentoDoAto?: boolean;
  /**
   * `hoje` · `ontem` · `15 set` — o dia do ato em uma palavra, para a linha
   * que NÃO está debaixo de um cabeçalho de dia (a aba Novas agrupa por
   * processo). Montado no servidor, em wall-clock de Brasília.
   */
  quandoCurto?: string;
}

export interface MovimentacaoGroup {
  /**
   * `AAAA-MM-DD` — a chave do dia. É ela que deixa o "carregar dias
   * anteriores" emendar a página 2 no mesmo cabeçalho quando o dia continua.
   */
  chave?: string;
  date: string;
  day: string;
  items: Movimentacao[];
}

export interface ProcessoParte {
  nome: string;
  /** advogados/representantes da parte (o que o scraper persiste em `Parte.representantes`) */
  representantes: string[];
  documento?: string | null;
  tipo?: string | null;
}

/** Prazo aberto mais próximo do vencimento, resumido para a carteira. */
export interface ProximoPrazo {
  id: string;
  tipo: string;
  parte: string | null;
  /** vencimento em ISO */
  dataLimite: string;
  /** dias corridos até o vencimento — 0 = vence hoje, negativo = vencido */
  diasRestantes: number;
}

/**
 * A leitura do CASO pela IA — a síntese do processo inteiro.
 *
 * Não confundir com a leitura do ATO (`Movimentacao.ia`): aquela responde "o
 * que aconteceu nesta linha", esta responde "onde este processo está". Ela é o
 * topo da pirâmide e consome os resumos dos atos já pagos, em vez de reler o
 * acervo — ver `ia/tipos/processo.ts` no backend.
 */
export interface AnaliseDoCaso {
  /** Três a cinco frases: do que se trata, entre quem, e como está. */
  sintese: string;
  fase: 'conhecimento' | 'instrucao' | 'sentenciado' | 'recursal' | 'execucao' | 'arquivado' | 'indefinido';
  /** Uma a duas frases sobre o estado de agora. `''` quando a IA não afirmou. */
  situacao: string;
  pedidoPrincipal: string | null;
  ultimaDecisao: { resumo: string; data: string } | null;
  pendencias: string[];
  /** O que o JUÍZO tende a fazer pelo rito — não é conselho nem previsão. */
  proximoPassoProvavel: string | null;
  pontosDeAtencao: string[];
  confianca: 'alta' | 'media' | 'baixa';
  /** Quando a análise foi produzida. */
  atualizadaEm: string | null;
}

export interface Processo {
  id: string;
  /** A síntese do caso pela IA. `null` quando ninguém pediu a análise ainda. */
  analiseCaso?: AnaliseDoCaso | null;
  tribunal: string;
  cnj: string;
  orgaoJulgador: string;
  parte: string;
  /** De que lado eu estou. Ver `MeuPolo` — `indefinido` nunca vira "ativo". */
  meuPolo?: MeuPolo;
  /** As partes que citam a minha OAB — o cliente. */
  cliente?: string[];
  /** As partes do outro lado. */
  parteContraria?: string[];
  /** A resposta do advogado, quando houve. `null` = ainda não respondeu. */
  meuPoloManual?: PoloManual | null;
  materia: string;
  assunto?: string;
  classeJudicial?: string;
  grau: string;
  /** De onde este processo veio: `scraper` (robô autenticado) ou `djen` (descoberta pública). */
  origem: 'scraper' | 'djen' | '';
  ultimaMov: string;
  state: StatusType;
  status: string;
  whatsEnabled: boolean;
  poloAtivo: ProcessoParte[];
  poloPassivo: ProcessoParte[];
  valorCausa: number | null;
  autuadoEm: string | null;
  lastMovAt: string | null;
  lastScrapedAt: string | null;
  syncStatus: string | null;
  syncError: string | null;
  link?: string | null;
  /** total de movimentações persistidas */
  movimentacoesCount: number;
  /** prazos não fechados e não vencidos */
  prazosAbertos: number;
  proximoPrazo: ProximoPrazo | null;
}

/** Documento anexado a uma movimentação. */
export interface DocumentoMovimentacao {
  nDocumento?: string;
  tribunal?: string;
  nome: string;
  url: string;
  /** Explicação visível quando o documento foi identificado, mas não há link utilizável. */
  indisponibilidade?: string;
  /**
   * O botão existe, mas a chance de ele não abrir é alta — e isso é MEDIDO,
   * não palpite. O PDPJ rotula a peça como `'Documento'` quando não sabe
   * classificá-la, e a sondagem ao vivo (08/09/2026) achou 404 em 3 de 3; no
   * acervo inteiro, 195 de 309 pedidos de arquivo voltaram sem nada.
   *
   * Diferente de `indisponibilidade`, que é o tribunal DECLARANDO o bloqueio.
   * Aqui ninguém declarou nada: nós é que já tentamos e não veio arquivo.
   */
  provavelIndisponivel?: boolean;
}

export interface TimelineEvent {
  id: string;
  /** Dia e mês — `"24 set"`. O ano vem separado em `ano`. */
  date: string;
  /**
   * O ano do ato — `"2026"`, sempre presente.
   *
   * Campo próprio, e não colado em `date`, porque a timeline o empilha numa
   * segunda linha sob o dia: junto na mesma string, a quebra ficava por conta
   * da largura do flex, e bastava a coluna mudar de tamanho para umas linhas
   * quebrarem e outras não.
   */
  ano: string;
  /** `YYYY-MM-DD` em Brasília — a chave que agrupa os atos sob um cabeçalho. */
  dia: string;
  /**
   * O rótulo curto do cabeçalho de dia — `"HOJE"`, `"ONTEM"`, `"6 AGO 2026"`.
   *
   * Sai do MESMO `formatDateGroup` que monta o cabeçalho do feed de
   * `/movimentacoes`, para as duas listas nomearem o dia do mesmo jeito. A
   * diferença é o ANO, que entra aqui porque a linha do tempo de um processo
   * atravessa anos — o acervo tem ato de 2020 ao lado de ato de 2026 — e "6
   * AGO" sozinho obriga a inferir de qual deles se fala pela posição na lista.
   */
  dataCurta: string;
  /** O dia da semana (`"quinta"`), ou `DD.MM` quando o rótulo é HOJE/ONTEM. */
  diaSemana: string;
  time?: string;
  title: string;
  body?: string;
  /** número do movimento no tribunal; sem ele, a posição na timeline */
  n: string;
  rawDate?: string;
  documentos: DocumentoMovimentacao[];
  origem?: OrigemMovimentacao;
  /** Fontes que confirmaram este ato — ver `Movimentacao.fontes`. */
  fontes?: string[];
  /** A que serve o ato — ver `CategoriaMovimentacao`. */
  categoria?: CategoriaMovimentacao | null;
  /** Leitura do ato pela IA — só existe na origem `djen`. */
  ia?: LeituraIa;
  /**
   * Há certidão de publicação deste ato.
   *
   * É a peça que faltava para a aba de documentos do processo: `documentos`
   * acima vem de `Movement.documentos`, que **só o scraper autenticado
   * preenche** — numa carteira 100% DJEN a aba mostrava "nenhum documento
   * extraído das movimentações" para um acervo inteiro que TEM documento, só
   * que por outra via.
   */
  temCertidao?: boolean;
  /**
   * Ver `Movimentacao.temDocumentoDoAto` — o mesmo sinal, na timeline do
   * processo. Sem ele, a linha do tempo é a única lista do produto que não
   * consegue oferecer o PDF do ato quando o tribunal o serve pelo link do DJEN.
   */
  temDocumentoDoAto?: boolean;
  /** Ver `Movimentacao.temInteiroTeor` — o mesmo sinal, na timeline do processo. */
  temInteiroTeor?: boolean;
  /** Ver `Movimentacao.documentoEstado` — o mesmo sinal, na timeline do processo. */
  documentoEstado?: 'nenhum' | 'disponivel' | 'provavelIndisponivel' | 'trancado';
  prazo?: PrazoDoAto | null;
  /**
   * Ver `Movimentacao.prazoEmCurso`. Na timeline do PROCESSO ele é ainda mais
   * direto do que no feed: aqui todas as linhas são do mesmo caso, então a
   * faixa marca exatamente o trecho da timeline que corre dentro de um prazo.
   */
  prazoEmCurso?: PrazoEmCurso | null;
}

/**
 * Natureza do prazo. No PJe a grid de expedientes tem uma coluna de data só,
 * "Data limite prevista para ciência ou manifestação" — quem separa as duas é o
 * backend, a partir do texto do ato. Ver `naturezaDoAto` na API.
 */
export type NaturezaPrazo = 'ciencia' | 'manifestacao';

/**
 * O ato que abriu o prazo, do ponto de vista de quem está olhando o PRAZO —
 * o mesmo recorte que `GET /movements/{id}` serve, só que já embutido na
 * resposta de `/deadlines` (sem custo de requisição extra). `null` quando o
 * prazo não tem ato gravado (origem `painel`/`grid`).
 */
export interface AtoDoPrazo {
  id: string;
  ia: LeituraIa;
  /**
   * Origem e categoria do ato — necessárias para `podeLerComIa` decidir se o
   * botão "Ler este ato com IA" (`LeituraDoAto`) aparece na pauta de prazos.
   * Ausentes só em resposta de um backend anterior a `<data>`.
   */
  origem?: OrigemMovimentacao | null;
  categoria?: CategoriaMovimentacao | null;
  /** As peças anexadas ao ato — já com `url` resolvida (proxy ou link do tribunal). */
  documentos: DocumentoMovimentacao[];
  /** Há certidão de publicação — o PDF oficial do CNJ, sem chave exposta. */
  temCertidao: boolean;
  /** O link do PJe, só quando ele NÃO é o documento (`ConsultaDocumento`, com hCaptcha). */
  link: string | null;
}

/**
 * De que lado do processo o advogado está.
 *
 * Derivado no backend cruzando a OAB da conta com os representantes de cada
 * parte (`shared/processos/meu-polo.ts`) — não é cadastro. `indefinido` é
 * resposta legítima e frequente: em ~30% do acervo medido o tribunal não
 * publicou os representantes. **A tela nunca pode tratá-lo como "ativo".**
 */
export type MeuPolo = 'ativo' | 'passivo' | 'indefinido';

/**
 * O que o advogado AFIRMOU, separado do que foi derivado.
 *
 * A tela precisa dos dois: `meuPolo: 'indefinido'` com `meuPoloManual:
 * 'nenhum'` quer dizer "ele já disse que não é dele" — e aí não se pergunta de
 * novo. Sem a distinção, o par de botões reapareceria em todo processo
 * recusado.
 */
export type PoloManual = 'ativo' | 'passivo' | 'nenhum';

export interface Prazo {
  id: string;
  tribunal: string;
  /** "1º" | "2º" — grau derivado do sufixo G1/G2 do tribunal; "" quando o processo não veio */
  grau: string;
  /** De onde o processo veio: `scraper` (robô autenticado) ou `djen` (descoberta pública). */
  origem: 'scraper' | 'djen' | '';
  cnj: string;
  orgaoJulgador: string;
  /** Parte do expediente (fallback: polo ativo do processo). Vazio quando o PJe não informou. */
  parte: string;
  /**
   * De que lado eu estou neste processo. Ver `MeuPolo`.
   *
   * É o que separa `parte` (quem o ATO nomeia — num prazo de polo passivo, a
   * parte contrária) de `cliente` (quem eu represento).
   */
  meuPolo?: MeuPolo;
  /** As partes que citam a minha OAB. Vazio quando `meuPolo` é `indefinido`. */
  cliente?: string[];
  /** As partes do outro lado. Vazio quando `meuPolo` é `indefinido`. */
  parteContraria?: string[];
  /** Assunto do processo. Vazio quando o PJe não informou — nunca cai para o nome da parte. */
  assunto: string;
  tipo: string;
  /**
   * O que o prazo cobra: tomar ciência do ato ou se manifestar sobre ele.
   * `null` quando o tribunal não deixa claro — a UI omite o rótulo em vez de chutar.
   */
  natureza: NaturezaPrazo | null;
  /** Vencimento fatal formatado dd/mm; nulo quando o PJe não informou data. */
  vencimento: string | null;
  /** Data fatal yyyy-mm-dd; nula para expediente sem data definida. */
  vencimentoISO: string | null;
  /** Dias até o vencimento; nulo quando não há data para calcular. */
  diasRestantes: number | null;
  /**
   * O ato que abriu este prazo — id da movimentação, destino de
   * `/movimentacoes/{id}`.
   *
   * **`null` é caminho normal, não erro.** O prazo vindo do painel do tribunal
   * (origens `painel` e `grid`) não tem ato correspondente gravado: ali o PJe
   * entrega a agenda já com o vencimento calculado, e não há texto de ato para
   * pendurar. No DJEN, o ato sem data também nasce solto. A tela tem que
   * renderizar a linha inteira sem o vínculo — nunca esconder o prazo por
   * faltar o ato.
   */
  movementId: string | null;
  fechado?: boolean;
  diasPrazo?: number | null;
  origemPrazo?: PrazoDoAto['origem'];
  metodoPrazo?: PrazoDoAto['metodoPrazo'];
  fundamento?: string | null;
  deQuem?: PrazoDoAto['deQuem'];
  /** Diário (ciência na publicação) ou portal (ciência na expedição — a mais cedo possível). */
  canal?: PrazoDoAto['canal'];
  /** Dobra do CPC 180/183/186 — só entra quando o cliente é conhecido e o prazo é legal ou supletivo. */
  emDobro?: boolean | null;
  /** A publicação que fez o prazo correr — o marco, não a data do ato. ISO. */
  publicadoEm?: string | null;
  /** Quando a ciência se deu — pode ser a mesma data da publicação, ou a da expedição no portal. ISO. */
  cienciaEm?: string | null;
  /** `true` quando a ciência é a ficta do art. 5º, § 3º — "o sistema registrou", não "você abriu". */
  cienciaFicta?: boolean | null;
  /**
   * Quando o advogado pediu para ser lembrado deste prazo. ISO, meia-noite de
   * Brasília. `null` é o caso normal.
   *
   * Não dispara notificação — ver `Deadline.lembrarEm` no schema. O que ele faz
   * acontece na tela: o prazo sobe para a faixa da semana a partir da data.
   */
  lembrarEm?: string | null;
  /**
   * O ato que abriu este prazo, embutido — ver `AtoDoPrazo`. `null` sem ato
   * gravado. "O que produzir até a data" mora em `ato.ia` desde a fusão
   * ato+prazo — não existe mais uma análise própria do `Deadline`.
   */
  ato?: AtoDoPrazo | null;
  state: StatusType;
}

export type TribunalHealthStatus =
  | 'operacional'
  | 'sincronizando'
  | 'atencao'
  | 'erro'
  | 'nao_configurado';

export interface TribunalStatusItem {
  id: string;
  codigo: string;
  nome: string;
  esfera: 'Estadual' | 'Federal';
  uf: string;
  sistema: string;
  status: TribunalHealthStatus;
  lastSyncAt: string | null;
  /** null quando não houve execução medível no período. */
  latencyMs: number | null;
  /** null quando não houve nenhuma execução nas últimas 24h. */
  successRate: number | null;
  activeProcessesCount: number;
  activeCredentialsCount: number;
  /** Erro ainda em aberto: nenhuma execução posterior deu certo. */
  lastError?: string | null;
  /** Última falha do período, mesmo já superada por um sucesso posterior. */
  lastFailure?: string | null;
  lastFailureAt?: string | null;
  totalJobsLast24h?: number;
  successJobsLast24h?: number;
  failedJobsLast24h?: number;
}
