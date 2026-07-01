import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Processo, StatusType, TimelineEvent, MovimentacaoGroup, Prazo } from '@/types';

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

  return {
    id: p.id,
    tribunal: p.tribunal.replace(/G[12]$/, ''),
    cnj: p.numero,
    parte,
    materia: p.summary?.vara ?? p.orgaoJulgador ?? '—',
    classeJudicial: p.classeJudicial ?? '—',
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

export async function getProcessos(page = 1, limit = 20, q?: string): Promise<ProcessoPage> {
  const term = q?.trim().toLowerCase();

  // Busca: o backend só filtra `numero` exato, então trazemos um conjunto amplo
  // e filtramos por substring em número, tribunal, parte e classe judicial.
  if (term) {
    const body: { data: BackendProcess[]; total: number } =
      await backendGet(`/processes?page=1&limit=100`);
    const filtrados = body.data
      .map(toProcesso)
      .filter(p =>
        p.cnj.toLowerCase().includes(term) ||
        p.tribunal.toLowerCase().includes(term) ||
        p.parte.toLowerCase().includes(term) ||
        (p.classeJudicial ?? '').toLowerCase().includes(term),
      );
    return { processos: filtrados, total: filtrados.length, totalPages: 1, page: 1 };
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

export async function getMovimentacoes(page = 1, limit = 20): Promise<MovimentacoesResult> {
  const movBody = await backendGet(`/movements?page=${page}&limit=${limit}`) as {
    data: BackendMovement[];
    total: number;
    page: number;
    totalPages: number;
  };

  // ordena pela data em que a movimentação ocorreu (ocorridoEm), mais recente primeiro
  const sorted = [...movBody.data].sort(
    (a, b) => new Date(b.ocorridoEm).getTime() - new Date(a.ocorridoEm).getTime(),
  );

  const groupMap = new Map<string, MovimentacaoGroup>();
  let newToday = 0;

  for (const m of sorted) {
    const proc = m.process;
    const detectedAt = new Date(m.detectedAt);
    const isNew = Date.now() - detectedAt.getTime() < 1000 * 60 * 60 * 48;
    if (isNew) newToday++;

    // agrupamento e horário derivam de ocorridoEm
    const ocorrido = new Date(m.ocorridoEm);
    const timeStr = `${String(ocorrido.getHours()).padStart(2,'0')}:${String(ocorrido.getMinutes()).padStart(2,'0')}`;

    const { dateLabel, dayLabel, dateKey } = formatDateGroup(ocorrido);

    if (!groupMap.has(dateKey)) {
      groupMap.set(dateKey, { date: dateLabel, day: dayLabel, items: [] });
    }
    groupMap.get(dateKey)!.items.push({
      id: m.id,
      tribunal: proc ? proc.tribunal.replace(/G[12]$/, '') : '—',
      cnj: proc ? proc.numero : '—',
      parte: processParte(proc),
      tipo: extractTipo(m.descricao),
      detail: m.descricao,
      time: timeStr,
      whats: { sent: false, reason: '—' },
      state: isNew ? 'signal' : 'quiet',
    });
  }

  return {
    groups: Array.from(groupMap.values()),
    total: movBody.total,
    totalPages: movBody.totalPages,
    page: movBody.page,
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

  const parte =
    d.process?.poloAtivo?.[0]?.nome?.trim() ||
    d.parte?.trim() ||
    '—';

  return {
    id: d.id,
    tribunal: d.process ? d.process.tribunal.replace(/G[12]$/, '') : '—',
    cnj: d.process?.numero ?? '—',
    parte,
    tipo: d.tipoDocumento,
    vencimento,
    diasRestantes: dias,
    state,
  };
}

/** Prazos pendentes (não fechados), ordenados do mais urgente ao menos urgente. */
export async function getPrazos(page = 1, limit = 100): Promise<Prazo[]> {
  const body = await backendGet(`/deadlines?fechado=false&sort=asc&page=${page}&limit=${limit}`) as {
    data: BackendDeadline[];
  };
  return body.data.map(toPrazo);
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
