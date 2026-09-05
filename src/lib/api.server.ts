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
  CategoriaMovimentacao,
  DocumentoMovimentacao,
  OrigemMovimentacao,
  LeituraIa,
  PrazoDoAto,
} from '@/types';
import { normalizeTribunalOptions, type TribunalOption } from '@/lib/tribunals';
import { semCodigo } from '@/lib/pje-text';
import { TIPOS_MOVIMENTACAO, type MovimentacaoSort } from '@/lib/movimentacao-filters';
import type { UsuarioAtual } from '@/lib/usuario';
import { wallClock, horaWallClock as horaDoAto } from '@/lib/wall-clock';

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

/** Grau exportado pelo backend: '1' | '2' | 'DJEN' (DJEN = ainda não confirmado). */
export function grauLabel(grau: string | undefined | null): string {
  if (grau === '1') return '1º';
  if (grau === '2') return '2º';
  if (grau === 'DJEN') return 'DJEN';
  return '';
}

type BackendProcess = {
  id: string;
  numero: string;
  tribunal: string;
  /** '1' | '2' | 'DJEN' — DJEN = grau ainda não confirmado (nem palpitado). Pode ser '1'/'2' tanto confirmado (origem scraper) quanto palpite (origem djen) — ver `origem`. */
  grau: string;
  /** `scraper` (robô autenticado) ou `djen` (descoberta pública do DJEN). */
  origem: 'scraper' | 'djen';
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
  /** Há certidão de andamento (documento do PROCESSO, só no STJ). */
  temCertidaoAndamento?: boolean;
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

  const grau = grauLabel(p.grau);

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
    origem: p.origem ?? '',
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
    temCertidaoAndamento: Boolean(p.temCertidaoAndamento),
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
  /** `scraper` (robô autenticado) ou `djen` (descoberta pública). */
  origem?: 'scraper' | 'djen' | string;
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
  appendQueryValue(params, 'origem', filters.origem);
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
  /**
   * O backend entrega este arquivo em `/movements/{id}/documento?i={índice}`.
   *
   * É o campo que destrava a maior parte do acervo público: `urlDocumento` vem
   * vazio em 475 das 532 movimentações com documento (medido em 05/09/2026),
   * porque o link durável do tribunal só é gravado quando a varredura busca o
   * inteiro teor do ato. `baixavel` diz que a chave existe e que o backend sabe
   * trocá-la por PDF. Ausente em backend anterior a 05/09/2026.
   */
  baixavel?: boolean;
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
  /**
   * De onde a linha veio. `djen` NÃO é um movimento do tribunal — é a
   * publicação do ato no diário, e desde 03/09/2026 é ela que faz a linha do
   * tempo pública. Ausente nas respostas de um backend anterior a essa data,
   * daí o opcional; `datajud` ainda pode chegar em linha ANTIGA, gravada antes
   * de ele deixar de produzir movimentação.
   */
  origem?: OrigemMovimentacao | null;
  /** A que serve a linha. Ausente em backend anterior a 05/09/2026. */
  categoria?: CategoriaMovimentacao | null;
  /** Leitura do ato pela IA — só a origem `djen` traz o inteiro teor para ler. */
  ia?: {
    resumo: string | null; acao: string | null;
    fundamento?: string | null; confianca?: string | null;
    deQuem: LeituraIa['deQuem']; analisadoEm: string | null;
  } | null;
  /** O prazo que este ato abriu. `null` quando não abriu — a maioria não abre. */
  prazo?: {
    id: string; dataLimite: string | null; dias: number | null;
    natureza: PrazoDoAto['natureza']; metodoPrazo: PrazoDoAto['metodoPrazo'];
    fechado: boolean;
  } | null;
  /** Só em `GET /movements/{id}`: a listagem omite o texto no banco. */
  textoOriginal?: string | null;
  /** Há certidão de publicação — a CHAVE nunca vem, só o fato. */
  temCertidao?: boolean;
  /**
   * Este ato tem o documento do TRIBUNAL — o PDF do despacho/acórdão —, servido
   * por `/movements/{id}/documento`. Distinto de `temCertidao`, que é a prova da
   * publicação no diário. Hoje só a origem `djen` em atos do STJ traz `true`:
   * no PJe o mesmo campo do DJEN aponta para uma página com captcha.
   */
  temDocumentoDoAto?: boolean;
  /**
   * O link do ato no site do tribunal — **e só quando ele NÃO é o documento**.
   * Quando é, o backend não o devolve (ele abre o PDF sem autenticação), e o
   * que chega é `temDocumentoDoAto`.
   */
  linkTribunal?: string | null;
  // processo relacionado, incluído pelo backend nas respostas de /movements
  process?: BackendProcess | null;
};

