import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Processo, StatusType, TimelineEvent, Movimentacao, MovimentacaoGroup, Prazo } from '@/types';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3000';

async function backendGet(path: string) {
  const jar = await cookies();
  const token = jar.get('access_token')?.value;
  if (!token) redirect('/login');

  const res = await fetch(`${BACKEND}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (res.status === 401) redirect('/login');
  if (!res.ok) throw new Error(`Backend error ${res.status} on ${path}`);

  return res.json();
}

async function backendGetOrNull<T>(path: string): Promise<T | null> {
  const jar = await cookies();
  const token = jar.get('access_token')?.value;
  if (!token) redirect('/login');

  const res = await fetch(`${BACKEND}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (res.status === 401) redirect('/login');
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Backend error ${res.status} on ${path}`);

  return res.json() as T;
}

type BackendProcess = {
  id: string;
  numero: string;
  tribunal: string;
  grau: number;
  status: string;
  monitored: boolean;
  syncStatus: string | null;
  lastMovAt: string | null;
  link?: string | null;
  classeJudicial: string | null;
  assunto: string | null;
  orgaoJulgador: string | null;
  ultimaMovimentacao: string | null;
  autuadoEm?: string | null;
  poloAtivo: BackendParte[] | null;
  poloPassivo: BackendParte[] | null;
  // legado: algumas respostas antigas traziam um objeto summary agregado
  summary?: {
    partes: string | null;
    vara: string | null;
    movimento: string | null;
  } | null;
};

type BackendParte = { nome?: string | null };

function toProcesso(p: BackendProcess): Processo {
  let state: StatusType = 'quiet';
  if (p.syncStatus === 'error') {
    state = 'alert';
  } else if (p.lastMovAt) {
    const diff = Date.now() - new Date(p.lastMovAt).getTime();
    if (diff < 1000 * 60 * 60 * 24 * 2) state = 'signal';
  }

  // coluna "Última mov." — texto da última movimentação do banco;
  // fallback para a data de lastMovAt quando o texto não existir
  let ultimaMov = p.ultimaMovimentacao?.trim() || '—';
  if (ultimaMov === '—' && p.lastMovAt) {
    const d = new Date(p.lastMovAt);
    ultimaMov = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  // grau não vem no payload — derivado do sufixo G1/G2 do tribunal
  const grau = /G2$/.test(p.tribunal) ? '2º' : '1º';

  const parte =
    p.summary?.partes?.split(';')[0]?.trim() ||
    p.poloAtivo?.[0]?.nome?.trim() ||
    '—';
  const orgaoJulgador = p.orgaoJulgador?.trim() || p.summary?.vara?.trim() || '—';
  const classeJudicial = p.classeJudicial?.trim() || '—';
  const assunto = p.assunto?.trim() || classeJudicial;

  return {
    id: p.id,
    tribunal: p.tribunal.replace(/G[12]$/, ''),
    cnj: p.numero,
    orgaoJulgador,
    parte,
    materia: p.summary?.vara ?? p.orgaoJulgador ?? '—',
    assunto,
    classeJudicial,
    grau,
    ultimaMov,
    state,
    whatsEnabled: p.monitored,
    link: p.link ?? null,
  };
}

type ProcessoPage = {
  processos: Processo[];
  total: number;
  totalPages: number;
  page: number;
};

export type ProcessoFilters = {
  q?: string;
  /** nome do tribunal (ex.: "TRF1") — "" = todos */
  tribunal?: string;
  /** state: "signal" | "alert" | "quiet" — "" = todos */
  status?: string;
  /** "ativos" | "inativos" — "" = todos */
  whats?: string;
  /** "cnj" | "tribunal" | "status" — "" = mais recentes (ordem do backend) */
  sort?: string;
};

const PROCESSO_STATE_ORDER: Record<StatusType, number> = { signal: 0, alert: 1, quiet: 2 };

function sortProcessos(list: Processo[], sort?: string): void {
  switch (sort) {
    case 'cnj':
      list.sort((a, b) => a.cnj.localeCompare(b.cnj));
      break;
    case 'tribunal':
      list.sort((a, b) => a.tribunal.localeCompare(b.tribunal) || a.cnj.localeCompare(b.cnj));
      break;
    case 'status':
      list.sort((a, b) => PROCESSO_STATE_ORDER[a.state] - PROCESSO_STATE_ORDER[b.state]);
      break;
    // default: mantém a ordem do backend (mais recentes)
  }
}

export async function getProcessos(page = 1, limit = 20, filters: ProcessoFilters = {}): Promise<ProcessoPage> {
  const { q, tribunal, status, whats, sort } = filters;
  const term = q?.trim().toLowerCase();
  const hasFilter = Boolean(term || tribunal || status || whats || sort);

  // Busca/filtros: o backend só filtra `numero` exato, então trazemos um conjunto
  // amplo e filtramos/ordenamos no servidor, colapsando em uma única página.
  if (hasFilter) {
    const body: { data: BackendProcess[]; total: number } =
      await backendGet(`/processes?page=1&limit=100`);
    let list = body.data.map(toProcesso);

    if (term) {
      list = list.filter(p =>
        p.cnj.toLowerCase().includes(term) ||
        p.tribunal.toLowerCase().includes(term) ||
        p.orgaoJulgador.toLowerCase().includes(term) ||
        p.parte.toLowerCase().includes(term) ||
        (p.assunto ?? '').toLowerCase().includes(term) ||
        (p.classeJudicial ?? '').toLowerCase().includes(term),
      );
    }
    if (tribunal) list = list.filter(p => p.tribunal === tribunal);
    if (status)   list = list.filter(p => p.state === status);
    if (whats)    list = list.filter(p => (whats === 'ativos' ? p.whatsEnabled : !p.whatsEnabled));

    sortProcessos(list, sort);

    return { processos: list, total: list.length, totalPages: 1, page: 1 };
  }

  const body: { data: BackendProcess[]; total: number; totalPages: number; page: number } =
    await backendGet(`/processes?page=${page}&limit=${limit}`);
  return {
    processos: body.data.map(toProcesso),
    total: body.total,
    totalPages: body.totalPages,
    page: body.page,
  };
}

export async function getProcesso(numero: string): Promise<Processo | null> {
  const body = await backendGetOrNull<{ data: BackendProcess[] }>(
    `/processes?numero=${encodeURIComponent(numero)}&limit=1`
  );
  if (!body || !body.data.length) return null;
  return toProcesso(body.data[0]);
}

type BackendDocumento = {
  nDocumento?: string | null;
  tipoDocumento?: string | null;
  urlDocumento?: string | null;
};

type BackendMovement = {
  id: string;
  nMovimento: string | null;
  // data em que a movimentação efetivamente ocorreu (ISO 8601, fonte da verdade no banco)
  ocorridoEm: string;
  descricao: string;
  documentos?: BackendDocumento[] | null;
  subDocumentos?: BackendDocumento[] | null;
  detectedAt: string;
  processId: string;
  // processo relacionado, incluído pelo backend nas respostas de /movements
  process?: BackendProcess | null;
};

const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

/** Primeiro documento com URL — usado como link "abrir documento" da movimentação. */
function movLink(m: BackendMovement): string | null {
  return m.documentos?.find(d => d.urlDocumento)?.urlDocumento ?? null;
}

/** Parte principal (polo ativo) a partir do processo do banco. */
function processParte(p: BackendProcess | null | undefined): string {
  return (
    p?.summary?.partes?.split(';')[0]?.trim() ||
    p?.poloAtivo?.[0]?.nome?.trim() ||
    '—'
  );
}

function toTimelineEvent(m: BackendMovement, index: number, total: number): TimelineEvent {
  const detectedAt = new Date(m.detectedAt);
  const isNew = Date.now() - detectedAt.getTime() < 1000 * 60 * 60 * 48;

  // a data exibida é sempre a de "ocorrido em" (ocorridoEm) do banco
  const ocorrido = new Date(m.ocorridoEm);
  const displayDate = `${ocorrido.getDate()} ${MONTHS[ocorrido.getMonth()]}`;
  const displayTime = `${String(ocorrido.getHours()).padStart(2, '0')}:${String(ocorrido.getMinutes()).padStart(2, '0')}`;

  return {
    id: m.id,
    date: displayDate,
    time: displayTime,
    title: m.descricao,
    state: isNew ? 'signal' : 'quiet',
    // index 0 = mais recente → número mais alto; índice final = mais antigo → § 01
    n: String(total - index).padStart(2, '0'),
    label: isNew ? 'NOVA' : undefined,
    rawDate: m.ocorridoEm,
  };
}

const TIPOS_KEYWORDS = [
  'Acórdão','Audiência','Certidão','Conclusão','Concluso',
  'Despacho','Embargo','Intimação','Juntada','Publicação',
  'Recurso','Sentença',
];

function extractTipo(descricao: string): string {
  const lower = descricao.toLowerCase();
  for (const kw of TIPOS_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) return kw === 'Concluso' ? 'Conclusão' : kw;
  }
  return descricao.trim().split(/\s+/)[0] || 'Movimentação';
}

const WEEKDAYS = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
const MONTHS_SHORT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

function formatDateGroup(d: Date): { dateLabel: string; dayLabel: string; dateKey: string } {
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const target = new Date(d); target.setHours(0,0,0,0);

  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dateKey = `${d.getFullYear()}-${mm}-${dd}`;

  if (target.getTime() === today.getTime())
    return { dateLabel: 'HOJE', dayLabel: `${dd}.${mm}`, dateKey };
  if (target.getTime() === yesterday.getTime())
    return { dateLabel: 'ONTEM', dayLabel: `${dd}.${mm}`, dateKey };
  return {
    dateLabel: `${d.getDate()} ${MONTHS_SHORT[d.getMonth()].toUpperCase()}`,
    dayLabel: WEEKDAYS[d.getDay()],
    dateKey,
  };
}

type MovimentacoesResult = {
  groups: MovimentacaoGroup[];
  total: number;
  totalPages: number;
  page: number;
  newToday: number;
};

export type MovimentacaoFilters = {
  q?: string;
  /** tipo canônico (ex.: "Intimação") — "" = todas */
  tipo?: string;
  /** nome do tribunal — "" = todos */
  tribunal?: string;
  /** "enviados" | "nao-enviados" | "erro" — "" = todos */
  status?: string;
  /** "antigas" | "tribunal" | "whats" — "" = mais recentes */
  sort?: string;
};

/** Movimentação + data de ocorrência, para filtrar/ordenar antes de agrupar. */
type MovEntry = { item: Movimentacao; ocorrido: Date; isNew: boolean };

function sortMovEntries(entries: MovEntry[], sort?: string): void {
  switch (sort) {
    case 'antigas':
      entries.sort((a, b) => a.ocorrido.getTime() - b.ocorrido.getTime());
      break;
    case 'tribunal':
      entries.sort((a, b) =>
        a.item.tribunal.localeCompare(b.item.tribunal) || b.ocorrido.getTime() - a.ocorrido.getTime(),
      );
      break;
    case 'whats':
      entries.sort((a, b) =>
        Number(b.item.whats.sent) - Number(a.item.whats.sent) || b.ocorrido.getTime() - a.ocorrido.getTime(),
      );
      break;
    default: // mais recentes
      entries.sort((a, b) => b.ocorrido.getTime() - a.ocorrido.getTime());
  }
}

export async function getMovimentacoes(page = 1, limit = 20, filters: MovimentacaoFilters = {}): Promise<MovimentacoesResult> {
  const { q, tipo, tribunal, status, sort } = filters;
  const term = q?.trim().toLowerCase();
  const hasFilter = Boolean(term || tipo || tribunal || status || sort);

  // com filtro/busca ativos, trazemos um conjunto amplo e colapsamos em 1 página
  const fetchPage = hasFilter ? 1 : page;
  const fetchLimit = hasFilter ? 100 : limit;

  const movBody = await backendGet(`/movements?page=${fetchPage}&limit=${fetchLimit}`) as {
    data: BackendMovement[];
    total: number;
    page: number;
    totalPages: number;
  };

  let entries: MovEntry[] = movBody.data.map(m => {
    const proc = m.process;
    const isNew = Date.now() - new Date(m.detectedAt).getTime() < 1000 * 60 * 60 * 48;
    const ocorrido = new Date(m.ocorridoEm);
    const timeStr = `${String(ocorrido.getHours()).padStart(2,'0')}:${String(ocorrido.getMinutes()).padStart(2,'0')}`;
    const item: Movimentacao = {
      id: m.id,
      tribunal: proc ? proc.tribunal.replace(/G[12]$/, '') : '—',
      cnj: proc ? proc.numero : '—',
      orgaoJulgador: proc?.orgaoJulgador?.trim() || '—',
      parte: processParte(proc),
      assunto: proc?.assunto?.trim() || processParte(proc),
      tipo: extractTipo(m.descricao),
      detail: m.descricao,
      time: timeStr,
      whats: { sent: false, reason: '—' },
      state: isNew ? 'signal' : 'quiet',
    };
    return { item, ocorrido, isNew };
  });

  // "novas (48h)" reflete o conjunto trazido, antes de aplicar filtros
  const newToday = entries.filter(e => e.isNew).length;

  if (term) {
    entries = entries.filter(({ item }) =>
      item.parte.toLowerCase().includes(term) ||
      item.assunto.toLowerCase().includes(term) ||
      item.cnj.toLowerCase().includes(term) ||
      item.orgaoJulgador.toLowerCase().includes(term) ||
      item.tipo.toLowerCase().includes(term) ||
      item.detail.toLowerCase().includes(term) ||
      item.tribunal.toLowerCase().includes(term),
    );
  }
  if (tipo)     entries = entries.filter(e => e.item.tipo === tipo);
  if (tribunal) entries = entries.filter(e => e.item.tribunal === tribunal);
  if (status === 'erro')         entries = entries.filter(e => e.item.state === 'alert');
  else if (status === 'enviados')     entries = entries.filter(e => e.item.whats.sent);
  else if (status === 'nao-enviados') entries = entries.filter(e => !e.item.whats.sent);

  sortMovEntries(entries, sort);

  // agrupa por data preservando a ordem final
  const groupMap = new Map<string, MovimentacaoGroup>();
  for (const { item, ocorrido } of entries) {
    const { dateLabel, dayLabel, dateKey } = formatDateGroup(ocorrido);
    if (!groupMap.has(dateKey)) {
      groupMap.set(dateKey, { date: dateLabel, day: dayLabel, items: [] });
    }
    groupMap.get(dateKey)!.items.push(item);
  }

  return {
    groups: Array.from(groupMap.values()),
    total: hasFilter ? entries.length : movBody.total,
    totalPages: hasFilter ? 1 : movBody.totalPages,
    page: hasFilter ? 1 : movBody.page,
    newToday,
  };
}

export type MovimentacaoDetail = {
  id: string;
  data: string;
  descricao: string;
  link: string | null;
  detectedAt: string;
  processData?: (BackendProcess & {
    summary: {
      link?: string | null;
      partes?: string | null;
      vara?: string | null;
      distribuicao?: string | null;
      movimento?: string | null;
    } | null;
  }) | null;
};

/** Formata ocorridoEm (ISO) como "DD/MM/YYYY HH:MM". */
function formatOcorridoEm(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`;
}

export async function getMovimentacao(id: string): Promise<MovimentacaoDetail | null> {
  const m = await backendGetOrNull<BackendMovement>(`/movements/${id}`);
  if (!m) return null;

  const proc = m.process ?? null;
  const processData = proc
    ? {
        ...proc,
        // grau derivado do sufixo G1/G2 do tribunal (não vem como campo no banco)
        grau: /G2$/.test(proc.tribunal) ? 2 : 1,
        summary: {
          link: proc.link ?? null,
          partes: processParte(proc),
          vara: proc.orgaoJulgador ?? null,
          distribuicao: proc.autuadoEm ? formatOcorridoEm(proc.autuadoEm) : null,
          movimento: proc.ultimaMovimentacao ?? null,
        },
      }
    : null;

  return {
    id: m.id,
    // data exibida é a de "ocorrido em"
    data: formatOcorridoEm(m.ocorridoEm),
    descricao: m.descricao,
    link: movLink(m),
    detectedAt: m.detectedAt,
    processData,
  };
}

type BackendDeadline = {
  id: string;
  tipoDocumento: string;
  parte: string | null;
  prazo: number | null;
  dataLimite: string;
  fechado: boolean;
  createdAt: string;
  processId: string;
  process?: {
    numero: string;
    tribunal: string;
    orgaoJulgador: string | null;
    assunto?: string | null;
    poloAtivo: BackendParte[] | null;
  } | null;
};

/** Dias corridos entre agora e a dataLimite (arredondado para cima, mínimo 0). */
function diasAteVencimento(dataLimite: string): number {
  const diff = new Date(dataLimite).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function toPrazo(d: BackendDeadline): Prazo {
  const dias = diasAteVencimento(d.dataLimite);
  let state: StatusType = 'quiet';
  if (dias <= 3) state = 'alert';
  else if (dias <= 7) state = 'signal';

  const venc = new Date(d.dataLimite);
  const vencimento = `${String(venc.getDate()).padStart(2, '0')}/${String(venc.getMonth() + 1).padStart(2, '0')}`;
  const vencimentoISO = `${venc.getFullYear()}-${String(venc.getMonth() + 1).padStart(2, '0')}-${String(venc.getDate()).padStart(2, '0')}`;

  const parte =
    d.process?.poloAtivo?.[0]?.nome?.trim() ||
    d.parte?.trim() ||
    '—';

  return {
    id: d.id,
    tribunal: d.process ? d.process.tribunal.replace(/G[12]$/, '') : '—',
    cnj: d.process?.numero ?? '—',
    orgaoJulgador: d.process?.orgaoJulgador?.trim() || '—',
    parte,
    assunto: d.process?.assunto?.trim() || parte,
    tipo: d.tipoDocumento,
    vencimento,
    vencimentoISO,
    diasRestantes: dias,
    state,
  };
}

export type PrazoFilters = {
  q?: string;
  /** nome do tribunal — "" = todos */
  tribunal?: string;
  /** "critico" (≤3d) | "urgente" (≤7d) — "" = todos */
  urgencia?: string;
  /** "menos-urgente" (dias desc) | "tribunal" — "" = mais urgente (dias asc) */
  sort?: string;
};

function sortPrazos(list: Prazo[], sort?: string): void {
  switch (sort) {
    case 'menos-urgente':
      list.sort((a, b) => b.diasRestantes - a.diasRestantes);
      break;
    case 'tribunal':
      list.sort((a, b) => a.tribunal.localeCompare(b.tribunal) || a.diasRestantes - b.diasRestantes);
      break;
    default: // mais urgente — dias asc (ordem do backend)
      list.sort((a, b) => a.diasRestantes - b.diasRestantes);
  }
}

/** Prazos pendentes (não fechados), filtrados/ordenados no servidor. */
export async function getPrazos(page = 1, limit = 100, filters: PrazoFilters = {}): Promise<Prazo[]> {
  const body = await backendGet(`/deadlines?fechado=false&sort=asc&page=${page}&limit=${limit}`) as {
    data: BackendDeadline[];
  };
  let list = body.data.map(toPrazo);

  const term = filters.q?.trim().toLowerCase();
  if (term) {
    list = list.filter(p =>
      p.parte.toLowerCase().includes(term) ||
      p.assunto.toLowerCase().includes(term) ||
      p.cnj.toLowerCase().includes(term) ||
      p.orgaoJulgador.toLowerCase().includes(term) ||
      p.tipo.toLowerCase().includes(term) ||
      p.tribunal.toLowerCase().includes(term),
    );
  }
  if (filters.tribunal) list = list.filter(p => p.tribunal === filters.tribunal);
  if (filters.urgencia === 'critico') list = list.filter(p => p.diasRestantes <= 3);
  else if (filters.urgencia === 'urgente') list = list.filter(p => p.diasRestantes <= 7);

  sortPrazos(list, filters.sort);
  return list;
}

export async function getProcessoMovements(processId: string): Promise<TimelineEvent[]> {
  const body = await backendGetOrNull<{ data: BackendMovement[] }>(
    `/movements?processId=${processId}&sort=desc&page=1&limit=20`
  );
  if (!body) return [];
  const sorted = [...body.data].sort(
    (a, b) => new Date(b.ocorridoEm).getTime() - new Date(a.ocorridoEm).getTime(),
  );
  return sorted.map((m, i) => toTimelineEvent(m, i, sorted.length));
}
