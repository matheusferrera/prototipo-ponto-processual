import type { TribunalStatusItem } from '@/types';
import { agruparPorTribunal, type TribunalStatusGroup } from './tribunal-status';

/**
 * Espelha `ScraperSecretView` do backend — nunca traz login/senha/MFA
 * (write-only, cifrados em repouso). Vive aqui (não em `api.server.ts`) para
 * que componentes client possam importar o tipo sem puxar `next/headers`.
 */
export type ScraperSecretView = {
  id: string;
  label: string;
  oabNumero: string | null;
  oabUf: string | null;
  tribunais: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Sistemas com robô funcionando primeiro; o resto ("em breve") vai para o fim. */
const SISTEMA_ORDER = ['PJe', 'CPE', 'Projudi', 'e-Proc'];

export interface SistemaGroup {
  sistema: string;
  grupos: TribunalStatusGroup[];
  totalGraus: number;
  /** Graus com pelo menos uma credencial ativa cobrindo — é o que vira "cadastrado" no painel. */
  cobertos: number;
}

/**
 * Agrupa o catálogo de tribunais — a mesma fonte que alimenta `/status`
 * (`GET /scraper/status`) — por sistema processual. É a base tanto do painel
 * de cobertura quanto do seletor de tribunais do formulário: como cada
 * tribunal-base só tem um sistema (garantido no backend por
 * `SUPPORTED_TRIBUNALS`), agrupar por `sistema` depois de agrupar por
 * tribunal reaproveita a lógica já testada de `/status` em vez de duplicá-la.
 */
export function agruparPorSistema(items: TribunalStatusItem[]): SistemaGroup[] {
  const grupos = agruparPorTribunal(items);
  const map = new Map<string, TribunalStatusGroup[]>();
  for (const g of grupos) {
    const list = map.get(g.sistema);
    if (list) list.push(g);
    else map.set(g.sistema, [g]);
  }

  return Array.from(map, ([sistema, grupos]) => ({
    sistema,
    grupos: [...grupos].sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR')),
    totalGraus: grupos.reduce((acc, g) => acc + g.graus.length, 0),
    cobertos: grupos.reduce((acc, g) => acc + g.graus.filter(gr => gr.activeCredentialsCount > 0).length, 0),
  })).sort((a, b) => {
    const ia = SISTEMA_ORDER.indexOf(a.sistema);
    const ib = SISTEMA_ORDER.indexOf(b.sistema);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

export interface SistemaMeta {
  titulo: string;
  descricao: string;
  /** Projudi/TJAM não usa MFA — o backend ainda exige o campo, mas a UI não deve tratar como obrigatório de verdade. */
  exigeMfa: boolean;
  loginLabel: string;
  loginPlaceholder: string;
  loginHelp: string;
  /** `false` = sistema aparece no catálogo mas o robô ainda não sincroniza nada dele (ex.: e-Proc/TRF2). */
  disponivel: boolean;
}

export const SISTEMA_META: Record<string, SistemaMeta> = {
  PJe: {
    titulo: 'PJe',
    descricao: 'TJDFT, TRF1, TRF3, TJPI, TJBA e TJRN — um único login (SSO) cobre todos.',
    exigeMfa: true,
    loginLabel: 'CPF do advogado',
    loginPlaceholder: '000.000.000-00',
    loginHelp: 'O mesmo CPF e senha usados para entrar no PJe pelo navegador.',
    disponivel: true,
  },
  CPE: {
    titulo: 'CPE · STJ',
    descricao: 'Central do Processo Eletrônico do STJ — sistema e login próprios.',
    exigeMfa: true,
    loginLabel: 'CPF',
    loginPlaceholder: '000.000.000-00',
    loginHelp: 'O mesmo CPF e senha usados para entrar no Portal do STJ.',
    disponivel: true,
  },
  Projudi: {
    titulo: 'Projudi · TJAM',
    descricao: 'Tribunal de Justiça do Amazonas — sistema e login próprios, sem MFA.',
    exigeMfa: false,
    loginLabel: 'Usuário',
    loginPlaceholder: 'CPF ou login de acesso',
    loginHelp: 'O mesmo usuário e senha usados para entrar no Projudi do TJAM.',
    disponivel: true,
  },
  'e-Proc': {
    titulo: 'e-Proc',
    descricao: '',
    exigeMfa: false,
    loginLabel: 'Usuário',
    loginPlaceholder: '',
    loginHelp: '',
    disponivel: true,
  },
  'e-SAJ': {
    titulo: 'e-SAJ',
    descricao: '',
    exigeMfa: false,
    loginLabel: 'CPF',
    loginPlaceholder: '',
    loginHelp: '',
    disponivel: true,
  },
};

export function sistemaMeta(sistema: string): SistemaMeta {
  return (
    SISTEMA_META[sistema] ?? {
      titulo: sistema,
      descricao: '',
      exigeMfa: true,
      loginLabel: 'Login',
      loginPlaceholder: '',
      loginHelp: '',
      disponivel: true,
    }
  );
}
