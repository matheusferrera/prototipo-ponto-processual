import type { Movimentacao } from '@/types';
import { assuntoCurto, semCodigo } from '@/lib/pje-text';

/**
 * Título de uma movimentação no feed: a parte (cliente) do processo — o que o
 * advogado procura ao varrer o feed, mesma hierarquia de `clientePrazo`. Sem
 * parte, cai para o assunto encurtado; sem nenhum dos dois, o tipo (que nunca
 * é vazio).
 */
export function clienteMovimentacao(m: Movimentacao): string {
  return m.parte || assuntoCurto(m.assunto) || m.tipo;
}

/** Assunto a exibir na meta — encurtado e omitido quando já subiu para o título. */
export function assuntoSecundario(m: Movimentacao, cliente: string): string | null {
  const curto = assuntoCurto(m.assunto);
  return curto && curto !== cliente ? curto : null;
}

/** Descrição da movimentação sem o id interno do documento que o PJe anexa no fim. */
export function descricaoMovimentacao(m: Movimentacao): string {
  return semCodigo(m.detail) || m.detail;
}

/**
 * O que a linha diz que aconteceu — o resumo da IA quando existe, o rótulo
 * quando não.
 *
 * Desde 03/09/2026 a movimentação é a unidade de análise no backend: a IA lê o
 * ato inteiro e devolve o que o juízo decidiu. `descricao` passou a ser só o
 * RÓTULO ("Despacho — 8ª Turma Cível"), porque o inteiro teor chega a 44 KB e
 * uma timeline que o despeja é ilegível. Sem esta função a tela mostraria o
 * rótulo e jogaria fora justamente a leitura que foi paga.
 *
 * O fallback não é degradação rara: só a origem `djen` traz o texto do ato, e
 * movimentação do DataJud ou do painel nunca terá resumo.
 */
export function resumoMovimentacao(m: Pick<Movimentacao, 'detail' | 'ia'>): string {
  return m.ia?.resumo || descricaoMovimentacao(m as Movimentacao);
}

/** `true` quando a linha mostra a leitura da IA, e não o rótulo cru. */
export function temLeituraIa(m: Pick<Movimentacao, 'ia'>): boolean {
  return Boolean(m.ia?.resumo);
}

/**
 * A providência que o ato cobra — e de quem ela é.
 *
 * `null` quando não há nada a fazer, que é o caso da maioria: ato de mera
 * ciência não cobra ninguém. Providência da PARTE CONTRÁRIA é devolvida com o
 * rótulo explícito, porque mostrá-la sem dizer de quem é foi o erro medido no
 * TRF1 — "cite-se a União para contestar em 30 dias" lido como prazo do
 * cliente.
 */
export function acaoMovimentacao(m: Pick<Movimentacao, 'ia'>): { texto: string; minha: boolean } | null {
  const acao = m.ia?.acao;
  if (!acao) return null;
  return { texto: acao, minha: m.ia?.deQuem === 'destinatario' };
}

/**
 * Como rotular a procedência da linha na tela.
 *
 * `djen` merece rótulo próprio porque **não é um movimento do tribunal**: é a
 * publicação do ato no diário, com a data em que ele saiu — não a data em que
 * o cartório o registrou.
 *
 * O selo existia para separá-lo da linha do DataJud sobre o mesmo ato. Essa
 * convivência acabou em 03/09/2026 (o DataJud deixou de gravar movimentação e
 * ficou só na capa), mas o rótulo ficou por um motivo que sobrevive a ela: o
 * advogado precisa saber que aquilo é publicação em diário, porque é ela que
 * faz a intimação correr. Linha `scraper` do painel autenticado é outra coisa.
 *
 * As outras não ganham selo: são todas "o tribunal disse", e distinguir painel
 * de e-SAJ não muda nada para quem lê.
 */
export function seloOrigem(m: Pick<Movimentacao, 'origem'>): string | null {
  return m.origem === 'djen' ? 'diário' : null;
}