/**
 * A leitura da IA normalizada — `null` em tudo quando o backend não mandou o
 * bloco (versão antiga) ou quando a análise não rodou. Os dois casos são o
 * mesmo para a tela: não há resumo a mostrar.
 */
function toLeituraIa(m: BackendMovement): LeituraIa {
  return {
    resumo: m.ia?.resumo?.trim() || null,
    acao: m.ia?.acao?.trim() || null,
    fundamento: m.ia?.fundamento?.trim() || null,
    confianca: m.ia?.confianca?.trim() || null,
    deQuem: m.ia?.deQuem ?? null,
    analisadoEm: m.ia?.analisadoEm ?? null,
  };
}

/**
 * O prazo do ato, como a tela o consome.
 *
 * Prazo FECHADO devolve `null`: a linha do tempo mostra vencimento para o
 * advogado agir, e um prazo já encerrado exibido como "vence 24/09" cobra por
 * algo que não existe mais. Ele continua no processo, que é onde a agenda vive.
 */
/** Quanto tempo uma linha continua sendo "nova" depois de detectada. */
const JANELA_NOVIDADE_MS = 1000 * 60 * 60 * 48;

/**
 * Dias entre a PUBLICAÇÃO do ato e hoje para ele ainda contar como notícia.
 *
 * Existe porque `detectedAt` sozinho mente depois de uma varredura grande. O
 * backfill do DJEN cobre 2 ou 3 anos e grava tudo agora, então "detectado nas
 * últimas 48h" marcava **as vinte linhas da página** como NOVA — inclusive
 * publicações de 2024. Quando tudo é novo, nada é: o selo deixa de ser sinal e
 * vira decoração, e o advogado para de olhar para ele.
 *
 * Sete dias porque a pergunta que o selo responde é "saiu no diário agora?", e
 * o diário não publica no fim de semana — uma janela mais curta perderia a
 * sexta-feira quando o advogado abre o painel na segunda.
 */
const DIAS_ATO_RECENTE = 7;

/**
 * A linha é notícia, ou só chegou agora?
 *
 * As duas condições são necessárias: **detectada há pouco** (senão é linha
 * velha que já foi vista) e **publicada há pouco** (senão é histórico que o
 * backfill acabou de importar).
 */
function atoRecemPublicado(m: BackendMovement): boolean {
  const agora = Date.now();
  if (agora - new Date(m.detectedAt).getTime() >= JANELA_NOVIDADE_MS) return false;
  const publicado = new Date(m.ocorridoEm).getTime();
  if (!Number.isFinite(publicado)) return false;
  return agora - publicado < DIAS_ATO_RECENTE * 24 * 60 * 60 * 1000;
}

function toPrazoDoAto(m: BackendMovement): PrazoDoAto | null {
  const p = m.prazo;
  if (!p || p.fechado) return null;
  return {
    id: p.id,
    dataLimite: p.dataLimite,
    dias: p.dias,
    natureza: p.natureza,
    metodoPrazo: p.metodoPrazo,
    fechado: p.fechado,
  };
}

const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

