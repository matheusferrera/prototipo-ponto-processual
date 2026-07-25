export type StatusType = 'signal' | 'quiet' | 'alert';

export interface WhatsStatus {
  sent: boolean;
  time?: string;
  reason?: string;
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
  time: string;
  whats: WhatsStatus;
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

export interface Prazo {
  id: string;
  tribunal: string;
  cnj: string;
  orgaoJulgador: string;
  parte: string;
  assunto: string;
  tipo: string;
  vencimento: string;
  /** Data completa do vencimento (yyyy-mm-dd) — usada pelo calendário para casar ano+mês */
  vencimentoISO: string;
  diasRestantes: number;
  state: StatusType;
}

export type TribunalHealthStatus = 'operacional' | 'sincronizando' | 'atencao' | 'erro';

export interface TribunalStatusItem {
  id: string;
  codigo: string;
  nome: string;
  esfera: 'Estadual' | 'Federal';
  uf: string;
  sistema: string;
  status: TribunalHealthStatus;
  lastSyncAt: string | null;
  latencyMs: number;
  successRate: number;
  activeProcessesCount: number;
  activeCredentialsCount: number;
  lastError?: string | null;
  totalJobsLast24h?: number;
  successJobsLast24h?: number;
  failedJobsLast24h?: number;
}
