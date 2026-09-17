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

/**
 * Tinto até 7 dias, âmbar até 14, sálvia acima — **a única escala de urgência
 * da tela do processo**.
 *
 * Aceita qualquer objeto com `diasRestantes` porque os dois tipos de prazo do
 * produto o carregam: `ProximoPrazo` (o resumo da carteira, sempre com data) e
 * `Prazo` (a pauta, onde a data pode faltar). Sem data não há urgência a
 * declarar, e `calmo` é o tom neutro — quem trata a ausência é a tela, que
 * escreve "sem data definida" em vez de uma contagem.
 *
 * Vencido cai em `urgente` pelo mesmo `<= 7`: dias negativos são o caso mais
 * urgente que existe, e um ramo separado só serviria para poder esquecê-lo.
 */
export function tomDoPrazo(prazo: { diasRestantes: number | null }): PrazoTom {
  if (prazo.diasRestantes === null) return 'calmo';
  if (prazo.diasRestantes <= 7) return 'urgente';
  if (prazo.diasRestantes <= 14) return 'proximo';
  return 'calmo';
}

/**
 * A FASE do processo, como a tela a nomeia — **um mapa só**.
 *
 * Havia dois divergentes na mesma página: o painel de panorama escrevia
 * "Conhecimento" e a aba de IA "em conhecimento", para o mesmo enum e no mesmo
 * processo. Aqui ela é rótulo de estado (uma pílula ao lado do grau), então
 * vale a forma nominal.
 *
 * `indefinido` — e a ausência de `analiseCaso`, que é o caso comum — vira
 * **"Fase a confirmar"**, que a tela desenha com contorno e sem preenchimento:
 * ausência não pode ter a cara de dado.
 */
export const FASE_PROCESSO: Record<string, string> = {
  conhecimento: 'Conhecimento',
  instrucao: 'Em instrução',
  sentenciado: 'Sentenciado',
  recursal: 'Fase recursal',
  execucao: 'Execução',
  arquivado: 'Arquivado',
  indefinido: 'Fase a confirmar',
};

/**
 * "há 3 h" · "há 18 d" · "há 7 m" · "há 7 a" — a distância numa unidade só.
 *
 * Irmã de `tempoAtras`, e existe porque a linha do tempo de um processo
 * atravessa anos: "há 88 meses" é aritmeticamente certo e ilegível, e é o que
 * `tempoAtras` produz para um processo autuado em 2019. Aqui o mês vira ano a
 * partir de 12, como qualquer pessoa conta.
 */
export function tempoCurto(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const minutos = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 31) return `há ${dias} d`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `há ${meses} m`;
  return `há ${Math.floor(meses / 12)} a`;
}

/**
 * "7 anos e 4 meses" — a duração POR EXTENSO.
 *
 * Só a tela do processo parado a usa, e ela é o produto ali: metade de um
 * acervo não se move, e "há 88 meses" não comunica o que "7 anos e 4 meses de
 * silêncio" comunica. `null` quando não há data — a frase inteira some em vez
 * de sair com um buraco.
 */
export function duracaoLonga(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const dias = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (dias < 0) return null;
  if (dias < 31) return dias === 1 ? '1 dia' : `${dias} dias`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return meses === 1 ? '1 mês' : `${meses} meses`;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  const parteAno = anos === 1 ? '1 ano' : `${anos} anos`;
  if (resto === 0) return parteAno;
  return `${parteAno} e ${resto === 1 ? '1 mês' : `${resto} meses`}`;
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
