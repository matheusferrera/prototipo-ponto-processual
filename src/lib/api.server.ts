import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type {
  AnaliseDoCaso,
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
  AtoDoPrazo,
  AnalisePrazo,
  AnalisePrazoResultado,
} from '@/types';
import { normalizeTribunalOptions, type TribunalOption } from '@/lib/tribunals';
import { semCodigo } from '@/lib/pje-text';
import { TIPOS_MOVIMENTACAO, type MovimentacaoSort } from '@/lib/movimentacao-filters';
import type { UsuarioAtual } from '@/lib/usuario';
import { wallClock, horaWallClock as horaDoAto } from '@/lib/wall-clock';
import { diasAteVencimento } from '@/lib/prazo-apresentacao';

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
  nextDeadline?: BackendNextDeadline | null;
  /**
   * A análise do CASO — `ProcessView.analise`, servida pelo backend desde
   * 07/09/2026 e que o front **nunca leu**: `toProcesso` simplesmente a
   * ignorava, então a síntese ficava paga no banco e invisível na tela.
   */
  analise?: {
    tipo: string; versao: number; atualizadaEm: string; modelo: string;
    resultado: Record<string, unknown>;
  } | null;
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

/**
 * O envelope de `Analise` → a síntese que a tela mostra.
 *
 * Tolerante de propósito: o payload vem do modelo e o parse estrito mora no
 * backend (`AnaliseCaso`, com `.catch()` nos enums pela mesma razão). Aqui, o
 * que falta vira ausência — nunca uma tela quebrada por um campo a menos numa
 * análise que já foi paga.
 */
