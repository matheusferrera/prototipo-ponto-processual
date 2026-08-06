import type { TribunalHealthStatus, TribunalStatusItem } from '@/types';

/**
 * O backend expõe uma linha por *grau* (`TJDFTG1`, `TJDFTG2`, ...), porque é o
 * grau que tem credencial, job e métrica próprios. A tela de status, porém, lê
 * melhor com uma linha por **tribunal**, mostrando o status de cada grau dentro
 * dela. O agrupamento é feito aqui, no cliente — a API segue granular.
 */

export interface TribunalGrauStatus extends TribunalStatusItem {
  /** `'1º'` / `'2º'`, ou `null` quando o tribunal é de instância única. */
  grauLabel: string | null;
}

export interface TribunalStatusGroup {
  /** Sigla base, sem o sufixo de grau — também é a chave do agrupamento. */
  id: string;
  codigo: string;
  nome: string;
  esfera: 'Estadual' | 'Federal';
  uf: string;
  sistema: string;
  /** Pior status entre os graus — é o que alimenta filtros e contadores. */
  status: TribunalHealthStatus;
  graus: TribunalGrauStatus[];
  lastSyncAt: string | null;
  latencyMs: number | null;
  successRate: number | null;
  successJobsLast24h: number;
  totalJobsLast24h: number;
  activeProcessesCount: number;
}

/** "Operacional em um grau" vale mais que "sem credencial no outro". */
const STATUS_PRIORITY: Record<TribunalHealthStatus, number> = {
  erro: 5,
  atencao: 4,
  sincronizando: 3,
  operacional: 2,
  nao_configurado: 1,
};

const GRAU_SUFFIX = /\s+([12])[ºª]\s+Grau$/i;
/** `(1ª Instância)`, `(Seções Judiciárias)`, `(SP/MS)` — o que distingue os graus no nome. */
const TRAILING_PAREN = /\s*\([^)]*\)\s*$/;

function baseCodigo(codigo: string): string {
  return codigo.replace(GRAU_SUFFIX, '').trim();
}

function baseNome(nome: string): string {
  return nome.replace(TRAILING_PAREN, '').trim();
}

/** O grau vem do enum do backend (`...G1`/`...G2`); o código é só fallback. */
function grauNumber(item: TribunalStatusItem): number | null {
  const fromId = /G([12])$/i.exec(item.id);
  if (fromId) return Number(fromId[1]);
  const fromCodigo = GRAU_SUFFIX.exec(item.codigo);
  return fromCodigo ? Number(fromCodigo[1]) : null;
}

function maxIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

export function agruparPorTribunal(items: TribunalStatusItem[]): TribunalStatusGroup[] {
  // Map preserva a ordem de inserção, então a ordenação que o backend aplicou
  // (por padrão, última sincronização) sobrevive ao agrupamento.
  const grouped = new Map<string, TribunalStatusItem[]>();
  for (const item of items) {
    const key = baseCodigo(item.codigo) || item.id;
    const bucket = grouped.get(key);
    if (bucket) bucket.push(item);
    else grouped.set(key, [item]);
  }

  return Array.from(grouped, ([key, rows]) => {
    const ordered = [...rows].sort((a, b) => (grauNumber(a) ?? 99) - (grauNumber(b) ?? 99));
    const first = ordered[0]!;
    const soUmGrau = ordered.length === 1;

    const graus: TribunalGrauStatus[] = ordered.map(item => {
      const grau = grauNumber(item);
      return { ...item, grauLabel: soUmGrau || grau === null ? null : `${grau}º` };
    });

    const totalJobsLast24h = ordered.reduce((acc, t) => acc + (t.totalJobsLast24h ?? 0), 0);
    const successJobsLast24h = ordered.reduce((acc, t) => acc + (t.successJobsLast24h ?? 0), 0);

    // Duração média só sobre os graus efetivamente medidos: contar `null` como 0
    // faria o tribunal parecer mais rápido do que é.
    const measured = ordered.filter(t => t.latencyMs !== null);
    const latencyMs = measured.length
      ? Math.round(measured.reduce((acc, t) => acc + (t.latencyMs ?? 0), 0) / measured.length)
      : null;

    const sistemas = Array.from(new Set(ordered.map(t => t.sistema)));

    return {
      id: key,
      codigo: key,
      nome: baseNome(first.nome),
      esfera: first.esfera,
      uf: first.uf,
      sistema: sistemas.join(' · '),
      status: ordered.reduce<TribunalHealthStatus>(
        (worst, t) => (STATUS_PRIORITY[t.status] > STATUS_PRIORITY[worst] ? t.status : worst),
        'nao_configurado',
      ),
      graus,
      lastSyncAt: ordered.reduce<string | null>((best, t) => maxIso(best, t.lastSyncAt), null),
      latencyMs,
      successRate:
        totalJobsLast24h > 0
          ? Math.round((successJobsLast24h / totalJobsLast24h) * 1000) / 10
          : null,
      successJobsLast24h,
      totalJobsLast24h,
      activeProcessesCount: ordered.reduce((acc, t) => acc + t.activeProcessesCount, 0),
    };
  });
}
