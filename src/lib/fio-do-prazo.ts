import type { CategoriaMovimentacao, PrazoEmCurso } from '../types';

/**
 * A FAIXA DO PRAZO na linha — o elo entre a movimentação e o prazo que corre.
 *
 * ## O que ela responde
 *
 * O feed é cronológico: ele diz o que chegou. A faixa diz **em que prazo isso
 * caiu e quanto dele já passou** — a pergunta de quem tem prazo correndo. Sem
 * ela, achar no feed o que toca um prazo aberto é varrer 370 páginas (18.485
 * movimentações, medido em 15/09/2026) atrás dos eventos de 11 processos.
 *
 * ## Por que não depende da IA
 *
 * Tudo aqui sai de datas — `Deadline.publicadoEm`, `dataLimite` e
 * `Movement.ocorridoEm` —, calculadas no backend
 * (`shared/processos/fio-do-prazo.ts`). Isso importa porque a leitura por IA
 * cobre **6,1% dos atos legíveis** (15 de 245 numa conta, 10 de 119 na outra):
 * uma faixa que dependesse dela viria vazia em 94% das linhas. Quando a
 * leitura existe, ela só melhora o rótulo (`peca`).
 *
 * ## A régua NÃO é recalculada aqui
 *
 * `restam`, `decorridos` e `totalDias` vêm prontos do backend porque a conta
 * depende do relógio, e o único relógio que vale é o de Brasília. Refazê-la no
 * navegador daria resultado diferente para quem estiver em outro fuso — no
 * campo em que errar custa o prazo, e na direção perigosa.
 *
 * **Mora fora de `movimentacao.ts` para poder ser testada**, pela mesma razão
 * de `leitura-do-ato.ts`: aquele arquivo importa `@/lib/pje-text`, e o alias
 * `@/` não resolve sob `node --test`. Por isso este módulo não tem NENHUM
 * import em tempo de execução.
 */

/**
 * As categorias que são carimbo de cartório, não o ato.
 *
 * **Terceira cópia da mesma lista, e a duplicação é imposta pelo harness.** A
 * original é `CATEGORIAS_QUE_A_IA_NAO_LE` em
 * `backend/src/shared/processos/categorias.ts`; a segunda mora em
 * `leitura-do-ato.ts`, aqui do lado. Os testes deste projeto rodam em
 * `node --test` sem bundler, e o Node não resolve import relativo sem
 * extensão — um módulo testável não pode importar outro. O que segura a
 * divergência é `tests/fio-do-prazo.test.mjs`, que importa as duas e as compara:
 * quando uma categoria nova entrar em um lado só, ele fica vermelho.
 *
 * Duas consequências na tela, e as duas saem daqui:
 *
 *  - no feed e no fio, `false` COLAPSA a linha ("3 atos de trâmite · mostrar").
 *    Medido nos últimos 90 dias de uma conta: trâmite 47%, publicação 16% —
 *    **63% do feed**;
 *  - dentro de um prazo aberto, `true` acende o aviso: é o ato que pode mudar
 *    o que se vai protocolar.
 *
 * **`categoria` nula devolve `true`**, e é o caso que mais importa: o
 * expediente do DJEN — o único endereçado, o único que abre prazo — é gravado
 * sem categoria.
 */
export const CATEGORIAS_QUE_NAO_SAO_O_ATO: readonly CategoriaMovimentacao[] = ['publicacao', 'tramite'];

const NAO_SAO_O_ATO = new Set<string>(CATEGORIAS_QUE_NAO_SAO_O_ATO);

export function mexeComOPrazo(categoria: CategoriaMovimentacao | null | undefined): boolean {
  if (categoria === null || categoria === undefined) return true;
  return !NAO_SAO_O_ATO.has(categoria);
}

/** O contrário, nomeado, para quem está decidindo o que colapsar. */
export function colapsavelNoFeed(categoria: CategoriaMovimentacao | null | undefined): boolean {
  return !mexeComOPrazo(categoria);
}

