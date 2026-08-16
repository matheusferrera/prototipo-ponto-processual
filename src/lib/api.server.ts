import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type {
  Processo,
  ProcessoParte,
  StatusType,
  TimelineEvent,
  Movimentacao,
  MovimentacaoGroup,
  Prazo,
  NaturezaPrazo,
  ProximoPrazo,
  DocumentoMovimentacao,
} from '@/types';
import {
  FALLBACK_TRIBUNALS,
  normalizeTribunalOptions,
  type TribunalOption,
} from '@/lib/tribunals';

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

/** `vaziosEm` lista os status que significam "sem dados", não erro (default: 404). */
async function backendGetOrNull<T>(path: string, vaziosEm: readonly number[] = [404]): Promise<T | null> {
  const jar = await cookies();
  const token = jar.get('access_token')?.value;
  if (!token) redirect('/login');

  const res = await fetch(`${BACKEND}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (res.status === 401) redirect('/login');
  if (vaziosEm.includes(res.status)) return null;
  if (!res.ok) throw new Error(`Backend error ${res.status} on ${path}`);

  return res.json() as T;
}

type BackendProcess = {
  id: string;
  numero: string;
  tribunal: string;
  status: string;
  monitored: boolean;
  syncStatus: string | null;
  syncError: string | null;
  lastMovAt: string | null;
  lastScrapedAt: string | null;
  link?: string | null;
  classeJudicial: string | null;
  assunto: string | null;
  orgaoJulgador: string | null;
  ultimaMovimentacao: string | null;
  autuadoEm: string | null;
  poloAtivo: BackendParte[] | null;
  poloPassivo: BackendParte[] | null;
  valorCausa: string | number | null;
  movementsCount?: number;
  openDeadlinesCount?: number;
  nextDeadline?: BackendNextDeadline | null;
  // legado: algumas respostas antigas traziam um objeto summary agregado
  summary?: {
    partes: string | null;
    vara: string | null;
    movimento: string | null;
  } | null;
};

type BackendParte = {
  nome?: string | null;
  representantes?: string[] | null;
  documento?: string | null;
  tipo?: string | null;
};

type BackendNextDeadline = {
  id: string;
  tipoDocumento: string;
  parte: string | null;
  prazo: number | null;
  dataLimite: string;
};

function normalizeDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeValorCausa(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;

  const raw = value.trim();
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

/**
 * O PJe entrega a parte como um texto só —
 * "FULANO DE TAL - CNPJ: 00.000.000/0001-00 (AUTOR)".
 * Separar nome, documento e papel deixa o nome utilizável como título e coluna.
 */
const PARTE_DOC_RE = /\s*[-–]\s*(CPF|CNPJ|OAB|RG)\s*:?\s*([\d.\-/]+[\dA-Za-z]*)/i;
const PARTE_PAPEL_RE = /\s*\(([^()]+)\)\s*$/;

function splitParteNome(raw: string): { nome: string; documento: string | null; tipo: string | null } {
  let nome = raw;
  let documento: string | null = null;
  let tipo: string | null = null;

  const papel = nome.match(PARTE_PAPEL_RE);
  if (papel) {
    const label = papel[1].trim();
    tipo = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
    nome = nome.replace(PARTE_PAPEL_RE, '');
  }

  const doc = nome.match(PARTE_DOC_RE);
  if (doc) {
    documento = `${doc[1].toUpperCase()} ${doc[2]}`;
    nome = nome.replace(PARTE_DOC_RE, '');
  }

  return { nome: nome.replace(/[\s\-–]+$/, '').trim() || raw, documento, tipo };
}

const PAPEIS_REPRESENTANTE = ['advogado', 'advogada', 'procurador', 'procuradora', 'defensor', 'defensora'];

function ehRepresentante(tipo: string | null): boolean {
  return tipo !== null && PAPEIS_REPRESENTANTE.includes(tipo.toLowerCase());
}

/**
 * O PJe lista advogados como entradas do próprio polo, logo após a parte que
 * representam. Aqui eles são dobrados para dentro de `representantes`, para a
 * lista mostrar partes — e não uma mistura de parte e advogado no mesmo nível.
 */
function normalizePartes(value: BackendParte[] | null | undefined): ProcessoParte[] {
  if (!Array.isArray(value)) return [];

  const partes: ProcessoParte[] = [];

  for (const item of value) {
    const raw = item?.nome?.trim();
    if (!raw) continue;

    const parsed = splitParteNome(raw);
    const documento = item.documento?.trim() || parsed.documento;
    const tipo = item.tipo?.trim() || parsed.tipo;
    const anterior = partes.at(-1);

    if (ehRepresentante(tipo) && anterior) {
      anterior.representantes.push([parsed.nome, documento].filter(Boolean).join(' · '));
      continue;
    }

    partes.push({
      nome: parsed.nome,
      representantes: (item.representantes ?? [])
        .map(representante => representante?.trim())
        .filter((representante): representante is string => Boolean(representante)),
      documento,
      tipo,
    });
  }

  return partes;
}

/** Dias corridos até a data — 0 = vence hoje, negativo = vencido. */
function daysUntil(iso: string): number {
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function toProximoPrazo(deadline: BackendNextDeadline | null | undefined): ProximoPrazo | null {
  if (!deadline) return null;
  const dataLimite = normalizeDate(deadline.dataLimite);
  if (!dataLimite) return null;
  return {
    id: deadline.id,
    tipo: deadline.tipoDocumento?.trim() || 'Prazo',
    parte: deadline.parte?.trim() || null,
    dataLimite,
    diasRestantes: daysUntil(dataLimite),
  };
}

function toProcesso(p: BackendProcess): Processo {
  const lastMovAt = normalizeDate(p.lastMovAt);
  let state: StatusType = 'quiet';
  if (p.syncStatus === 'error') {
    state = 'alert';
  } else if (lastMovAt) {
    const diff = Date.now() - new Date(lastMovAt).getTime();
    if (diff < 1000 * 60 * 60 * 24 * 2) state = 'signal';
  }

  // coluna "Última mov." — texto da última movimentação do banco;
  // fallback para a data de lastMovAt quando o texto não existir
  let ultimaMov = p.ultimaMovimentacao?.trim() || '—';
  if (ultimaMov === '—' && lastMovAt) {
    const d = new Date(lastMovAt);
    ultimaMov = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  // grau não vem no payload — derivado do sufixo G1/G2 do tribunal
  const grau = /G2$/.test(p.tribunal) ? '2º' : '1º';

  const poloAtivo = normalizePartes(p.poloAtivo);
  const poloPassivo = normalizePartes(p.poloPassivo);
  const parte =
    p.summary?.partes?.split(';')[0]?.trim() ||
    poloAtivo[0]?.nome ||
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
    status: p.status,
    whatsEnabled: p.monitored,
    poloAtivo,
    poloPassivo,
    valorCausa: normalizeValorCausa(p.valorCausa),
    autuadoEm: normalizeDate(p.autuadoEm),
    lastMovAt,
    lastScrapedAt: normalizeDate(p.lastScrapedAt),
    syncStatus: p.syncStatus,
    syncError: p.syncError,
    link: p.link ?? null,
    movimentacoesCount: p.movementsCount ?? 0,
    prazosAbertos: p.openDeadlinesCount ?? 0,
    proximoPrazo: toProximoPrazo(p.nextDeadline),
  };
}

type ProcessoPage = {
  processos: Processo[];
  total: number;
  totalPages: number;
  page: number;
  /** contagens do conjunto filtrado inteiro (backend), não só da página */
  comNovidade: number;
  comErro: number;
};

type CsvFilter = string | readonly string[];

export type ProcessoFilters = {
  q?: string;
  /** Tribunal(is) em CSV ou lista (ex.: "TRF1,TJDFT"). */
  tribunal?: CsvFilter;
  grau?: '1' | '2' | string;
  /** Estado visual derivado pelo backend. */
  state?: StatusType | string;
  /** Status processual em CSV ou lista (ex.: "active,archived"). */
  status?: CsvFilter;
  monitored?: boolean | 'true' | 'false' | string;
  assunto?: string;
  classe?: string;
  orgao?: string;
  valorMin?: number | string;
  valorMax?: number | string;
  autuadoFrom?: string;
  autuadoTo?: string;
  movFrom?: string;
  movTo?: string;
  sort?: 'recent' | 'cnj' | 'tribunal' | 'valor' | 'autuado' | string;
  order?: 'asc' | 'desc' | string;
};

function appendQueryValue(
  params: URLSearchParams,
  key: string,
  value: string | number | boolean | readonly string[] | undefined,
): void {
  if (value === undefined) return;
  if (Array.isArray(value)) {
    const csv = value.map(item => item.trim()).filter(Boolean).join(',');
    if (csv) params.set(key, csv);
    return;
  }

  const normalized = String(value).trim();
  if (normalized) params.set(key, normalized);
}

export async function getProcessos(page = 1, limit = 20, filters: ProcessoFilters = {}): Promise<ProcessoPage> {
  const params = new URLSearchParams({
    page: String(Math.max(1, Math.trunc(page))),
    limit: String(Math.max(1, Math.trunc(limit))),
  });

  appendQueryValue(params, 'q', filters.q);
  appendQueryValue(params, 'tribunal', filters.tribunal);
  appendQueryValue(params, 'grau', filters.grau);
  appendQueryValue(params, 'state', filters.state);
  appendQueryValue(params, 'status', filters.status);
  appendQueryValue(params, 'monitored', filters.monitored);
  appendQueryValue(params, 'assunto', filters.assunto);
  appendQueryValue(params, 'classe', filters.classe);
  appendQueryValue(params, 'orgao', filters.orgao);
  appendQueryValue(params, 'valorMin', filters.valorMin);
  appendQueryValue(params, 'valorMax', filters.valorMax);
  appendQueryValue(params, 'autuadoFrom', filters.autuadoFrom);
  appendQueryValue(params, 'autuadoTo', filters.autuadoTo);
  appendQueryValue(params, 'movFrom', filters.movFrom);
  appendQueryValue(params, 'movTo', filters.movTo);
  appendQueryValue(params, 'sort', filters.sort);
  appendQueryValue(params, 'order', filters.order);

  const body: {
    data: BackendProcess[]; total: number; totalPages: number; page: number;
    counts?: { signal: number; alert: number };
  } = await backendGet(`/processes?${params.toString()}`);

  return {
    processos: body.data.map(toProcesso),
    total: body.total,
    totalPages: body.totalPages,
    page: body.page,
    comNovidade: body.counts?.signal ?? 0,
    comErro: body.counts?.alert ?? 0,
  };
}

export type ProcessoStats = {
  /** total global da carteira (do backend) */
  total: number;
  /** processos com novidade na amostra */
  comNovidade: number;
  /** distribuição por tribunal (percentuais somam ~100 na amostra) */
  porTribunal: { tribunal: string; count: number; percent: number }[];
};

/**
 * Agrega estatísticas da carteira para o card "Informações".
 * O backend não expõe agregações, então amostramos um conjunto amplo
 * (limit=100) e derivamos contagens/percentuais no servidor. O `total`
 * vem do backend (global); os percentuais são calculados sobre a amostra.
 */
export async function getProcessoStats(): Promise<ProcessoStats> {
  const body: { data: BackendProcess[]; total?: number } =
    await backendGet(`/processes?page=1&limit=100`);
  const list = body.data.map(toProcesso);
  const total = body.total ?? list.length;
  const comNovidade = list.filter(p => p.state === 'signal').length;

  const counts = new Map<string, number>();
  for (const p of list) counts.set(p.tribunal, (counts.get(p.tribunal) ?? 0) + 1);

  const sample = list.length || 1;
  const porTribunal = [...counts.entries()]
    .map(([tribunal, count]) => ({ tribunal, count, percent: Math.round((count / sample) * 100) }))
    .sort((a, b) => b.count - a.count || a.tribunal.localeCompare(b.tribunal));

  return { total, comNovidade, porTribunal };
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
    // número do movimento no tribunal; sem ele, a posição na timeline
    // (index 0 = mais recente → número mais alto; índice final = mais antigo → § 01)
    n: m.nMovimento?.trim() || String(total - index).padStart(2, '0'),
    label: isNew ? 'NOVA' : undefined,
    rawDate: m.ocorridoEm,
    documentos: toDocumentos(m),
  };
}

/** Documentos (e subdocumentos) com URL, prontos para virar links. */
function toDocumentos(m: BackendMovement): DocumentoMovimentacao[] {
  return [...(m.documentos ?? []), ...(m.subDocumentos ?? [])]
    .filter((d): d is BackendDocumento & { urlDocumento: string } => Boolean(d.urlDocumento))
    .map(d => ({
      nome: d.tipoDocumento?.trim() || d.nDocumento?.trim() || 'Documento',
      url: d.urlDocumento,
    }));
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
    grau: number;
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
  natureza: NaturezaPrazo | null;
  parte: string | null;
  prazo: number | null;
  dataLimite: string | null;
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

/** Antecedência da pauta interna em relação ao prazo fatal, em dias corridos. */
const DIAS_ANTECEDENCIA_PAUTA = 3;

/**
 * Data da pauta interna: `DIAS_ANTECEDENCIA_PAUTA` dias antes do fatal.
 * Se cair no fim de semana antecipa para a sexta — sábado/domingo não é dia de trabalho.
 */
function dataDaPauta(fatal: Date): Date {
  const d = new Date(fatal.getFullYear(), fatal.getMonth(), fatal.getDate() - DIAS_ANTECEDENCIA_PAUTA);
  if (d.getDay() === 0) d.setDate(d.getDate() - 2); // domingo → sexta
  if (d.getDay() === 6) d.setDate(d.getDate() - 1); // sábado  → sexta
  return d;
}

/** Dias corridos entre hoje (meia-noite local) e `alvo` — negativo quando já passou. */
function diasCorridosAte(alvo: Date): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dia = new Date(alvo.getFullYear(), alvo.getMonth(), alvo.getDate());
  return Math.round((dia.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function toPrazo(d: BackendDeadline): Prazo {
  const dataLimite = normalizeDate(d.dataLimite);
  const dias = dataLimite ? diasAteVencimento(dataLimite) : null;
  let state: StatusType = 'quiet';
  if (dias !== null && dias <= 3) state = 'alert';
  else if (dias !== null && dias <= 7) state = 'signal';

  const venc = dataLimite ? new Date(dataLimite) : null;
  const vencimento = venc
    ? `${String(venc.getDate()).padStart(2, '0')}/${String(venc.getMonth() + 1).padStart(2, '0')}`
    : null;
  const vencimentoISO = venc ? toISODate(venc) : null;
  const pauta = venc ? dataDaPauta(venc) : null;

  // A parte do próprio expediente é a mais precisa para um prazo; o polo ativo
  // do processo entra só como fallback quando o PJe não a informou.
  const parteRaw =
    d.parte?.trim() ||
    d.process?.poloAtivo?.[0]?.nome?.trim() ||
    '';
  const parte = parteRaw ? splitParteNome(parteRaw).nome : '';

  return {
    id: d.id,
    tribunal: d.process ? d.process.tribunal.replace(/G[12]$/, '') : '—',
    grau: d.process ? (d.process.tribunal.endsWith('G2') ? '2º' : '1º') : '',
    cnj: d.process?.numero ?? '—',
    orgaoJulgador: d.process?.orgaoJulgador?.trim() || '—',
    parte,
    assunto: d.process?.assunto?.trim() || '',
    tipo: d.tipoDocumento,
    natureza: d.natureza ?? null,
    vencimento,
    vencimentoISO,
    pautaISO: pauta ? toISODate(pauta) : null,
    diasParaPauta: pauta ? diasCorridosAte(pauta) : null,
    diasRestantes: dias,
    state,
  };
}

export type PrazoFilters = {
  q?: string;
  /** Tribunais em CSV ou lista (ex.: "TRF1,TJDFT"). */
  tribunal?: CsvFilter;
  grau?: '1' | '2' | string;
  /** Faixa de dias até o fatal: crítico ≤3, urgente ≤7, atenção ≤14, normal >14. */
  urgencia?: string;
  /** Janela da data da pauta: "atrasada" | "hoje" | "semana". */
  pauta?: string;
  /** Expediente "pendente" (fechado=false) ou "fechado". */
  situacao?: string;
  /** Tipo do expediente (contém). */
  tipo?: string;
  /** "ciencia" | "manifestacao" — o que o prazo cobra. Resolvido no backend. */
  natureza?: string;
  assunto?: string;
  orgao?: string;
  /** Nome da parte/cliente (contém). */
  cliente?: string;
  /** Faixa do prazo fatal (yyyy-mm-dd). */
  fatalFrom?: string;
  fatalTo?: string;
  /** Faixa da data da pauta (yyyy-mm-dd). */
  pautaFrom?: string;
  pautaTo?: string;
  sort?: 'fatal' | 'pauta' | 'tribunal' | 'cliente' | 'expediente' | string;
  order?: 'asc' | 'desc' | string;
};

export type PrazoPage = {
  prazos: Prazo[];
  /** Total após todos os filtros. */
  total: number;
  /** Quantos vencem em ≤3 dias — alimenta o alerta crítico. */
  criticos: number;
  /** Quantos já passaram da data da pauta sem terem sido trabalhados. */
  pautaAtrasada: number;
};

const contem = (valor: string, termo?: string) =>
  !termo || valor.toLowerCase().includes(termo.trim().toLowerCase());

function filtraPrazos(list: Prazo[], f: PrazoFilters): Prazo[] {
  const tribunais: readonly string[] = typeof f.tribunal === 'string'
    ? f.tribunal.split(',').map(item => item.trim()).filter(Boolean)
    : f.tribunal ?? [];

  return list.filter(p => {
    if (tribunais.length && !tribunais.includes(p.tribunal)) return false;
    if (f.grau && p.grau !== `${f.grau}º`) return false;

    const exigeData = Boolean(f.urgencia || f.pauta || f.fatalFrom || f.fatalTo || f.pautaFrom || f.pautaTo);
    if (exigeData && (p.diasRestantes === null || p.diasParaPauta === null || !p.vencimentoISO || !p.pautaISO)) {
      return false;
    }

    if (f.urgencia === 'critico' && p.diasRestantes! > 3)  return false;
    if (f.urgencia === 'urgente' && p.diasRestantes! > 7)  return false;
    if (f.urgencia === 'atencao' && p.diasRestantes! > 14) return false;
    if (f.urgencia === 'normal'  && p.diasRestantes! <= 14) return false;

    if (f.pauta === 'atrasada' && p.diasParaPauta! >= 0) return false;
    if (f.pauta === 'hoje'     && p.diasParaPauta !== 0) return false;
    if (f.pauta === 'semana'   && (p.diasParaPauta! < 0 || p.diasParaPauta! > 7)) return false;

    if (f.fatalFrom && p.vencimentoISO! < f.fatalFrom) return false;
    if (f.fatalTo   && p.vencimentoISO! > f.fatalTo)   return false;
    if (f.pautaFrom && p.pautaISO!      < f.pautaFrom) return false;
    if (f.pautaTo   && p.pautaISO!      > f.pautaTo)   return false;

    if (!contem(p.tipo, f.tipo))              return false;
    if (!contem(p.assunto, f.assunto))        return false;
    if (!contem(p.orgaoJulgador, f.orgao))    return false;
    if (!contem(p.parte, f.cliente))          return false;

    return true;
  });
}

function sortPrazos(list: Prazo[], sort?: string, order?: string): void {
  const dir = order === 'desc' ? -1 : 1;
  const datas = (a: string | null, b: string | null) => {
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return dir * a.localeCompare(b);
  };
  const porFatal = (a: Prazo, b: Prazo) => datas(a.vencimentoISO, b.vencimentoISO);

  switch (sort) {
    case 'pauta':
      list.sort((a, b) => datas(a.pautaISO, b.pautaISO) || porFatal(a, b));
      break;
    case 'tribunal':
      list.sort((a, b) => dir * (a.tribunal.localeCompare(b.tribunal, 'pt-BR') || a.grau.localeCompare(b.grau)) || porFatal(a, b));
      break;
    case 'cliente':
      list.sort((a, b) => dir * a.parte.localeCompare(b.parte, 'pt-BR') || porFatal(a, b));
      break;
    case 'expediente':
      list.sort((a, b) => dir * a.tipo.localeCompare(b.tipo, 'pt-BR') || porFatal(a, b));
      break;
    default: // fatal
      list.sort(porFatal);
  }
}

/**
 * Prazos a vencer e expedientes sem data — `dataLimite` no futuro ou nula,
 * fechados ou não.
 * Prazos já vencidos ficam de fora: o front os exibiria como "0d"
 * (`diasAteVencimento` satura em 0) e eles poluiriam o alerta de crítico.
 *
 * `/deadlines` filtra no banco o que sabe filtrar (busca livre, tipo de
 * documento, expediente fechado e faixa de `dataLimite`, incluindo nulos);
 * tribunal, grau, urgência, pauta e os "contém" restantes são aplicados aqui
 * sobre a página. Filtros cronológicos excluem os itens sem data.
 */
export async function getPrazos(page = 1, limit = 100, filters: PrazoFilters = {}): Promise<PrazoPage> {
  const params = new URLSearchParams({
    page: String(Math.max(1, Math.trunc(page))),
    limit: String(Math.max(1, Math.trunc(limit))),
    sort: 'asc',
  });

  // Sem faixa explícita, a lista começa em "agora" — prazos vencidos não entram.
  params.set('from', filters.fatalFrom ? `${filters.fatalFrom}T00:00:00.000-03:00` : new Date().toISOString());
  params.set('includeSemData', 'true');
  if (filters.fatalTo) params.set('to', `${filters.fatalTo}T23:59:59.999-03:00`);
  appendQueryValue(params, 'q', filters.q);
  appendQueryValue(params, 'tipoDocumento', filters.tipo);
  appendQueryValue(params, 'natureza', filters.natureza);
  if (filters.situacao) params.set('fechado', String(filters.situacao === 'fechado'));

  const body = await backendGetOrNull<{ data: BackendDeadline[] }>(`/deadlines?${params.toString()}`, []);

  const list = filtraPrazos((body?.data ?? []).map(toPrazo), filters);
  sortPrazos(list, filters.sort, filters.order);

  return {
    prazos: list,
    total: list.length,
    criticos: list.filter(p => p.diasRestantes !== null && p.diasRestantes <= 3).length,
    pautaAtrasada: list.filter(p => p.diasParaPauta !== null && p.diasParaPauta < 0).length,
  };
}

export type ProcessoMovements = {
  events: TimelineEvent[];
  /** total de movimentações do processo no banco, não só as carregadas */
  total: number;
};

/**
 * Movimentações do processo, da mais recente para a mais antiga.
 * `limit` é controlado pela página (botão "carregar mais" via search param).
 */
export async function getProcessoMovements(processId: string, limit = 20): Promise<ProcessoMovements> {
  const take = Math.min(Math.max(1, Math.trunc(limit)), 100);
  const body = await backendGetOrNull<{ data: BackendMovement[]; total: number }>(
    `/movements?processId=${processId}&sort=desc&page=1&limit=${take}`
  );
  if (!body) return { events: [], total: 0 };
  const sorted = [...body.data].sort(
    (a, b) => new Date(b.ocorridoEm).getTime() - new Date(a.ocorridoEm).getTime(),
  );
  // a numeração de fallback usa o total do processo, não o que foi carregado:
  // assim o § de uma movimentação não muda ao clicar em "carregar mais"
  const total = body.total ?? sorted.length;
  return {
    events: sorted.map((m, i) => toTimelineEvent(m, i, total)),
    total,
  };
}

/** Prazos de um processo, do vencimento mais próximo ao mais distante. */
export async function getProcessoPrazos(processId: string): Promise<Prazo[]> {
  const body = await backendGetOrNull<{ data: BackendDeadline[] }>(
    `/deadlines?processId=${processId}&sort=asc&page=1&limit=100`
  );
  if (!body) return [];
  return body.data.map(toPrazo);
}

export type TribunaisStatusResult = {
  tribunals: import('@/types').TribunalStatusItem[];
  /** true quando o backend não respondeu — a página não deve inventar saúde de tribunal. */
  unavailable: boolean;
};

export async function getTribunaisStatus(): Promise<TribunaisStatusResult> {
  try {
    const body = await backendGet('/scraper/status') as { tribunals?: import('@/types').TribunalStatusItem[] };
    if (body?.tribunals && Array.isArray(body.tribunals)) {
      return { tribunals: body.tribunals, unavailable: false };
    }
  } catch (err: unknown) {
    // Next.js redirect() throws a special error that must NOT be caught
    if (err instanceof Error && err.message?.includes('NEXT_REDIRECT')) {
      throw err;
    }
    console.error('Falha ao buscar status no backend:', err);
  }

  // Sem dataset de fallback: esta é uma página de monitoramento, e status
  // inventado é pior do que status ausente.
  return { tribunals: [], unavailable: true };
}

export async function getSupportedTribunals(): Promise<TribunalOption[]> {
  try {
    const body = await backendGet('/tribunals') as { tribunals?: unknown };
    const tribunals = normalizeTribunalOptions(body?.tribunals);
    if (tribunals.length) return tribunals;
  } catch (err: unknown) {
    if (err instanceof Error && err.message?.includes('NEXT_REDIRECT')) {
      throw err;
    }
    console.error('Falha ao buscar catálogo de tribunais no backend:', err);
  }

  return [...FALLBACK_TRIBUNALS];
}
