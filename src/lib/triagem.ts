import type { Movimentacao, Prazo } from '../types';
import { montarNovidades, type GrupoDoProcesso } from './novidades';
import { diasAte, pedeAcao } from './situacao-do-ato';

export const LIMITE_POR_GRUPO = 8;

export type ChaveGrupoTriagem = 'jaProtocolou' | 'deQuemE' | 'chegou';

export type ItemTriagem =
  | { tipo: 'prazo'; prazo: Prazo; lembrarHoje: boolean }
  | { tipo: 'novidade'; movimentacao: Movimentacao };

export interface GrupoTriagem {
  chave: ChaveGrupoTriagem;
  titulo: string;
  itens: ItemTriagem[];
  total: number;
  excedentes: number;
}

export interface VereditoDaTriagem {
  href: string;
  rotulo: string;
  quantidade: number;
  tom: 'tinto' | 'ambar' | 'verde' | 'neutro';
}

export interface ResultadoTriagem {
  veredito: VereditoDaTriagem[];
  grupos: GrupoTriagem[];
  maisAdiante: Prazo[];
  baixados: Prazo[];
  soParaSaber: {
    processos: GrupoDoProcesso<Movimentacao>[];
    cartorio: Movimentacao[];
  };
}

const dataBrasilia = (agora: number): string => {
  const d = new Date(agora - 3 * 60 * 60 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

const ehCartorio = (m: Movimentacao) => m.categoria === 'tramite' && !/prazo/i.test(m.detail);

function limitar(chave: ChaveGrupoTriagem, titulo: string, itens: ItemTriagem[]): GrupoTriagem {
  return {
    chave,
    titulo,
    itens: itens.slice(0, LIMITE_POR_GRUPO),
    total: itens.length,
    excedentes: Math.max(0, itens.length - LIMITE_POR_GRUPO),
  };
}

/**
 * Monta a pauta de decisão sem depender de React ou de acesso à rede.
 * A ordem das perguntas é parte do produto: primeiro o prazo apertado, depois
 * a dúvida que bloqueia avisos, por fim o que acabou de chegar.
 */
export function montarTriagem(
  prazos: readonly Prazo[],
  novidades: readonly Movimentacao[],
  agora = Date.now(),
): ResultadoTriagem {
  const hoje = dataBrasilia(agora);
  const jaProtocolou: ItemTriagem[] = [];
  const deQuemE: ItemTriagem[] = [];
  const maisAdiante: Prazo[] = [];
  const baixados: Prazo[] = [];

  for (const prazo of prazos) {
    if (prazo.fechado) {
      baixados.push(prazo);
      continue;
    }

    const lembrarHoje = Boolean(prazo.lembrarEm && prazo.lembrarEm.slice(0, 10) <= hoje);
    if (prazo.deQuem === 'parteContraria') {
      maisAdiante.push(prazo);
    } else if (prazo.deQuem === 'indefinido' && prazo.vencimentoISO) {
      deQuemE.push({ tipo: 'prazo', prazo, lembrarHoje });
    } else if ((prazo.diasRestantes !== null && prazo.diasRestantes <= 3) || lembrarHoje) {
      jaProtocolou.push({ tipo: 'prazo', prazo, lembrarHoje });
    } else {
      maisAdiante.push(prazo);
    }
  }

  const baldes = montarNovidades(novidades, {
    pedeAcao: item => pedeAcao(item, agora),
    ehCartorio,
    diasAte: item => diasAte(item.prazo?.dataLimite, agora),
  });

  const chegou: ItemTriagem[] = baldes.pedemAcao.map(movimentacao => ({
    tipo: 'novidade' as const,
    movimentacao,
  }));

  const porData = (a: Prazo, b: Prazo) =>
    (a.vencimentoISO ?? '9999-12-31').localeCompare(b.vencimentoISO ?? '9999-12-31');
  maisAdiante.sort(porData);
  baixados.sort(porData);

  const grupos = [
    limitar('jaProtocolou', 'Já protocolou?', jaProtocolou),
    limitar('deQuemE', 'De quem é este prazo?', deQuemE),
    limitar('chegou', 'Chegou e pede sua ação', chegou),
  ].filter(grupo => grupo.total > 0);

  return {
    grupos,
    maisAdiante,
    baixados,
    soParaSaber: { processos: baldes.processos, cartorio: baldes.soCartorio },
    veredito: [
      { href: '#jaProtocolou', rotulo: 'protocolar ou dar baixa', quantidade: jaProtocolou.length, tom: 'tinto' },
      { href: '#deQuemE', rotulo: 'confirmar de quem é', quantidade: deQuemE.length, tom: 'ambar' },
      { href: '#chegou', rotulo: 'novidades pedem ação', quantidade: chegou.length, tom: 'verde' },
      { href: '#maisAdiante', rotulo: 'ficam para mais adiante', quantidade: maisAdiante.length, tom: 'neutro' },
    ],
  };
}