export interface FaixaDoPrazo {
  /**
   * `abriu` — esta linha É o despacho que determinou o prazo.
   * `atencao` — um ato que pode mudar a peça chegou com o prazo correndo.
   * `curso` — trâmite dentro da janela: contexto, não alerta.
   *
   * **Âmbar só em `atencao`.** Pintar as três de urgência gastaria o sinal
   * antes de ele precisar — é a mesma medição que tirou a borda verde de todas
   * as linhas do feed em 06/09/2026: quando tudo está em destaque, nada está.
   */
  tom: 'abriu' | 'atencao' | 'curso';
  /** "Prazo:" · "Chegou dentro de um prazo seu" · "Dentro de um prazo seu". */
  titulo: string;
  /**
   * "contestação" — a peça que a IA nomeou; na falta dela, a natureza do
   * prazo. `null` quando não há nem uma nem outra: aí a faixa não inventa
   * rótulo, e o título sozinho já diz o que precisa.
   */
  nome: string | null;
  /** "faltam 2 dias" · "vence hoje" · "venceu há 3 dias". `null` sem data-limite. */
  quando: string | null;
  /**
   * `7 out` — a data-limite, curta. `null` sem `dataLimite`.
   *
   * Subiu para a faixa em 15/09/2026, quando o chip de vencimento saiu da
   * linha: ele era a única coisa que dizia a DATA, e "faltam 22 dias" sozinho
   * obriga a pessoa a contar no calendário para saber se cai antes da viagem,
   * do feriado, da audiência.
   */
  vence: string | null;
  /** `0..1` — o quanto da janela já passou. `null` quando não há régua. */
  fracao: number | null;
  /** Vence em até 3 dias, ou já venceu. */
  urgente: boolean;
  /** Já passou da data e o prazo continua aberto — ninguém deu baixa. */
  vencido: boolean;
  /** A data-limite é cálculo nosso, não o vencimento que o tribunal publicou. */
  estimado: boolean;
  /** O fio deste prazo. */
  href: string;
}

/**
 * A faixa, ou `null` quando não há prazo em curso — que é o caso comum: 169
 * dos 180 processos medidos não têm prazo aberto, e a linha deles continua
 * exatamente como era.
 */
export function faixaDoPrazo(m: {
  prazoEmCurso?: PrazoEmCurso | null;
  categoria?: CategoriaMovimentacao | null;
}): FaixaDoPrazo | null {
  const p = m.prazoEmCurso;
  if (!p) return null;

  const tom: FaixaDoPrazo['tom'] = p.abriuEsteAto
    ? 'abriu'
    : mexeComOPrazo(m.categoria) ? 'atencao' : 'curso';

  /* "Prazo:" e não "Abriu este prazo": a linha do ato que abre o prazo tinha
     DUAS declarações do mesmo fato — o chip de vencimento no topo ("Prazo
     7 out · vence em 22 dias") e esta faixa embaixo ("Abriu este prazo …
     faltam 22 dias"). O chip saiu; sobrou o rótulo, que agora nomeia o campo
     em vez de narrar o que a linha fez. Os outros dois tons continuam frases,
     porque eles dizem uma relação e não um campo. */
  const titulo = tom === 'abriu' ? 'Prazo:'
    : tom === 'atencao' ? 'Chegou dentro de um prazo seu'
    : 'Dentro de um prazo seu';

  return {
    tom,
    titulo,
    nome: nomeDoPrazo(p),
    quando: quandoDoPrazo(p.restam),
    vence: dataCurtaDoPrazo(p.dataLimite),
    fracao: fracaoDoPrazo(p),
    urgente: p.restam !== null && p.restam <= 3,
    vencido: p.restam !== null && p.restam < 0,
    /* Só `textoExplicito` é o ato declarando os dias; `prazoLegal`,
       `padraoCpc218` e `analiseIa` são cálculo nosso sobre a regra do art. 4º
       da Lei 11.419, que não conhece feriado estadual, prazo em dobro nem
       suspensão por portaria. Ver o `≈` do chip da linha. */
    estimado: p.metodoPrazo !== 'textoExplicito',
    href: `/movimentacoes/fio/${p.id}`,
  };
}

/**
 * `7 out` — a data-limite em uma palavra e um número.
 *
 * **Lê com `getUTC*`, nunca com `getDate()`.** O banco grava wall-clock de
 * Brasília nos campos UTC e `dataLimite` é sempre meia-noite: ler com o fuso
 * local devolve 21:00 do dia ANTERIOR em qualquer servidor a oeste de
 * Greenwich, e a tela escreveria uma data-limite um dia mais cedo. É o defeito
 * que `toISODate` já causou uma vez nesta mesma tela — ver `wall-clock.ts`.
 *
 * **A tabela de meses é cópia da de `movimentacao.ts`, e a duplicação é
 * imposta pelo harness**: `tests/fio-do-prazo.test.mjs` roda em `node --test`
 * sem bundler, e o Node não resolve `@/lib/...`. Mesma razão da lista de
 * categorias que já vive em três cópias neste projeto.
 */