/** Primeiro documento com URL — usado como link "abrir documento" da movimentação. */
function movLink(m: BackendMovement): string | null {
  // `linkTribunal` como saída: é o link do ato no site do tribunal quando ele
  // NÃO é o documento — na prática, a `ConsultaDocumento` do PJe, que pede
  // captcha. Vale como "ver no tribunal" e é rotulado assim na tela; antes de
  // 05/09/2026 ele não chegava aqui e o ato do diário não tinha saída nenhuma.
  return m.documentos?.find(d => d.urlDocumento)?.urlDocumento ?? m.linkTribunal ?? null;
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

  // a data exibida é sempre a de "ocorrido em" (ocorridoEm) do banco, lida como
  // wall-clock de Brasília — ver `wallClock`.
  const ocorrido = new Date(m.ocorridoEm);
  const w = wallClock(ocorrido);
  // O ANO entra porque a linha do tempo de um processo atravessa anos — o
  // acervo tem ato de 2023 ao lado de ato de 2026 — e "24 set" sozinho obriga
  // a inferir de qual deles se está falando pela posição na lista. É o único
  // lugar em que a data aparece sem contexto de agrupamento: o feed de
  // `/movimentacoes` tem o cabeçalho do dia por cima, esta timeline não tem.
  const displayDate = `${w.dia} ${MONTHS[w.mes]}`;
  const displayTime = horaDoAto(ocorrido);

  return {
    id: m.id,
    date: displayDate,
    ano: String(w.ano),
    time: displayTime,
    title: m.descricao,
    state: isNew ? 'signal' : 'quiet',
    // número do movimento no tribunal; sem ele, a posição na timeline
    // (index 0 = mais recente → número mais alto; índice final = mais antigo → § 01)
    n: m.nMovimento?.trim() || String(total - index).padStart(2, '0'),
    label: isNew ? 'NOVA' : undefined,
    rawDate: m.ocorridoEm,
    documentos: toDocumentos(m),
    temCertidao: Boolean(m.temCertidao),
    origem: m.origem ?? 'scraper',
    categoria: m.categoria ?? null,
    ia: toLeituraIa(m),
  };
}

/**
 * Documentos (e subdocumentos) prontos para virar links.
 *
 * **A regra de qual URL usar mudou em 05/09/2026, e é o conserto de um sumiço.**
 * Antes esta função filtrava por `urlDocumento` — e como o acervo público quase
 * nunca o tem (57 de 532 movimentações com documento), a tela mostrava "nenhum
 * documento" para processos cheios deles. Agora `baixavel` manda: o backend
 * serve o PDF por rota própria, e o proxy `/api/movimentacoes/{id}/documento`
 * leva o cookie que o link direto não levaria.
 *
 * `urlDocumento` continua sendo a saída para o que a rota não serve — os
 * documentos do scraper autenticado, que apontam para o PJe do tribunal.
 *
 * O índice é o da lista `documentos` do backend, e é por isso que os
 * subdocumentos são mapeados DEPOIS e por outro caminho: `?i=` endereça
 * `documentos[]`, não a concatenação das duas listas.
 */
function toDocumentos(m: BackendMovement): DocumentoMovimentacao[] {
  const principais = (m.documentos ?? []).map((d, i) => ({
    doc: d,
    url: d.baixavel
      ? `/api/movimentacoes/${encodeURIComponent(m.id)}/documento?i=${i}`
      : d.urlDocumento ?? '',
  }));
  const subs = (m.subDocumentos ?? []).map(d => ({ doc: d, url: d.urlDocumento ?? '' }));

  const doTribunal = [...principais, ...subs]
    .filter(item => Boolean(item.url))
    .map(item => ({
      nome: item.doc.tipoDocumento?.trim() || item.doc.nDocumento?.trim() || 'Documento',
      url: item.url,
    }));

  // A peça que NÃO vem em `documentos`: nas origens que não anexam nada à
  // movimentação — o STJ é o caso —, o documento é o link que o diário publicou,
  // e o backend só o entrega pela rota. Sem esta entrada, um ato com PDF
  // disponível aparecia como ato sem documento nenhum.
  if (m.temDocumentoDoAto) {
    doTribunal.push({
      nome: 'Documento do ato',
      url: `/api/movimentacoes/${encodeURIComponent(m.id)}/documento`,
    });
  }

  return doTribunal;
}

