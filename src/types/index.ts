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
  whatsEnabled: boolean;
  link?: string | null;
}

export interface TimelineEvent {
  id: string;
  date: string;
  time?: string;
  label?: string;
  title: string;
  body?: string;
  state: StatusType;
  n: string;
  rawDate?: string;
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
