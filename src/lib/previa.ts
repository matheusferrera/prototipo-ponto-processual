/**
 * Prévia pública por OAB — espelha `PreviaOab` de `backend-movijus`
 * (`src/features/public/public.previa.ts`). Mudança de contrato lá exige
 * atualizar aqui.
 *
 * Só tipos e funções puras: este arquivo é importado por Client Components,
 * então nada de `next/headers` ou `fetch` de servidor (isso vive em
 * `previa.server.ts`).
 */

export interface PreviaProcesso {
  cnj: string;
  tribunal: string;
  classe: string | null;
  orgao: string | null;
  /** `yyyy-mm-dd` */
  ultimaPublicacao: string;
  publicacoes: number;
  cliente: string | null;
}

export interface PreviaTribunal {
  sigla: string;
  processos: number;
}

export interface PreviaOab {
  /** Nome como o DJEN grafa (caixa alta, acentos bagunçados) — passe por `nomeProprio` antes de exibir. */
  advogado: string | null;
  totalProcessos: number;
  totalPublicacoes: number;
  totalClientes: number;
  desde: string;
  primeiraPublicacao: string | null;
  ultimaPublicacao: string | null;
  diasDesdeUltima: number | null;
  intervaloMedioDias: number | null;
  publicacoesPorMes: { mes: string; total: number }[];
  tribunais: PreviaTribunal[];
  tiposComunicacao: { tipo: string; total: number }[];
  processos: PreviaProcesso[];
}

/** `"35075-df"` → `{ numero: '35075', uf: 'DF' }`; `null` quando o slug não é uma OAB. */
export function parseSlugOab(slug: string): { numero: string; uf: string } | null {
  const m = /^(\d{1,8})-([a-zA-Z]{2})$/.exec(decodeURIComponent(slug).trim());
  if (!m) return null;
  return { numero: m[1]!, uf: m[2]!.toUpperCase() };
}

export const slugOab = (numero: string, uf: string) =>
  `${numero.replace(/\D/g, '')}-${uf.toLowerCase()}`;

/* ── Limpeza dos campos de OAB ──────────────────────────────────────────────
   A mesma OAB é digitada no hero, relida da URL em /cadastro e no /onboarding
   e reenviada ao backend. Cada lugar limpava do seu jeito, e bastava um deles
   divergir para a busca falhar com "não encontramos" em vez de dizer que o
   campo estava errado. Uma limpeza só, importável por client e server. */

/** Só dígitos, no máximo 8 — o formato que o DJEN aceita. */
export const limparOabNumero = (v: string) => v.replace(/\D/g, '').slice(0, 8);

/** Sigla em caixa alta, no máximo 2 letras. */
export const limparOabUf = (v: string) =>
  v.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2);

/**
 * `{ numero, uf }` quando os dois campos juntos formam uma OAB utilizável;
 * `null` caso contrário. Use antes de montar URL, chamar API ou confiar num
 * `searchParams` — a origem pode ser a digitação do usuário ou a barra de
 * endereço, e nenhuma das duas é confiável.
 */
export function normalizarOab(
  numero: string | undefined | null,
  uf: string | undefined | null,
): { numero: string; uf: string } | null {
  const n = limparOabNumero(numero ?? '');
  const u = limparOabUf(uf ?? '');
  return n && u.length === 2 ? { numero: n, uf: u } : null;
}

/**
 * Partículas que ficam minúsculas no meio de um nome próprio brasileiro.
 * No começo do nome elas sobem para maiúscula ("Da Silva Advogados"), então a
 * regra só vale a partir da segunda palavra.
 */
const PARTICULAS = new Set([
  'da', 'das', 'de', 'del', 'di', 'do', 'dos', 'e', 'la',
  // Preposições que aparecem em classe judicial ("Embargos à Execução Fiscal"),
  // já que o mesmo formatador atende nome de pessoa e nome de classe.
  'a', 'à', 'às', 'ao', 'aos', 'com', 'contra', 'em', 'na', 'nas', 'no', 'nos',
  'para', 'por', 'sem', 'sob', 'sobre',
]);

/**
 * `"IURI DO LAGO NOGUEIRA"` → `"Iuri do Lago Nogueira"`.
 *
 * O DJEN devolve tudo em caixa alta e ainda com um artefato de encoding que
 * deixa vogais acentuadas minúsculas no meio da palavra (`"AçãO RESCISóRIA"`).
 * Baixar a palavra inteira antes de capitalizar corrige os dois de uma vez.
 */
export function nomeProprio(bruto: string): string {
  return bruto
    .toLocaleLowerCase('pt-BR')
    .split(/\s+/)
    .filter(Boolean)
    .map((palavra, i) =>
      i > 0 && PARTICULAS.has(palavra)
        ? palavra
        : palavra.charAt(0).toLocaleUpperCase('pt-BR') + palavra.slice(1),
    )
    .join(' ');
}

/** Primeiro nome já capitalizado — para a linha de saudação. */
export function primeiroNome(bruto: string): string {
  return nomeProprio(bruto).split(' ')[0] ?? '';
}

const MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** `"2026-08"` → `"ago"`. */
export function rotuloMes(mes: string): string {
  const n = Number(mes.slice(5, 7));
  return MES_CURTO[n - 1] ?? mes;
}

/** `"2026-08-19"` → `"19/08"`. */
export function dataCurta(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** "hoje" | "ontem" | "há 5 dias" — a partir de `diasDesdeUltima`. */
export function haQuantosDias(dias: number | null): string | null {
  if (dias === null) return null;
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  return `há ${dias} dias`;
}