/**
 * Palavras-chave buscadas na descrição para classificar o tipo da movimentação,
 * em ordem de prioridade (a 1ª que casar decide o tipo de uma descrição com
 * mais de uma palavra-chave). "Concluso" é variante de grafia de "Conclusão" e
 * cai no mesmo tipo canônico — por isso a lista de busca tem uma entrada a mais
 * que `TIPOS_MOVIMENTACAO` (a lista canônica, usada no filtro da página).
 */
const TIPO_KEYWORDS: { match: string; tipo: (typeof TIPOS_MOVIMENTACAO)[number] }[] = [
  { match: 'Acórdão', tipo: 'Acórdão' },
  { match: 'Audiência', tipo: 'Audiência' },
  { match: 'Certidão', tipo: 'Certidão' },
  { match: 'Conclusão', tipo: 'Conclusão' },
  { match: 'Concluso', tipo: 'Conclusão' },
  { match: 'Despacho', tipo: 'Despacho' },
  { match: 'Embargo', tipo: 'Embargo' },
  { match: 'Intimação', tipo: 'Intimação' },
  { match: 'Juntada', tipo: 'Juntada' },
  { match: 'Publicação', tipo: 'Publicação' },
  { match: 'Recurso', tipo: 'Recurso' },
  { match: 'Sentença', tipo: 'Sentença' },
];

function extractTipo(descricao: string): string {
  const lower = descricao.toLowerCase();
  for (const { match, tipo } of TIPO_KEYWORDS) {
    if (lower.includes(match.toLowerCase())) return tipo;
  }
  return descricao.trim().split(/\s+/)[0] || 'Movimentação';
}

const WEEKDAYS = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
const MONTHS_SHORT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

function formatDateGroup(d: Date): { dateLabel: string; dayLabel: string; dateKey: string } {
  const w = wallClock(d);
  const dd = String(w.dia).padStart(2,'0');
  const mm = String(w.mes + 1).padStart(2,'0');
  const dateKey = `${w.ano}-${mm}-${dd}`;

  // "Hoje" e "ontem" também são wall-clock de Brasília: comparar com o relógio
  // do servidor (que pode estar em UTC) faria a etiqueta virar à meia-noite
  // errada — 21:00 daqui.
  const agora = wallClock(new Date(Date.now() - 3 * 60 * 60 * 1000));
  const chaveHoje = `${agora.ano}-${String(agora.mes + 1).padStart(2,'0')}-${String(agora.dia).padStart(2,'0')}`;
  const ontem = new Date(Date.UTC(agora.ano, agora.mes, agora.dia - 1));
  const chaveOntem = `${ontem.getUTCFullYear()}-${String(ontem.getUTCMonth() + 1).padStart(2,'0')}-${String(ontem.getUTCDate()).padStart(2,'0')}`;

  if (dateKey === chaveHoje)  return { dateLabel: 'HOJE',  dayLabel: `${dd}.${mm}`, dateKey };
  if (dateKey === chaveOntem) return { dateLabel: 'ONTEM', dayLabel: `${dd}.${mm}`, dateKey };
  return {
    dateLabel: `${w.dia} ${MONTHS_SHORT[w.mes].toUpperCase()}`,
    dayLabel: WEEKDAYS[w.diaDaSemana],
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
  /** Tribunal(is) em CSV ou lista (ex.: "TRF1,TJDFT"). Filtrado no backend. */
  tribunal?: CsvFilter;
  /**
   * Tipo(s) canônico(s) (ex.: "Intimação") — sem campo próprio no banco, é
   * inferido da descrição no frontend (`extractTipo`), então é aplicado sobre
   * a página carregada, não no backend.
   */
  tipo?: readonly string[];
  /**
   * Categoria(s) do ato — filtrado NO BANCO, ao contrário de `tipo`. Vazio
   * deixa valer o padrão da API, que esconde `tramite`.
   */
  categoria?: readonly string[];
  /** "" = mais recentes | "antigas" | "tribunal" — "tribunal" exige reordenar no frontend. */
  sort?: MovimentacaoSort | string;
};

/** Movimentação + data de ocorrência, para ordenar antes de agrupar. */
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
    default: // mais recentes
      entries.sort((a, b) => b.ocorrido.getTime() - a.ocorrido.getTime());
  }
}