function toAnaliseCaso(a: BackendProcess['analise']): AnaliseDoCaso | null {
  const r = a?.resultado as Partial<AnaliseDoCaso> | undefined;
  if (!r?.sintese?.trim()) return null;
  return {
    sintese: r.sintese.trim(),
    fase: r.fase ?? 'indefinido',
    situacao: r.situacao?.trim() ?? '',
    pedidoPrincipal: r.pedidoPrincipal?.trim() || null,
    ultimaDecisao: r.ultimaDecisao ?? null,
    pendencias: Array.isArray(r.pendencias) ? r.pendencias.filter(Boolean) : [],
    proximoPassoProvavel: r.proximoPassoProvavel?.trim() || null,
    pontosDeAtencao: Array.isArray(r.pontosDeAtencao) ? r.pontosDeAtencao.filter(Boolean) : [],
    confianca: r.confianca ?? 'baixa',
    atualizadaEm: a?.atualizadaEm ?? null,
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
    analiseCaso: toAnaliseCaso(p.analise),
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
  /** As mesmas contagens no formato que a barra de resumo consome. */
  contagem: { todos: number; novidade: number; erro: number };
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
    // Os números da carteira COMO FILTRO — a barra de resumo os transforma em
    // chips clicáveis. `todos` é o conjunto filtrado inteiro, ignorando o
    // filtro de estado, e por isso vem do `total` e não da página.
    contagem: {
      todos: body.total,
      novidade: body.counts?.signal ?? 0,
      erro: body.counts?.alert ?? 0,
    },
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
  /**
   * Motivo de o documento não ter link nem ser `baixavel` — hoje só
   * `'pendenteCiencia'` (PJe de consulta pública, TRF1/TRF3): a grid do
   * tribunal mostra a âncora, mas o clique dispara `alert('Visualização
   * indisponível. Pendente de ciência…')` — o documento existe, só não está
   * liberado enquanto o intimado não toma ciência no sistema do tribunal.
   * Presente ⇒ documento TRANCADO, não ausente.
   */
  indisponibilidade?: string | null;
  /**
   * A aquisição já pediu este arquivo e o portal não o serviu — ou o rótulo é
   * o fallback genérico do PDPJ, que a sondagem mediu como 404 em 3 de 3.
   *
   * O backend calcula isto desde 08/09/2026 lendo o livro-razão de `Documento`
   * (ver `documento-baixavel.ts`), e o front simplesmente não lia: oferecia o
   * botão para todos e o advogado clicava em erro quase sempre.
   */
  provavelIndisponivel?: boolean;
};

type BackendMovement = {
  /** Fontes que confirmaram o ato (`["pdpj","djen"]`). `[]` em linha legada. */
  fontes?: string[];
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
  /**
   * **A resposta do backend para "vale mostrar o botão de documento, e o quê?"**
   *
   * Ela é calculada uma vez, lá, por `estadoDocumento` — que é a única camada
   * que enxerga o livro-razão de `Documento` (quais chaves já responderam 404).
   * O `CLAUDE.md` do backend a criou justamente para o front parar de refazer
   * essa conta, e até 08/09/2026 o front não a lia: `temDocumentoTrancado`
   * reimplementava um pedaço dela aqui, sem acesso à medição.
   *
   * Opcional porque backend anterior a 06/09/2026 não a serve — nesse caso os
   * helpers abaixo caem na conta local, que é o comportamento de antes e não
   * uma tela vazia.
   */
  documentoEstado?: 'nenhum' | 'disponivel' | 'provavelIndisponivel' | 'trancado';
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
    publicadoEm?: string | null; parte?: string | null;
    origem?: PrazoDoAto['origem']; canal?: PrazoDoAto['canal']; deQuem?: PrazoDoAto['deQuem'];
    emDobro?: boolean | null; fundamento?: string | null;
  } | null;
  /** Só em `GET /movements/{id}`: a listagem omite o texto no banco. */
  textoOriginal?: string | null;
  /**
   * Disponibilidade do texto, informada pela API SEM transferir o texto na
   * listagem (que omite `textoOriginal` no banco — ver acima). A listagem
   * sempre manda este campo; ausente só em backend anterior à instrumentação.
   */
  temInteiroTeor?: boolean;
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
  // **O prazo FECHADO passa** desde 08/09/2026. Ele era descartado aqui, e o
  // efeito era a movimentação não ter como dizer "Encerrado": o dado nem
  // chegava à linha, então o ato que abriu e cumpriu um prazo ficava
  // indistinguível do que nunca abriu nenhum.
  //
  // Quem decide o que fazer com ele é a TELA, que tem `fechado` no objeto —
  // `vencimentoDoAto` devolve `encerrado: true` e a linha desenha em tom
  // neutro, sem cor de urgência. `processo-panorama` já filtrava por
  // `prazo?.fechado`, então nada passou a cobrar o que está encerrado.
  if (!p) return null;
  return {
    id: p.id,
    dataLimite: p.dataLimite,
    dias: p.dias,
    natureza: p.natureza,
    metodoPrazo: p.metodoPrazo,
    fechado: p.fechado,
    // Os cinco abaixo só existem nas origens calculadas (djen/tribunalPublico) e
    // até 07/09/2026 o mapeador os descartava — o backend sempre os mandou (ver
    // `toMovementView` em `movements.router.ts`), mas a qualificação do prazo em
    // `AtoDetalhe` (`PrazoDoAto`, o componente) ficava sem "manifestação · pelo
    // diário · sem dobra · do destinatário" por falta de dado, não de código.
    origem: p.origem,
    canal: p.canal,
    deQuem: p.deQuem,
    emDobro: p.emDobro,
    fundamento: p.fundamento,
    publicadoEm: p.publicadoEm,
    parte: p.parte,
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
  // Montados no SERVIDOR a partir do wall-clock já lido, nunca reformatados no
  // componente: o servidor roda em UTC, e reformatar o ISO lá devolveria o dia
  // anterior para todo ato da noite.
  const diaISO = `${w.ano}-${String(w.mes + 1).padStart(2, '0')}-${String(w.dia).padStart(2, '0')}`;

  // O MESMO cabeçalho de dia do feed de `/movimentacoes` — ver `formatDateGroup`.
  // "HOJE" e "ONTEM" dispensam o ano; os demais o levam, porque a linha do
  // tempo de um processo atravessa anos.
  const grupo = formatDateGroup(ocorrido);
  const dataCurta = grupo.dateLabel === 'HOJE' || grupo.dateLabel === 'ONTEM'
    ? grupo.dateLabel
    : `${grupo.dateLabel} ${w.ano}`;

  return {
    id: m.id,
    date: displayDate,
    ano: String(w.ano),
    time: displayTime,
    title: m.descricao,
    // número do movimento no tribunal; sem ele, a posição na timeline
    // (index 0 = mais recente → número mais alto; índice final = mais antigo → § 01)
    n: m.nMovimento?.trim() || String(total - index).padStart(2, '0'),
    rawDate: m.ocorridoEm,
    documentos: toDocumentos(m),
    temCertidao: Boolean(m.temCertidao),
    // Ver `temAlgoParaLer`: texto extraído OU documento anexado. Sem isto o
    // campo ficava `undefined` em toda linha da timeline do processo, e o selo
    // "Com/Sem inteiro teor" simplesmente não aparecia antes de abrir o ato —
    // `MovimentacaoRow` só desenha o selo quando o valor está definido.
    // Dois fatos INDEPENDENTES, dois campos — ver `Movimentacao.temInteiroTeor`.
    temInteiroTeor: temTexto(m),
    documentoEstado: m.documentoEstado ?? 'nenhum',
    origem: m.origem ?? 'scraper',
    // As fontes que confirmaram o ato — o chip de origem da linha mostra as duas
    // quando o mesmo ato veio do diário e do portal.
    fontes: m.fontes ?? [],
    categoria: m.categoria ?? null,
    dataCurta,
    diaSemana: grupo.dayLabel,
    dia: diaISO,
    ia: toLeituraIa(m),
    // Sem isto, `TimelineEvent.prazo` ficava sempre `undefined` na timeline do
    // processo — o mesmo bug de `temInteiroTeor` antes do conserto: o campo
    // existe no tipo e `MovimentacaoRow` já sabe desenhar o chip de vencimento
    // a partir dele, mas ninguém nunca escrevia o valor aqui. O prazo só
    // aparecia depois de abrir o ato, quando `AtoLinha` troca para
    // `detalhe.prazo` — e o vencimento é justamente a informação que precisa
    // aparecer ANTES de abrir, no chip "Prazo · vence em 3 dias" da linha.
    prazo: toPrazoDoAto(m),
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
/** Mensagem para cada motivo de `indisponibilidade` — o código cru do backend não é para tela. */
const MOTIVO_TRANCADO: Record<string, string> = {
  pendenteCiencia: 'Pendente de ciência — o tribunal libera a visualização quando o intimado toma ciência no sistema.',
};

function toDocumentos(m: BackendMovement): DocumentoMovimentacao[] {
  const principais = (m.documentos ?? []).map((d, i) => ({
    doc: d,
    url: d.baixavel
      ? `/api/movimentacoes/${encodeURIComponent(m.id)}/documento?i=${i}`
      : d.urlDocumento ?? '',
  }));
  const subs = (m.subDocumentos ?? []).map(d => ({ doc: d, url: d.urlDocumento ?? '' }));

  const doTribunal = [...principais, ...subs]
    // Sem link E sem motivo de indisponibilidade não tem o que mostrar. Mas
    // um documento com `indisponibilidade` (ex.: pendente de ciência no PJe)
    // EXISTE — só está trancado —, e até 08/09/2026 este filtro o descartava
    // em silêncio: a lista de documentos simplesmente não mostrava a peça, em
    // vez de mostrá-la com o cadeado que `docUnavailable` já sabia desenhar.
    .filter(item => Boolean(item.url) || Boolean(item.doc.indisponibilidade))
    .map(item => ({
      nome: item.doc.tipoDocumento?.trim() || item.doc.nDocumento?.trim() || 'Documento',
      url: item.url,
      ...(item.doc.indisponibilidade
        ? { indisponibilidade: MOTIVO_TRANCADO[item.doc.indisponibilidade] ?? 'Documento indisponível nesta consulta.' }
        : {}),
      // Vem do backend, que mediu — ver `BackendDocumento.provavelIndisponivel`.
      ...(item.doc.provavelIndisponivel ? { provavelIndisponivel: true } : {}),
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
 * **Há TEXTO do ato.** Nada além disso.
 *
 * Era `temAlgoParaLer`, e o nome dizia a verdade sobre o defeito: ele
 * respondia "há algo pra abrir" — texto OU documento anexado —, e o selo da
 * linha usava essa resposta para escrever "Com inteiro teor". Ato do PDPJ com
 * um PDF sem texto extraído aparecia como se tivesse teor, e ao abrir dizia
 * "Indisponível". Os dois fatos passaram a ter dois sinais em 08/09/2026.
 *
 * `temInteiroTeor` vem do backend já resolvido sobre as DUAS procedências do
 * teor (o que o diário publicou e o que se extraiu do PDF — ver `teor-do-ato.ts`),
 * então aqui não há mais nada a inferir: na listagem o campo `textoOriginal` é
 * omitido e vale o booleano; no detalhe, o próprio texto.
 */
function temTexto(m: BackendMovement): boolean {
  return m.textoOriginal !== undefined
    ? Boolean(m.textoOriginal?.trim())
    : Boolean(m.temInteiroTeor);
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
  /**
   * A fonte que escreveu a linha (`pdpj` = portal, `djen` = diário) — filtrada
   * NO BANCO, um valor por vez, que é o que `?origem=` de `/movements` aceita.
   * Vazio traz todas.
   */
  origem?: OrigemMovimentacao | string;
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
 * `/movements` filtra e ordena no banco por `q`, `tribunal`, `categoria`,
 * `origem` e direção de `ocorridoEm` — nesse caso a página vem pronta do
 * backend. `tipo` (inferido
 * da descrição) e a ordenação por tribunal não são suportados lá, então esses
 * dois casos buscam um conjunto amplo (limit=100) e resolvem aqui, colapsando
 * em 1 página — mesma técnica de `getPrazos` para os "contém" que o backend
 * não filtra.
 */
export async function getMovimentacoes(page = 1, limit = 20, filters: MovimentacaoFilters = {}): Promise<MovimentacoesResult> {
  const { q, tribunal, sort, categoria, origem } = filters;
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
  appendQueryValue(params, 'origem', origem);
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
      fontes: m.fontes ?? [],
      categoria: m.categoria ?? null,
      ia: toLeituraIa(m),
      prazo: toPrazoDoAto(m),
      // Ver `temAlgoParaLer` — sem isto o feed nunca desenhava o selo de
      // inteiro teor: o campo nunca era escrito aqui, então ficava sempre
      // `undefined` e `MovimentacaoRow` some com o selo inteiro (não mostra
      // nem "Com" nem "Sem") quando o valor não está definido.
      // Dois fatos INDEPENDENTES, dois campos — ver `Movimentacao.temInteiroTeor`.
      temInteiroTeor: temTexto(m),
      documentoEstado: m.documentoEstado ?? 'nenhum',
    };
    return { item, ocorrido, isNew };
  });

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
  };
}

export type MovimentacaoDetail = {
  id: string;
  data: string;
  /** Número do movimento nos autos — o que se cita ao falar com o cartório. */
  nMovimento: string | null;
  /** Fontes que confirmaram ESTE ato (`["pdpj","djen"]`). `[]` em linha legada. */
  fontes: string[];
  /** Rótulo do ato ("Despacho — 8ª Turma Cível"). O conteúdo está em `ia.resumo`. */
  descricao: string;
  link: string | null;
  detectedAt: string;
  /** Ver `Movimentacao.documentoEstado` — o mesmo sinal, no detalhe do ato. */
  documentoEstado?: 'nenhum' | 'disponivel' | 'provavelIndisponivel' | 'trancado';
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
    documentoEstado: m.documentoEstado ?? 'nenhum',
    origem: m.origem ?? 'scraper',
    nMovimento: m.nMovimento ?? null,
    // Duas fontes independentes que trouxeram o MESMO ato valem mais que uma —
    // é o que a ficha do ato mostra como "confirmado por".
    fontes: m.fontes ?? [],
    ia: toLeituraIa(m),
    prazo: toPrazoDoAto(m),
    textoOriginal: m.textoOriginal?.trim() || null,
    processData,
  };
}

/** O documento anexado ao ato, como `/deadlines` o embute — mesma forma de `BackendDocumento`. */
type BackendDeadlineDocumento = {
  nDocumento?: string | null;
  tipoDocumento?: string | null;
  urlDocumento?: string | null;
  baixavel?: boolean;
};

/**
 * O ato, embutido na resposta de `/deadlines` — o mesmo recorte de
 * `BackendMovement`, sem `textoOriginal` (a listagem o omite no banco) nem
 * `subDocumentos` (o `select` do backend não os traz aqui).
 */
type BackendDeadlineMovimentacao = {
  id: string;
  ia?: {
    resumo: string | null; acao: string | null;
    fundamento?: string | null; confianca?: string | null;
    deQuem: LeituraIa['deQuem']; analisadoEm: string | null;
  } | null;
  documentos?: BackendDeadlineDocumento[] | null;
  temCertidao?: boolean;
  temDocumentoDoAto?: boolean;
  linkTribunal?: string | null;
} | null;

/** A leitura do PRAZO pela IA, como `AnaliseView` a devolve — ver `toAnaliseView` no backend. */
type BackendAnaliseView<T = unknown> = {
  tipo: string;
  versao: number;
  atualizadaEm: string;
  modelo: string;
  resultado: T;
} | null;

type BackendDeadline = {
  id: string;
  tipoDocumento: string;
  natureza: NaturezaPrazo | null;
  metodoPrazo?: PrazoDoAto['metodoPrazo'];
  parte: string | null;
  prazo: number | null;
  dataLimite: string | null;
  fechado: boolean;
  createdAt: string;
  processId: string;
  movementId: string | null;
  /** De onde o PRAZO veio — não confundir com `process.origem`. */
  origem?: PrazoDoAto['origem'];
  /**
   * Os cinco campos abaixo só existem nas origens calculadas (djen/tribunalPublico)
   * e, até 07/09/2026, morriam aqui: o tipo não os declarava e `toPrazo` não os
   * lia, embora `toDeadlineView` sempre os tenha mandado — era por isso que o
   * painel expandido da pauta não tinha nada além do que a grid do PJe entrega.
   */
  canal?: PrazoDoAto['canal'];
  deQuem?: PrazoDoAto['deQuem'];
  emDobro?: boolean | null;
  fundamento?: string | null;
  publicadoEm?: string | null;
  cienciaEm?: string | null;
  cienciaFicta?: boolean | null;
  /** O ato, embutido — ver `BackendDeadlineMovimentacao`. `null` sem ato gravado. */
  movimentacao?: BackendDeadlineMovimentacao;
  /** A leitura do PRAZO pela IA, quando em cache — nunca custa uma requisição a mais. */
  analise?: BackendAnaliseView;
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

/**
 * O ato, do ponto de vista do PRAZO — mesma lógica de resolução de `toDocumentos`
 * e `movLink`, adaptada ao recorte que `/deadlines` embute (sem `subDocumentos`).
 */
function toAtoDoPrazo(mov: BackendDeadlineMovimentacao): AtoDoPrazo | null {
  if (!mov) return null;

  const documentos = (mov.documentos ?? [])
    .map((d, i) => ({
      nome: d.tipoDocumento?.trim() || d.nDocumento?.trim() || 'Documento',
      url: d.baixavel
        ? `/api/movimentacoes/${encodeURIComponent(mov.id)}/documento?i=${i}`
        : d.urlDocumento ?? '',
    }))
    .filter(doc => Boolean(doc.url));

  // A peça que não vem em `documentos` (o STJ é o caso): o documento é o link
  // que o diário publicou, e só a rota o entrega — ver `movLink`/`toDocumentos`.
  if (mov.temDocumentoDoAto) {
    documentos.push({ nome: 'Documento do ato', url: `/api/movimentacoes/${encodeURIComponent(mov.id)}/documento` });
  }

  return {
    id: mov.id,
    ia: {
      resumo: mov.ia?.resumo?.trim() || null,
      acao: mov.ia?.acao?.trim() || null,
      fundamento: mov.ia?.fundamento?.trim() || null,
      confianca: mov.ia?.confianca?.trim() || null,
      deQuem: mov.ia?.deQuem ?? null,
      analisadoEm: mov.ia?.analisadoEm ?? null,
    },
    documentos,
    temCertidao: Boolean(mov.temCertidao),
    // O link do PJe só sai como saída própria quando ele NÃO é o documento —
    // quando é, `toDocumentos` já o incluiu acima via `temDocumentoDoAto`.
    link: (mov.documentos ?? []).find(d => d.urlDocumento)?.urlDocumento ?? mov.linkTribunal ?? null,
  };
}

/** A leitura do prazo pela IA, como a tela a consome — `null` fora de cache. */
function toAnalisePrazo(a: BackendAnaliseView<AnalisePrazoResultado>): AnalisePrazo | null {
  if (!a) return null;
  return { atualizadaEm: a.atualizadaEm, modelo: a.modelo, resultado: a.resultado };
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
    fechado: d.fechado,
    diasPrazo: d.prazo,
    origemPrazo: d.origem ?? null,
    metodoPrazo: d.metodoPrazo,
    fundamento: d.fundamento?.trim() || null,
    deQuem: d.deQuem ?? null,
    canal: d.canal ?? null,
    emDobro: d.emDobro ?? null,
    publicadoEm: d.publicadoEm ?? null,
    cienciaEm: d.cienciaEm ?? null,
    cienciaFicta: d.cienciaFicta ?? null,
    ato: toAtoDoPrazo(d.movimentacao ?? null),
    analise: toAnalisePrazo((d.analise ?? null) as BackendAnaliseView<AnalisePrazoResultado>),
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

/**
 * "Mais perto de vencer": primeiro o que ainda vai vencer, depois o que passou.
 *
 * Até 07/09/2026 a ordem `fatal` era por DATA ascendente, e isso era o mesmo
 * que "mais próximo" enquanto a lista trazia só o futuro. Quando a agenda parou
 * de cortar por data — 313 vencidos e 175 encerrados contra 12 a vencer, numa
 * conta real —, o topo da lista virou um prazo de 2020.
 *
 * A ordem é por FAIXA, e dentro dela por data:
 *
 * ```
 * 1. a vencer      o mais próximo primeiro   (vence amanhã antes de vence em 30d)
 * 2. vencidos      o mais RECENTE primeiro   (venceu ontem antes de venceu há 900d)
 * 3. encerrados    o mais recente primeiro
 * 4. sem data      no fim
 * ```
 *
 * O topo continua sendo o que estava lá antes — o que está vencendo —, e o que
 * passou aparece logo abaixo em vez de sumir. As duas últimas faixas não são
 * cosméticas: o encerrado é histórico e não pode empurrar um prazo vivo para
 * baixo, e o sem data não tem proximidade que se calcule — o lugar dele é
 * depois do que tem data, não antes por acidente do `null`.
 */
function faixaDaOrdem(p: Prazo): number {
  if (p.fechado) return 2;
  if (p.diasRestantes === null) return 3;
  return p.diasRestantes >= 0 ? 0 : 1;
}

export function sortPrazos(list: Prazo[], sort?: string, order?: string): void {
  const dir = order === 'desc' ? -1 : 1;
  const porFatal = (a: Prazo, b: Prazo) => {
    const fa = faixaDaOrdem(a);
    const fb = faixaDaOrdem(b);
    // A faixa manda, e `desc` não a inverte: "mais distante" muda a ordem
    // DENTRO da faixa, não troca o vencido de lugar com o que está por vencer.
    if (fa !== fb) return fa - fb;
    if (fa === 3) return 0;
    const da = a.diasRestantes ?? 0;
    const db = b.diasRestantes ?? 0;
    // A vencer: o menor número de dias primeiro. Vencido e encerrado: o maior
    // (isto é, o menos negativo — o que venceu mais recentemente).
    return fa === 0 ? dir * (da - db) : dir * (db - da);
  };

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
  /* **A página vem do fim, não do começo.** A ordem que a tela mostra é
     decidida no cliente (`sortPrazos`); o que este `sort` decide é QUAL fatia
     do acervo cabe na página. Com `asc` a fatia seria a dos prazos mais
     ANTIGOS — medido em 07/09/2026: de 773 prazos, os 500 primeiros em ordem
     ascendente traziam 371 vencidos, 129 encerrados e **zero** do que ainda
     vai vencer. A agenda perdia exatamente o que ela existe para mostrar. */
  const params = new URLSearchParams({
    page: String(Math.max(1, Math.trunc(page))),
    limit: String(Math.max(1, Math.trunc(limit))),
    sort: 'desc',
  });

  /* **A lista não corta por data.** Até 07/09/2026 ela mandava `from = agora`
     sempre, e o efeito era categórico: um prazo só é fechado PORQUE a data
     passou (`fecharPrazosDjenExpirados` fecha em `dataLimite < agora`), então
     "fechado" e "vence no futuro" eram conjuntos disjuntos — o filtro
     *Encerrados* e a coluna do kanban nunca podiam ter um item sequer. Medido:
     218 prazos fechados numa conta, 0 alcançáveis; 555 pendentes, 12 visíveis.

     O que sumia junto era pior que o encerrado: o prazo VENCIDO e ainda aberto
     — o que passou sem baixa, que é exatamente o que alguém precisa ver. Nada
     no sistema confere se o documento foi entregue (ver `fecharPrazosDjenExpirados`),
     então esconder o vencido era esconder trabalho, não ruído.

     Quem organiza agora é a tela: o kanban tem coluna para *Vencidos* e
     *Encerrados*, e o filtro *Expediente* separa pendente de fechado. */
  if (filters.fatalFrom) params.set('from', `${filters.fatalFrom}T00:00:00.000-03:00`);
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
/** Busca, faixa de datas, ordem e página da timeline de um processo. */
export interface FiltrosDaTimeline {
  /** Busca livre — `?q=` da listagem do backend. */
  q?: string;
  /** `YYYY-MM-DD` — `ocorridoEm >= from`. */
  from?: string;
  /** `YYYY-MM-DD` — `ocorridoEm <= to`. */
  to?: string;
  /** Padrão `desc`: a timeline começa pelo mais recente. */
  sort?: 'asc' | 'desc';
  /** 1-based, como o backend. */
  page?: number;
  /** `?comDocumento=true` do backend — só movimentações com `documentos`. */
  comDocumento?: boolean;
}

export async function getProcessoMovements(
  processId: string,
  limit = 20,
  categorias: readonly string[] = [],
  filtros: FiltrosDaTimeline = {},
): Promise<ProcessoMovements> {
  const take = Math.min(Math.max(1, Math.trunc(limit)), 100);
  const filtro = categorias.length ? `&categoria=${encodeURIComponent(categorias.join(','))}` : '';
  const query = new URLSearchParams({
    processId,
    sort: filtros.sort ?? 'desc',
    page: String(Math.max(1, Math.trunc(filtros.page ?? 1))),
    limit: String(take),
  });
  if (filtros.q) query.set('q', filtros.q);
  if (filtros.from) query.set('from', `${filtros.from}T00:00:00.000-03:00`);
  if (filtros.to) query.set('to', `${filtros.to}T23:59:59.999-03:00`);
  if (filtros.comDocumento) query.set('comDocumento', 'true');
  const body = await backendGetOrNull<{ data: BackendMovement[]; total: number }>(
    `/movements?${query.toString()}${filtro}`
  );
  if (!body) return { events: [], total: 0 };
  // O backend já ordena; reordenar aqui é a garantia de que a numeração de
  // fallback (`§ NN`) siga a mesma ordem em que a lista é montada.
  const asc = (filtros.sort ?? 'desc') === 'asc';
  const sorted = [...body.data].sort((a, b) => {
    const d = new Date(a.ocorridoEm).getTime() - new Date(b.ocorridoEm).getTime();
    return asc ? d : -d;
  });
  // a numeração de fallback usa o total do processo, não o que foi carregado:
  // assim o § de uma movimentação não muda ao clicar em "carregar mais"
  const total = body.total ?? sorted.length;
  return {
    events: sorted.map((m, i) => toTimelineEvent(m, i, total)),
    total,
  };
}

/**
 * Só a CONTAGEM de movimentações com documento — um `limit=1` filtrado por
 * `comDocumento`, então o custo é o de uma página, não o de varrer o acervo.
 *
 * Existe para o contador da aba "Documentos" aparecer nas OUTRAS abas também
 * (como "Movimentações 322" e "Prazos 3" já fazem): sem uma chamada dedicada,
 * o contador só existiria depois de abrir a aba, que é justamente a página
 * que carrega tudo.
 */
export async function getDocumentosCount(processId: string): Promise<number> {
  const r = await getProcessoMovements(processId, 1, ['todas'], { comDocumento: true });
  return r.total;
}

/**
 * TODAS as movimentações com documento de um processo — não só a primeira
 * página. Antes esta aba pedia até `MOVS_MAX` (100) movimentações QUAISQUER
 * (`comDocumento` não existia) para depois filtrar `documentos.length > 0`, e
 * o teto de 100 valia sobre o acervo INTEIRO, não sobre as documentadas: um
 * processo com 322 movimentações e 264 documentadas (medido em 07/09/2026,
 * `0717575-68.2024.8.07.0001`) tinha a aba truncada nas 100 mais recentes,
 * cortando até 164 peças em silêncio — pior ainda num processo onde as
 * movimentações recentes por acaso não têm documento, que via a aba vazia
 * com o acervo cheio de peças mais antigas.
 *
 * Filtrar `comDocumento=true` no backend resolve os dois problemas juntos: o
 * teto de 100 por página passa a valer sobre o conjunto já filtrado (bem
 * menor que o acervo inteiro), e a paginação por baixo busca as páginas que
 * faltarem até esgotar `total` — com um teto de segurança (`maxPaginas`) para
 * nunca virar uma varredura sem fim num acervo patológico.
 */
export async function getDocumentosDoProcesso(
  processId: string,
  maxPaginas = 10,
): Promise<ProcessoMovements> {
  const primeira = await getProcessoMovements(processId, 100, ['todas'], {
    comDocumento: true, page: 1,
  });
  const events = [...primeira.events];
  const paginasNecessarias = Math.min(Math.ceil(primeira.total / 100), maxPaginas);
  for (let page = 2; page <= paginasNecessarias; page++) {
    const pagina = await getProcessoMovements(processId, 100, ['todas'], {
      comDocumento: true, page,
    });
    events.push(...pagina.events);
  }
  return { events, total: primeira.total };
}

export interface CalendarioDoProcesso {
  dias: { dia: string; total: number }[];
  total: number;
  primeiroAno: number | null;
  ultimoAno: number | null;
}

/**
 * Quantas movimentações cada dia do processo teve — a agregação que o calendário
 * pinta.
 *
 * Vem do backend agregada (`GET /movements/por-dia`), e não derivada da lista
 * carregada na tela: a timeline mostra 50 de cada vez, então derivar dela
 * pintaria o calendário só do pedaço que já foi rolado — e o mapa de um processo
 * de 37 anos apareceria como duas semanas.
 *
 * `categoria` viaja igual ao da lista (inclusive o `todas`) porque o calendário
 * tem de pintar o MESMO conjunto que a timeline mostra: um dia aceso que a lista
 * não tem leva a um clique que não devolve nada.
 */
export async function getCalendarioDoProcesso(
  processId: string,
  categoria?: string,
): Promise<CalendarioDoProcesso> {
  const query = new URLSearchParams({ processId });
  if (categoria) query.set('categoria', categoria);
  const body = await backendGetOrNull<CalendarioDoProcesso>(`/movements/por-dia?${query}`);
  return body ?? { dias: [], total: 0, primeiroAno: null, ultimoAno: null };
}

export interface AtividadeDiaria {
  /** Um item por dia COM movimentação — dia sem nada não vem. */
  dias: { dia: string; total: number }[];
  /** Soma da janela, não do acervo. */
  total: number;
  /** Quantos dias a janela cobre — o backend limita a 90. */
  janela: number;
}

/**
 * O pulso do acervo inteiro nos últimos N dias — o que o heatmap do painel pinta.
 *
 * Agregada no backend (`GET /movements/atividade`), pelo mesmo motivo do
 * calendário do processo: derivar da lista carregada pintaria só a página que a
 * tela já tem. Dia sem movimentação não volta, então quem consome preenche o
 * vazio com zero (ver o `atividadeMap` do painel).
 */
export async function getAtividadeDiaria(dias = 30): Promise<AtividadeDiaria> {
  const janela = Math.min(Math.max(1, Math.trunc(dias)), 90);
  const body = await backendGetOrNull<AtividadeDiaria>(`/movements/atividade?dias=${janela}`);
  return body ?? { dias: [], total: 0, janela };
}

/** Prazos de um processo, do vencimento mais próximo ao mais distante. */
export async function getProcessoPrazos(processId: string): Promise<Prazo[]> {
  const body = await backendGetOrNull<{ data: BackendDeadline[] }>(
    `/deadlines?processId=${processId}&sort=asc&page=1&limit=100`
  );
  if (!body) return [];
  return body.data.map(toPrazo);
}

/**
 * O DOSSIÊ DE IA de um processo — `GET /processes/{id}/analises`.
 *
 * Uma chamada para os três níveis (caso, prazos, atos) porque eles moram em
 * lugares diferentes no backend e a aba precisa dos três juntos: o caso e os
 * prazos vêm da tabela `Analise`, os atos das colunas da própria movimentação.
 * Buscá-los separadamente seriam três idas e três formatos para montar uma tela.
 *
 * `null` quando o backend não responde — a aba mostra o estado vazio em vez de
 * quebrar a página inteira do processo.
 */
export interface AnaliseEnvelope {
  tipo: string;
  versao: number;
  atualizadaEm: string;
  modelo: string;
  resultado: Record<string, unknown>;
}

export interface DossieDeIa {
  caso: AnaliseEnvelope | null;
  prazos: {
    id: string;
    tipoDocumento: string;
    dataLimite: string | null;
    prazo: number | null;
    fechado: boolean;
    peca: string | null;
    analisadoEm: string | null;
    analise: AnaliseEnvelope | null;
  }[];
  atos: {
    id: string;
    ocorridoEm: string;
    descricao: string;
    categoria: string | null;
    resumoIa: string | null;
    acaoIa: string | null;
    fundamentoIa: string | null;
    confiancaIa: string | null;
    deQuemIa: string | null;
    analisadoEm: string | null;
  }[];
  cobertura: {
    movimentacoes: number;
    /** Quantas TÊM texto — o denominador honesto. Ver a rota no backend. */
    movimentacoesLegiveis: number;
    movimentacoesLidas: number;
    prazos: number;
    prazosLidos: number;
    casoLido: boolean;
  };
}

export async function getAnalisesDoProcesso(processId: string): Promise<DossieDeIa | null> {
  // `GET /ia/processos/{id}` desde 07/09/2026 — era `/processes/{id}/analises`.
  // O caminho antigo virou 404 no backend, e como `backendGetOrNull` trata 404
  // como "ainda não há análise", a aba passou a dizer "a IA não leu nada deste
  // processo" para todo processo, inclusive os lidos. Erro mudo: nem a página
  // quebrava, nem o log acusava.
  return backendGetOrNull<DossieDeIa>(`/ia/processos/${processId}`);
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

