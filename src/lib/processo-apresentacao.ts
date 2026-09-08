import type { Processo, ProximoPrazo } from '@/types';

/**
 * Como um processo se apresenta na carteira: o nome do caso, a urgência do
 * prazo e as distâncias de tempo. Vive fora dos componentes porque a lista, a
 * tabela e o esqueleto precisam concordar sobre isso.
 */

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function dataCurta(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

/** Distância humana até agora — "há 2h", "há 3d". */
export function tempoAtras(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days} d`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'há 1 mês' : `há ${months} meses`;
}

export type PrazoTom = 'urgente' | 'proximo' | 'calmo';

/** Tinto até 7 dias, âmbar até 14, sálvia acima. */
export function tomDoPrazo(prazo: ProximoPrazo): PrazoTom {
  if (prazo.diasRestantes <= 7) return 'urgente';
  if (prazo.diasRestantes <= 14) return 'proximo';
  return 'calmo';
}

/** Rótulo curto do prazo mais próximo, já com o senso de urgência. */
export function rotuloDoPrazo(prazo: ProximoPrazo): string {
  const dias = prazo.diasRestantes;
  if (dias < 0) return `vencido em ${dataCurta(prazo.dataLimite)}`;
  if (dias === 0) return 'vence hoje';
  if (dias === 1) return 'vence amanhã';
  return `vence em ${dias} d · ${dataCurta(prazo.dataLimite)}`;
}

const CONECTIVOS = new Set(['da', 'de', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos', 'para', 'por', 'com', 'a', 'o', 'as', 'os']);
const SIGLAS = new Set(['LTDA', 'EIRELI', 'EPP', 'ME', 'MEI', 'SA', 'S/A', 'S.A', 'S.A.', 'CIA', 'CIA.', 'INSS', 'INCRA', 'IBAMA', 'CEF', 'BB', 'OAB', 'CNJ', 'PGE', 'PGM', 'AGU', 'DPU', 'MPF', 'MPT', 'MPDFT', 'GDF', 'DER', 'CEB', 'CAESB', 'BRB', 'DETRAN']);

/**
 * Os tribunais mandam as partes em caixa alta. Para um título de 15px isso
 * grita; aqui vira Título De Caso, preservando conectivos, siglas conhecidas e
 * qualquer token de até duas letras (DF, SP, SA) que muito provavelmente é sigla.
 */
export function nomeLegivel(nome: string): string {
  if (nome !== nome.toUpperCase()) return nome; // já veio com caixa própria
  return nome
    .toLowerCase()
    .split(/(\s+|\/|-)/)
    .map((token, index) => {
      if (!token.trim() || token === '/' || token === '-') return token;
      const upper = token.toUpperCase();
      if (SIGLAS.has(upper) || (upper.length <= 2 && index > 0 && !CONECTIVOS.has(token))) return upper;
      if (index > 0 && CONECTIVOS.has(token)) return token;
      return token.charAt(0).toUpperCase() + token.slice(1);
    })
    .join('');
}

export interface NomeDoCaso {
  /** Quem move a ação — ou, sem partes extraídas, o melhor substituto. */
  ativo: string;
  /** Contra quem — `null` quando o tribunal não entregou o polo passivo. */
  passivo: string | null;
  /** Quantas partes além das duas exibidas ("+2"). */
  outras: number;
}

/**
 * O advogado pensa "Fulana × Empresa", não no número CNJ — o mesmo título que
 * a página de detalhe já usa. Sem partes extraídas, cai para o campo `parte`
 * (resumo do tribunal) e, no limite, para o assunto.
 */
export function nomeDoCaso(processo: Processo): NomeDoCaso {
  const ativo = processo.poloAtivo[0]?.nome?.trim()
    || (processo.parte && processo.parte !== '—' ? processo.parte : '')
    || processo.assunto?.trim()
    || 'Processo sem partes identificadas';
  const passivo = processo.poloPassivo[0]?.nome?.trim() || null;
  const legivel = (valor: string | null) => (valor ? nomeLegivel(valor) : valor);
  const outras = Math.max(0, processo.poloAtivo.length - 1) + Math.max(0, processo.poloPassivo.length - 1);
  return { ativo: legivel(ativo) ?? ativo, passivo: legivel(passivo), outras };
}
