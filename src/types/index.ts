export type StatusType = 'signal' | 'quiet' | 'alert';

export interface Movimentacao {
  id: string;
  tribunal: string;
  cnj: string;
  orgaoJulgador: string;
  parte: string;
  assunto: string;
  tipo: string;
  detail: string;
  time: string;
  state: StatusType;
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
}

/** Documento anexado a uma movimentação. */
export interface DocumentoMovimentacao {
  nome: string;
  url: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  time?: string;
  label?: string;
  title: string;
  body?: string;
  state: StatusType;
  /** número do movimento no tribunal; sem ele, a posição na timeline */
  n: string;
  rawDate?: string;
  documentos: DocumentoMovimentacao[];
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