function dataCurtaDoPrazo(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCDate()} ${MESES_CURTOS[d.getUTCMonth()]}`;
}

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/**
 * COMO O PRAZO SE CHAMA na faixa.
 *
 * `peca` é o que a IA nomeou ("Contestação") e é a melhor resposta — ela diz o
 * que PRODUZIR. Na falta dela vem a natureza, que é grosseira mas verdadeira.
 *
 * **`tipoDocumento` de propósito não entra**: ele é o rótulo do cartório do ato
 * que abriu ("Despacho", "Intimação"), e "prazo de Despacho" não é coisa que se
 * diga — seria trocar uma ausência honesta por uma frase errada.
 */
function nomeDoPrazo(p: PrazoEmCurso): string | null {
  if (p.peca?.trim()) return p.peca.trim();
  if (p.natureza === 'manifestacao') return 'manifestação';
  if (p.natureza === 'ciencia') return 'ciência';
  return null;
}

/**
 * "faltam 2 dias" — a distância, em palavras.
 *
 * **`restam` negativo NÃO é grampeado**, e é a correção que este projeto já
 * pagou uma vez: um `Math.max(0, …)` em `diasAteVencimento` fazia todo prazo
 * vencido aparecer como "vence hoje", em vermelho, no único campo em que errar
 * tarde custa o prazo.
 */
export function quandoDoPrazo(restam: number | null): string | null {
  if (restam === null || !Number.isFinite(restam)) return null;
  if (restam === 0) return 'vence hoje';
  if (restam === 1) return 'vence amanhã';
  if (restam > 1) return `faltam ${restam} dias`;
  if (restam === -1) return 'venceu ontem';
  return `venceu há ${Math.abs(restam)} dias`;
}

/**
 * A fração da janela já percorrida — o que a barra desenha.
 *
 * `null` quando não há régua (prazo sem `dataLimite`): a faixa mostra o nome e
 * não desenha barra nenhuma. Inventar um denominador seria desenhar uma
 * progressão que não existe.
 */
export function fracaoDoPrazo(p: PrazoEmCurso): number | null {
  if (p.totalDias === null || p.decorridos === null || p.totalDias < 1) return null;
  return Math.min(1, Math.max(0, p.decorridos / p.totalDias));
}

/**
 * Esta linha pode ser COLAPSADA numa lista?
 *
 * Duas condições, e a segunda é a que importa:
 *
 * 1. é carimbo de cartório (`tramite`, `publicacao`) — 63% do feed, medido;
 * 2. **não está dentro de um prazo seu.**
 *
 * A segunda existe porque "Decorrido prazo do réu" é `tramite` pela categoria e
 * é, com o relógio correndo, a linha mais importante do dia. Colapsar pela
 * categoria sozinha esconderia justamente o que o fio foi feito para mostrar —
 * e esconder tarde, no campo em que errar custa o prazo.
 */
export function colapsavelNaLista(m: {
  categoria?: CategoriaMovimentacao | null;
  prazoEmCurso?: PrazoEmCurso | null;
}): boolean {
  if (m.prazoEmCurso) return false;
  return colapsavelNoFeed(m.categoria);
}

export type BlocoDaLista<T> =
  | { tipo: 'linha'; item: T }
  | { tipo: 'tramite'; itens: T[] };

/**
 * Agrupa CORRIDAS consecutivas de trâmite num bloco só.
 *
 * O dia de cartório rende seis "conclusos / recebidos os autos / juntada de
 * certidão" seguidos, e cada um ocupa a mesma altura de uma sentença. Medido
 * nos últimos 90 dias de uma conta: trâmite 47% e publicação 16% — **63% do
 * feed**. Colapsados, o dia inteiro do cartório cabe numa linha de 34px com
 * "mostrar" ao lado.
 *
 * **Só CONSECUTIVAS.** Juntar trâmites separados por uma sentença quebraria a
 * ordem cronológica, que é o eixo da tela — o bloco sairia do lugar e o
 * cabeçalho de dia deixaria de descrever o que está embaixo dele.
 *
 * **Corrida de um item não colapsa** (`minimo = 2`): um único trâmite atrás de
 * um "mostrar" custa um clique para revelar uma linha, e a linha colapsada tem
 * quase a mesma altura da linha inteira. Não se ganha nada e se esconde algo.
 *
 * **O que está dentro de um prazo nunca entra** — ver `colapsavelNaLista`.
 */
export function agruparTramite<T extends {
  categoria?: CategoriaMovimentacao | null;
  prazoEmCurso?: PrazoEmCurso | null;
}>(itens: readonly T[], minimo = 2): BlocoDaLista<T>[] {
  const blocos: BlocoDaLista<T>[] = [];
  let corrida: T[] = [];

  const fechar = () => {
    if (corrida.length >= minimo) blocos.push({ tipo: 'tramite', itens: corrida });
    else for (const item of corrida) blocos.push({ tipo: 'linha', item });
    corrida = [];
  };

  for (const item of itens) {
    if (colapsavelNaLista(item)) { corrida.push(item); continue; }
    fechar();
    blocos.push({ tipo: 'linha', item });
  }
  fechar();

  return blocos;
}
