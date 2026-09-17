import type { CadeiaDoPrazo } from '../types';

/**
 * A CONTA DO VENCIMENTO, pronta para a tela.
 *
 * ## Por que ela existe como bloco visível
 *
 * A data-limite é o número mais caro do produto e, até aqui, o advogado tinha
 * de aceitá-lo. A cadeia é a mesma que o CNJ imprime no rodapé de toda
 * certidão de publicação — disponibilização, publicação, início, vencimento —,
 * e mostrá-la troca um pedido de fé por uma conferência de quinze segundos.
 *
 * ## O que este módulo NÃO faz
 *
 * **Não calcula nada.** Os quatro marcos vêm prontos do backend
 * (`cadeiaDeContagem`), que é a mesma função que produziu a `dataLimite`
 * gravada — e que só devolve a cadeia quando ela termina exatamente nela. Aqui
 * só se formata. Recalcular no navegador seria uma segunda calculadora de
 * prazo no produto, sem calendário forense, e é assim que se inventa um
 * vencimento errado.
 *
 * **Sem import em tempo de execução**, para poder ser testado sob `node --test`
 * — o alias `@/` não resolve lá. Mesma razão de `fio-do-prazo.ts`.
 */

export interface MarcoDaCadeia {
  /** `disponibilizado no diário`, `vence`… */
  rotulo: string;
  /** A regra que produz este passo, em uma linha. `null` no primeiro. */
  regra: string | null;
  /** `qua, 3 set` */
  quando: string;
  /** O último marco — o vencimento. É o que a tela destaca. */
  fim: boolean;
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/**
 * `dd/mm/yyyy` → `qua, 3 set`.
 *
 * **O dia da semana não é enfeite.** É ele que responde "tenho o fim de
 * semana?", que é a primeira conta feita ao ler um vencimento — e é também o
 * que torna a cadeia auditável de relance: se um passo cai num sábado, a conta
 * está errada e dá para ver sem pensar.
 *
 * Construído com `Date.UTC` a partir dos componentes, nunca com
 * `new Date('03/09/2026')` — essa string é interpretada como mês/dia em locale
 * americano, e 03/09 viraria 9 de março.
 */
export function diaCurto(br: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br.trim());
  if (!m) return null;
  const [, dia, mes, ano] = m;
  const d = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)));
  if (Number.isNaN(d.getTime()) || d.getUTCMonth() !== Number(mes) - 1) return null;
  return `${SEMANA[d.getUTCDay()]}, ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
}

/**
 * Os quatro marcos, com a regra de cada um.
 *
 * As regras vêm por extenso porque é o que transforma a lista em explicação:
 * "04/09" não diz nada; "1º dia útil seguinte (Lei 11.419, art. 4º, § 3º)" diz
 * de onde a data saiu e onde conferir.
 *
 * Devolve `[]` quando alguma data não faz sentido — a tela então mostra o
 * vencimento sozinho, em vez de uma cadeia quebrada.
 */
export function marcosDaCadeia(cadeia: CadeiaDoPrazo): MarcoDaCadeia[] {
  /* A concordância no singular importa porque prazo de 1 dia existe (ciência,
     vista dos autos) e "1 dia úteis depois" é a frase que faz o advogado
     desconfiar de toda a conta. */
  const um = cadeia.dias === 1;
  const unidade = cadeia.contagem === 'corridos'
    ? (um ? 'corrido' : 'corridos')
    : (um ? 'útil' : 'úteis');
  const passos: { rotulo: string; regra: string | null; br: string; fim?: boolean }[] = [
    {
      rotulo: 'disponibilizado no diário',
      regra: null,
      br: cadeia.disponibilizadoEm,
    },
    {
      rotulo: 'considera-se publicado',
      regra: '1º dia útil seguinte — Lei 11.419, art. 4º, § 3º',
      br: cadeia.publicadoEm,
    },
    {
      rotulo: 'começa a correr',
      regra: 'o dia útil seguinte — art. 4º, § 4º, e CPC 224',
      br: cadeia.inicioEm,
    },
    {
      rotulo: 'vence',
      regra: `${cadeia.dias} ${um ? 'dia' : 'dias'} ${unidade} depois`,
      br: cadeia.venceEm,
      fim: true,
    },
  ];

  const marcos: MarcoDaCadeia[] = [];
  for (const passo of passos) {
    const quando = diaCurto(passo.br);
    if (!quando) return [];
    marcos.push({ rotulo: passo.rotulo, regra: passo.regra, quando, fim: Boolean(passo.fim) });
  }
  return marcos;
}