/**
 * `/movements` filtra e ordena no banco por `q`, `tribunal` e direção de
 * `ocorridoEm` — nesse caso a página vem pronta do backend. `tipo` (inferido
 * da descrição) e a ordenação por tribunal não são suportados lá, então esses
 * dois casos buscam um conjunto amplo (limit=100) e resolvem aqui, colapsando
 * em 1 página — mesma técnica de `getPrazos` para os "contém" que o backend
 * não filtra.
 */
export async function getMovimentacoes(page = 1, limit = 20, filters: MovimentacaoFilters = {}): Promise<MovimentacoesResult> {
  const { q, tribunal, sort, categoria } = filters;
  const tipo = filters.tipo ?? [];
  const needsClientSide = tipo.length > 0 || sort === 'tribunal';

  const fetchPage = needsClientSide ? 1 : page;
  const fetchLimit = needsClientSide ? 100 : limit;

  const params = new URLSearchParams({
    page: String(Math.max(1, Math.trunc(fetchPage))),
    limit: String(Math.max(1, Math.trunc(fetchLimit))),
    sort: sort === 'antigas' ? 'asc' : 'desc',
  });
  appendQueryValue(params, 'q', q);
  appendQueryValue(params, 'tribunal', tribunal);
  if (categoria?.length) params.set('categoria', categoria.join(','));

  const movBody = await backendGet(`/movements?${params.toString()}`) as {
    data: BackendMovement[];
    total: number;
    page: number;
    totalPages: number;
  };

  let entries: MovEntry[] = movBody.data.map(m => {
    const proc = m.process;
    const isNew = atoRecemPublicado(m);
    const ocorrido = new Date(m.ocorridoEm);
    const timeStr = horaDoAto(ocorrido);
    const item: Movimentacao = {
      id: m.id,
      tribunal: proc ? proc.tribunal.replace(/G[12]$/, '') : '—',
      cnj: proc ? proc.numero : '—',
      orgaoJulgador: proc?.orgaoJulgador?.trim() || '—',
      // parte e assunto são independentes — um não faz fallback pro outro,
      // pra UI poder mostrar os dois (mesma convenção de `toPrazo`).
      parte: processParte(proc),
      assunto: proc?.assunto?.trim() || '',
      tipo: extractTipo(m.descricao),
      detail: m.descricao,
      time: timeStr,
      state: isNew ? 'signal' : 'quiet',
      origem: m.origem ?? 'scraper',
      categoria: m.categoria ?? null,
      ia: toLeituraIa(m),
      prazo: toPrazoDoAto(m),
    };
    return { item, ocorrido, isNew };
  });

  // "novas (48h)" reflete o conjunto trazido do backend, antes do filtro de tipo
  const newToday = entries.filter(e => e.isNew).length;

  if (tipo.length) entries = entries.filter(({ item }) => tipo.includes(item.tipo));

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
    total: needsClientSide ? entries.length : movBody.total,
    totalPages: needsClientSide ? 1 : movBody.totalPages,
    page: needsClientSide ? 1 : movBody.page,
    newToday,
  };
}

