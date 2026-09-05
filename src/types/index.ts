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
export type OrigemMovimentacao = 'scraper' | 'tribunalPublico' | 'datajud' | 'djen';

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

/** A leitura do ato pela IA. Só a origem `djen` traz o inteiro teor, logo só ela é analisada. */
export interface LeituraIa {
  /** O que o juízo decidiu, em linguagem humana. */
  resumo: string | null;
  /** O que o destinatário precisa fazer. `null` = nada a fazer. */
  acao: string | null;
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
}

/**
 * O prazo que ESTE ato abriu — no máximo um, e só quando abre.
 *
 * `null` na movimentação é a resposta comum e correta: mera ciência, pauta e
 * ata não abrem prazo, e eram 46% dos atos numa medição real.
 */
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
}

export interface Movimentacao {
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
  /** A que serve o ato. `null` em linha anterior à classificação. */
  categoria: CategoriaMovimentacao | null;
  /** Todos os campos `null` quando a IA não rodou — caminho degradado, não erro. */
  ia: LeituraIa;
  /** O prazo que este ato abriu. `null` na maioria — a maioria dos atos não abre. */
  prazo: PrazoDoAto | null;
  /**
   * O ato ÍNTEGRO, em texto plano. **Só vem no detalhe** — a listagem o omite
   * no banco, porque a média é de 3,8 KB e o maior medido tem 288 KB.
   * `undefined` = não foi pedido; `null` = este ato não tem texto.
   */
  textoOriginal?: string | null;
}

export interface MovimentacaoGroup {
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

export interface Processo {
  id: string;
  tribunal: string;
  cnj: string;
  orgaoJulgador: string;
  parte: string;
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
  /**
   * Há certidão de andamento deste processo — o PDF oficial do STJ.
   *
   * É documento do PROCESSO, não de uma movimentação: a via pública do STJ não
   * expõe peça por ato, e essa certidão é o que cobre a timeline inteira. Só
   * processo do STJ tem. Sai por `/api/processos/{id}/certidao-andamento`.
   */
  temCertidaoAndamento?: boolean;
}

/** Documento anexado a uma movimentação. */
export interface DocumentoMovimentacao {
  nome: string;
  url: string;
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
  time?: string;
  label?: string;
  title: string;
  body?: string;
  state: StatusType;
  /** número do movimento no tribunal; sem ele, a posição na timeline */
  n: string;
  rawDate?: string;
  documentos: DocumentoMovimentacao[];
  origem?: OrigemMovimentacao;
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
}

/**
 * Natureza do prazo. No PJe a grid de expedientes tem uma coluna de data só,
 * "Data limite prevista para ciência ou manifestação" — quem separa as duas é o
 * backend, a partir do texto do ato. Ver `naturezaDoAto` na API.
 */
export type NaturezaPrazo = 'ciencia' | 'manifestacao';

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