/**
 * O vencimento do ato, pronto para a tela — ou `null` quando o ato não abre
 * prazo, que é o caso da maioria.
 *
 * **Por que a data-limite subiu para a tela.** Até 04/09/2026 a movimentação
 * mostrava a leitura da IA ("apresentar contrarrazões… o prazo é de 15 dias
 * úteis") e não dizia **até quando** — o `Deadline` existia no banco, ligado ao
 * ato por `movementId`, e nem a API nem a interface o traziam. O produto se
 * chama Ponto Processual e a tela do ato não mostrava o ponto: o advogado lia
 * "15 dias úteis" e contava de cabeça, que é exatamente o trabalho que ele
 * paga para não fazer.
 *
 * **`estimado` não é um detalhe de implementação, é a honestidade do número.**
 * Só `textoExplicito` é o ato dizendo os dias; `prazoLegal`, `padraoCpc218` e
 * `analiseIa` são cálculo nosso sobre a regra do art. 4º da Lei 11.419 — e o
 * cálculo não conhece feriado estadual, prazo em dobro nem suspensão por
 * portaria local. Exibir os dois com a mesma cara faria uma estimativa passar
 * por vencimento oficial do tribunal, que é o erro caro na direção perigosa.
 */
export function vencimentoDoAto(m: Pick<Movimentacao, 'prazo'>): {
  /** `24 set` — curto, para caber na coluna do feed. */
  curto: string;
  /** `24 de setembro de 2026` — por extenso, para o detalhe. */
  extenso: string;
  /** Dias corridos até vencer. Negativo = já venceu. */
  emDias: number;
  /** `15 dias` quando o ato declarou; `null` quando não. */
  dias: string | null;
  /** `true` quando a data é cálculo nosso, não o vencimento que o tribunal publicou. */
  estimado: boolean;
  /** `hoje`, `amanhã`, `em 3 dias`, `venceu há 2 dias`. */
  quando: string;
  /** Vence em até 3 dias (ou já venceu) — o que a tela precisa destacar. */
  urgente: boolean;
} | null {
  const prazo = m.prazo;
  if (!prazo?.dataLimite) return null;

  const limite = new Date(prazo.dataLimite);
  if (Number.isNaN(limite.getTime())) return null;

  // Wall-clock de Brasília nos dois lados: o backend grava a data-limite como
  // meia-noite UTC do dia certo (ver `estimarDataLimite`), então ler com
  // `getDate()` local tiraria um dia de quem está a oeste. Ver `lib/wall-clock`.
  const diaLimite = Date.UTC(limite.getUTCFullYear(), limite.getUTCMonth(), limite.getUTCDate());
  const agora = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const hoje = Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate());
  const emDias = Math.round((diaLimite - hoje) / 86_400_000);

  const quando =
    emDias === 0 ? 'vence hoje' :
    emDias === 1 ? 'vence amanhã' :
    emDias > 1   ? `vence em ${emDias} dias` :
    emDias === -1 ? 'venceu ontem' :
    `venceu há ${Math.abs(emDias)} dias`;

  return {
    curto: `${limite.getUTCDate()} ${MESES_CURTOS[limite.getUTCMonth()]}`,
    extenso: `${limite.getUTCDate()} de ${MESES[limite.getUTCMonth()]} de ${limite.getUTCFullYear()}`,
    emDias,
    dias: prazo.dias ? `${prazo.dias} ${prazo.dias === 1 ? 'dia' : 'dias'}` : null,
    estimado: prazo.metodoPrazo !== 'textoExplicito',
    quando,
    urgente: emDias <= 3,
  };
}

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/**
 * Quando a leitura da IA precisa ser conferida antes de virar decisão.
 *
 * `confianca: 'baixa'` sai quando o ato chegou truncado ou sem dispositivo, e
 * esconder isso é apresentar palpite como fato num campo que o advogado usa
 * para não perder prazo. A tela pede conferência em vez de afirmar.
 */
export function pedeConferencia(m: Pick<Movimentacao, 'ia'>): boolean {
  return m.ia?.confianca === 'baixa';
}