export type MovimentacaoDetail = {
  id: string;
  data: string;
  /** Rótulo do ato ("Despacho — 8ª Turma Cível"). O conteúdo está em `ia.resumo`. */
  descricao: string;
  link: string | null;
  detectedAt: string;
  origem: OrigemMovimentacao;
  /** Leitura do ato pela IA — só a origem `djen` traz o inteiro teor para ler. */
  ia: LeituraIa;
  /** O prazo que este ato abriu, em aberto. `null` quando não abriu ou já fechou. */
  prazo: PrazoDoAto | null;
  /**
   * O ato ÍNTEGRO, como o diário publicou. `null` fora da origem `djen`, a
   * única que traz o inteiro teor.
   */
  textoOriginal: string | null;
  /** ISO do ato — a data em que ele saiu no diário, não a de detecção. */
  ocorridoEm: string;
  /**
   * Há certidão de publicação deste ato — o PDF oficial do CNJ.
   *
   * A chave que o abre nunca chega ao front: ela vale numa rota pública do CNJ
   * sem autenticação, então o download passa por `/api/movimentacoes/{id}/certidao`,
   * que confere a sessão antes de repassar.
   */
  temCertidao: boolean;
  /**
   * As peças anexadas ao ato — despacho, decisão, certidão, petição.
   *
   * `url` já vem resolvida por `toDocumentos`: o proxy desta aplicação quando o
   * backend serve o PDF, o link do tribunal quando não. Vazia quando a
   * movimentação não tem documento — que é o caso das linhas de puro trâmite.
   */
  documentos: DocumentoMovimentacao[];
  /**
   * Chegou agora E saiu no diário há pouco — ver `atoRecemPublicado`.
   *
   * Calculado AQUI, na busca, e não no componente: `Date.now()` no corpo de um
   * Server Component é chamada impura durante o render (o ESLint do Next 16
   * reprova), e a resposta é sobre o dado, não sobre a árvore. O feed já fazia
   * assim — o detalhe estava sozinho no outro caminho.
   */
  novo: boolean;
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
  const w = wallClock(d);
  const dd = String(w.dia).padStart(2, '0');
  const mm = String(w.mes + 1).padStart(2, '0');
  const data = `${dd}/${mm}/${w.ano}`;
  // Ato só com data — a publicação no diário é o caso — não ganha "00:00", que
  // seria um horário inventado.
  if (w.semHorario) return data;
  return `${data} ${String(w.hora).padStart(2, '0')}:${String(w.minuto).padStart(2, '0')}`;
}

export async function getMovimentacao(id: string): Promise<MovimentacaoDetail | null> {
  const m = await backendGetOrNull<BackendMovement>(`/movements/${id}`);
  if (!m) return null;

  const proc = m.process ?? null;
  const processData = proc
    ? {
        ...proc,
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
    ocorridoEm: m.ocorridoEm,
    novo: atoRecemPublicado(m),
    temCertidao: Boolean(m.temCertidao),
    documentos: toDocumentos(m),
    origem: m.origem ?? 'scraper',
    ia: toLeituraIa(m),
    prazo: toPrazoDoAto(m),
    textoOriginal: m.textoOriginal?.trim() || null,
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
  movementId: string | null;
  process?: {
    numero: string;
    tribunal: string;
    grau: string;
    origem: 'scraper' | 'djen';
    orgaoJulgador: string | null;
    assunto?: string | null;
    poloAtivo: BackendParte[] | null;
  } | null;
};

/** Dias corridos entre agora e a dataLimite (arredondado para cima, mínimo 0). */
/**
 * Dias corridos até o vencimento. **Negativo quando já venceu** — e é aí que
 * mora a correção.
 *
 * Havia um `Math.max(0, …)` grampeando o resultado em zero, então **todo prazo
 * vencido era exibido como "vence hoje"**, em vermelho. Um prazo de 24/05
 * aparecia como vencendo em 04/09. É o pior erro possível num campo de prazo:
 * não é só impreciso, é o oposto do que aconteceu, e ensina o advogado a não
 * confiar no selo.
 *
 * O grampo também apagava três decisões que dependem do sinal:
 *  - `prazosAbertos` filtra `diasRestantes >= 0`, então nenhum vencido saía;
 *  - a contagem de `criticos` (`<= 3`) engolia o acervo vencido inteiro;
 *  - `prazoLabel` tem um ramo `dias < 0 → 'vencido'` que nunca era alcançado.
 *
 * A conta é por DIA DE CALENDÁRIO, não por diferença de horas: `dataLimite`
 * chega como meia-noite UTC do dia certo, e subtrair `Date.now()` cru faria um
 * prazo de amanhã às 00:00 valer "0 dias" durante toda a tarde de hoje. O
 * offset de Brasília entra pelo mesmo motivo que em `vencimentoDoAto`.
 */
function diasAteVencimento(dataLimite: string): number {
  const limite = new Date(dataLimite);
  const diaLimite = Date.UTC(limite.getUTCFullYear(), limite.getUTCMonth(), limite.getUTCDate());
  const agora = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const hoje = Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate());
  return Math.round((diaLimite - hoje) / 86_400_000);
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
    grau: d.process ? grauLabel(d.process.grau) : '',
    origem: d.process?.origem ?? '',
    cnj: d.process?.numero ?? '—',
    orgaoJulgador: d.process?.orgaoJulgador?.trim() || '—',
    parte,
    assunto: d.process?.assunto?.trim() || '',
    tipo: semCodigo(d.tipoDocumento),
    natureza: d.natureza ?? null,
    vencimento,
    vencimentoISO,
    diasRestantes: dias,
    movementId: d.movementId ?? null,
    state,
  };
}

export type PrazoFilters = {
  q?: string;
  /** Tribunais em CSV ou lista (ex.: "TRF1,TJDFT"). */
  tribunal?: CsvFilter;
  grau?: '1' | '2' | string;
  /** `scraper` (robô autenticado) ou `djen` (descoberta pública). Aplicado sobre a página carregada — ver `filtraPrazos`. */
  origem?: 'scraper' | 'djen' | string;
  /** Faixa de dias até o fatal: crítico ≤3, urgente ≤7, atenção ≤14, normal >14. */
  urgencia?: string;
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
  sort?: 'fatal' | 'tribunal' | 'cliente' | 'expediente' | string;
  order?: 'asc' | 'desc' | string;
};

export type PrazoPage = {
  prazos: Prazo[];
  /** Total após todos os filtros. */
  total: number;
  /** Quantos vencem em ≤3 dias — alimenta o alerta crítico. */
  criticos: number;
};

const contem = (valor: string, termo?: string) =>
  !termo || valor.toLowerCase().includes(termo.trim().toLowerCase());

function filtraPrazos(list: Prazo[], f: PrazoFilters): Prazo[] {
  const tribunais: readonly string[] = typeof f.tribunal === 'string'
    ? f.tribunal.split(',').map(item => item.trim()).filter(Boolean)
    : f.tribunal ?? [];

  return list.filter(p => {
    if (tribunais.length && !tribunais.includes(p.tribunal)) return false;
    if (f.grau) {
      const grauEsperado = f.grau === 'djen' ? 'DJEN' : `${f.grau}º`;
      if (p.grau !== grauEsperado) return false;
    }
    if (f.origem && p.origem !== f.origem) return false;

    const exigeData = Boolean(f.urgencia || f.fatalFrom || f.fatalTo);
    if (exigeData && (p.diasRestantes === null || !p.vencimentoISO)) {
      return false;
    }

    if (f.urgencia === 'critico' && p.diasRestantes! > 3)  return false;
    if (f.urgencia === 'urgente' && p.diasRestantes! > 7)  return false;
    if (f.urgencia === 'atencao' && p.diasRestantes! > 14) return false;
    if (f.urgencia === 'normal'  && p.diasRestantes! <= 14) return false;

    if (f.fatalFrom && p.vencimentoISO! < f.fatalFrom) return false;
    if (f.fatalTo   && p.vencimentoISO! > f.fatalTo)   return false;

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
 * tribunal, grau, urgência e os "contém" restantes são aplicados aqui
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
 *
 * `categorias` vazio deixa o padrão do backend valer — que **esconde o trâmite
 * de cartório**. Passar categorias troca o filtro; `['todas']` desliga.
 */
export async function getProcessoMovements(
  processId: string,
  limit = 20,
  categorias: readonly string[] = [],
): Promise<ProcessoMovements> {
  const take = Math.min(Math.max(1, Math.trunc(limit)), 100);
  const filtro = categorias.length ? `&categoria=${encodeURIComponent(categorias.join(','))}` : '';
  const body = await backendGetOrNull<{ data: BackendMovement[]; total: number }>(
    `/movements?processId=${processId}&sort=desc&page=1&limit=${take}${filtro}`
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

/**
 * Os tribunais **da carteira de quem está pedindo** — o que alimenta o filtro
 * por tribunal em /processos, /movimentacoes e /prazos.
 *
 * Não confundir com `GET /tribunals`, o catálogo do que a plataforma sabe
 * varrer — que é o que estas três telas usavam. O catálogo respondia a pergunta
 * errada nas duas direções: oferecia dez caixas de seleção para uma carteira de
 * dois tribunais e não listava os que só existem pelas fontes públicas (TJSP,
 * TRTs, TREs, que chegam pelo DJEN e não estão no enum do backend). Ele segue
 * valendo onde a pergunta é "o que dá para conectar" — mas quem responde isso
 * no front é `getTribunaisStatus()`, e por isso o catálogo não é mais lido
 * daqui.
 *
 * Sem fallback, de propósito: se o backend não responde, a resposta honesta é
 * "não sei quais são" (lista vazia, e o filtro some), não o catálogo inteiro —
 * que é exatamente a lista errada que esta função existe para não mostrar.
 */
export async function getTribunaisDaCarteira(): Promise<TribunalOption[]> {
  try {
    const body = await backendGet('/processes/tribunais') as { tribunals?: unknown };
    return normalizeTribunalOptions(body?.tribunals);
  } catch (err: unknown) {
    if (err instanceof Error && err.message?.includes('NEXT_REDIRECT')) {
      throw err;
    }
    console.error('Falha ao buscar os tribunais da carteira no backend:', err);
    return [];
  }
}

export type { ScraperSecretView } from '@/lib/credenciais';
import type { ScraperSecretView } from '@/lib/credenciais';

/**
 * Credenciais do usuário (`GET /users/me/secrets`). Sem dataset de fallback:
 * uma credencial inventada faria a tela de cobertura mentir sobre o que está
 * realmente cadastrado.
 */
export async function getScraperSecrets(): Promise<ScraperSecretView[]> {
  try {
    const body = await backendGet('/users/me/secrets');
    return Array.isArray(body) ? body as ScraperSecretView[] : [];
  } catch (err: unknown) {
    if (err instanceof Error && err.message?.includes('NEXT_REDIRECT')) {
      throw err;
    }
    console.error('Falha ao buscar credenciais no backend:', err);
    return [];
  }
}

/**
 * Quem está logado. Mesma disciplina dos outros `get*`: 401 vira
 * `redirect('/login')`, porque só telas autenticadas perguntam isso.
 *
 * O par client-side é `useUsuarioAtual` (menu). São dois caminhos para o mesmo
 * dado de propósito: o menu vive dentro de um Client Component e o painel
 * precisa da resposta antes de decidir o que renderizar.
 */
export async function getUsuarioAtual(): Promise<UsuarioAtual> {
  return await backendGet('/users/me') as UsuarioAtual;
}

