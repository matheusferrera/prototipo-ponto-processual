import type { Movimentacao } from '@/types';
import { assuntoCurto, partesDoTexto, semCodigo } from '@/lib/pje-text';

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
/* `ia` OPCIONAL no tipo porque já era opcional em tempo de execução: o corpo
   faz `m.ia?.resumo`, e `TimelineEvent.ia` é declarado `LeituraIa | undefined`.
   Exigi-lo obrigava cada chamador da timeline a inventar uma leitura vazia só
   para satisfazer o compilador. */
export function resumoMovimentacao(m: Pick<Movimentacao, 'detail'> & { ia?: Movimentacao['ia'] }): string {
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
 *
 * > **Sem consumidor desde 15/09/2026.** A linha do feed era a única tela que
 * > o chamava, e a providência saiu dela: na linha que abre prazo ela era a
 * > terceira explicação do mesmo prazo. Quem mostra providência hoje é
 * > `ProvidenciaDoAto`, com outro gate (`oQueFazer`). Fica aqui pelo erro do
 * > TRF1, que é a razão de qualquer gate deste campo existir.
 */
export function acaoMovimentacao(m: Pick<Movimentacao, 'ia'>): { texto: string; minha: boolean } | null {
  // `peca` é o sinal de que há algo concreto a produzir — `oQueFazer` sozinho
  // está sempre presente desde a fusão ato+prazo, até em ato de mera ciência.
  if (!m.ia?.peca || !m.ia.oQueFazer) return null;
  return { texto: m.ia.oQueFazer, minha: m.ia.deQuem === 'destinatario' };
}

/** O rótulo curto de cada procedência — cabe na calha da linha. */
const ORIGEM_CURTA: Record<string, string> = {
  djen: 'diário',
  pdpj: 'portal',
  scraper: 'painel',
  tribunalPublico: 'tribunal',
  datajud: 'DataJud',
};

/** O nome por extenso, para o `title` — a calha não tem espaço para ele. */
const ORIGEM_LONGA: Record<string, string> = {
  djen: 'Diário de Justiça Eletrônico Nacional (CNJ)',
  pdpj: 'Portal de Serviços do PDPJ (CNJ)',
  scraper: 'painel autenticado do tribunal',
  tribunalPublico: 'consulta pública do tribunal',
  datajud: 'base pública do DataJud (CNJ)',
};

/**
 * De onde esta linha veio — em TODA linha, não só na do diário.
 *
 * Até 07/09/2026 só o `djen` ganhava selo, com o argumento de que as outras são
 * todas "o tribunal disse". O argumento caiu quando o portal (PDPJ) passou a
 * ser a maior fonte de movimentação: a mesma lista passou a misturar a linha do
 * cartório, o ato do diário e o que o painel autenticado trouxe, e nada na tela
 * dizia qual era qual — o que importa, porque só a publicação em diário faz a
 * intimação correr, e só o painel traz vencimento calculado pelo tribunal.
 *
 * **Com mais de uma fonte, as duas aparecem.** O mesmo despacho existe como
 * linha do diário e linha do portal; `fontes` é o que registra que elas são o
 * mesmo ato, e omitir a segunda faria a linha parecer menos confirmada do que é.
 */
export function origemDaLinha(
  m: Pick<Movimentacao, 'origem' | 'fontes'>,
): { curto: string; titulo: string } | null {
  const fontes = (m.fontes ?? []).filter((f) => ORIGEM_CURTA[f]);
  // A própria origem sempre encabeça: é a fonte desta LINHA, e as outras a
  // corroboram. Sem `fontes` (linha antiga), ela é tudo o que há.
  const ordenadas = [m.origem, ...fontes.filter((f) => f !== m.origem)].filter((f) => ORIGEM_CURTA[f]);
  if (ordenadas.length === 0) return null;
  return {
    curto: ordenadas.map((f) => ORIGEM_CURTA[f]).join(' + '),
    titulo: ordenadas.length > 1
      ? `Ato confirmado por ${ordenadas.length} fontes: ${ordenadas.map((f) => ORIGEM_LONGA[f]).join('; ')}`
      : `Origem: ${ORIGEM_LONGA[ordenadas[0]!]}`,
  };
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
  /** `hoje`, `amanhã`, `em 3 dias`, `venceu há 2 dias` — ou `Encerrado`. */
  quando: string;
  /**
   * O prazo já foi FECHADO — cumprido, ou expirado e recolhido pelo relógio
   * (`fecharPrazosDjenExpirados`). A linha continua mostrando o chip, em tom
   * neutro: saber que este ato abriu um prazo é informação mesmo depois de
   * ele encerrar, e esconder faz o ato parecer que nunca cobrou nada.
   */
  encerrado: boolean;
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

  const encerrado = Boolean(prazo.fechado);
  const quando = encerrado ? 'Encerrado' :
    emDias === 0 ? 'vence hoje' :
    emDias === 1 ? 'vence amanhã' :
    emDias > 1   ? `vence em ${emDias} dias` :
    emDias === -1 ? 'venceu ontem' :
    `venceu há ${Math.abs(emDias)} dias`;

  return {
    curto: `${limite.getUTCDate()} ${MESES_CURTOS[limite.getUTCMonth()]}`,
    extenso: `${limite.getUTCDate()} de ${MESES[limite.getUTCMonth()]} de ${limite.getUTCFullYear()}`,
    emDias,
    encerrado,
    dias: prazo.dias ? `${prazo.dias} ${prazo.dias === 1 ? 'dia' : 'dias'}` : null,
    /* `painel`/`grid` é a data que o TRIBUNAL publicou, e lá `metodoPrazo` vem
       sempre nulo (só as origens calculadas o preenchem). Sem esta guarda o card
       punha "≈" num vencimento oficial — e a pauta, que abre o prazo nesse mesmo
       card, mostrava a mesma data sem "≈". Ver `procedenciaPrazo`. */
    estimado: prazo.origem !== 'painel' && prazo.origem !== 'grid' && prazo.metodoPrazo !== 'textoExplicito',
    quando,
    urgente: !encerrado && emDias <= 3,
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

/**
 * Até `limite` nomes de `prazo.parte` — o campo já vem "Fulano, Beltrano,
 * Sicrano" quando o ato intima mais de uma parte (comum em inventário e ação
 * coletiva: este processo mesmo tem 7). `ocultos` é o resto, para a tela
 * poder dizer "+4" em vez de fingir que só havia 3.
 *
 * O corte em si é `partesDoTexto` (`pje-text.ts`), compartilhado com a linha
 * da pauta: os dois cortam o MESMO campo bruto do PJe, e duas versões do
 * divisor dariam contagens diferentes de "+N" para o mesmo ato.
 *
 * **Não reordena pelo cliente.** Faria sentido pôr o representado primeiro,
 * mas nada no contrato de hoje marca QUAL nome do polo é o cliente da conta —
 * `parte` é só o texto do ato, sem ligação com `Deadline.clienteDe` nem com o
 * `representantes` da parte. Reordenar por um palpite (ex.: nome que contém
 * a OAB do usuário) inventaria destaque para o nome errado sempre que o
 * palpite falhasse, que é o lado caro do erro aqui.
 */
export function destinatariosDoAto(
  m: Pick<Movimentacao, 'prazo'>,
  limite = 3,
): { nomes: string[]; ocultos: number } {
  return partesDoTexto(m.prazo?.parte, limite);
}

const SEMANA_CURTA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const SEMANA_LONGA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/**
 * `seg, 21 set` — uma DATA do banco (wall-clock de Brasília gravado em UTC),
 * com o dia da semana na frente.
 *
 * O dia da semana não é enfeite: é ele que responde "tenho o fim de semana?",
 * a primeira conta que se faz diante de um vencimento. Mesmo formato do cartão
 * de "Com prazo" (`ListaDeFios`), para a data ter uma cara só na tela.
 */
export function diaComSemana(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${SEMANA_CURTA[d.getUTCDay()]}, ${d.getUTCDate()} ${MESES_CURTOS[d.getUTCMonth()]}`;
}

/**
 * `hoje, 09:12` · `ontem, 18:40` · `terça, 19:05` · `12/09, 19:05` — a
 * referência de "desde quando", curta. `conector` troca a vírgula por " às "
 * quando a data entra numa frase ("desde terça às 19:05").
 *
 * **Recebe um INSTANTE, não uma data do banco.** A marca d'água
 * (`movimentacoesVistasAte`) é `new Date()` no servidor, UTC de verdade — o
 * oposto das datas de ato, que são wall-clock gravado em UTC. Por isso aqui se
 * desconta o fuso (−3 h) antes de ler com `getUTC*`; lá não.
 *
 * O nome do dia vale até seis dias atrás: "terça" é mais rápido que "15/09" e
 * não fica ambíguo dentro da mesma semana.
 */
export function desdeQuando(iso: string, conector = ', ', agora = Date.now()): string {
  const brasilia = (ms: number) => new Date(ms - 3 * 60 * 60 * 1000);
  const d = brasilia(new Date(iso).getTime());
  if (Number.isNaN(d.getTime())) return 'a última visita';
  const hoje = brasilia(agora);
  const dia = (x: Date) => Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
  const dias = Math.round((dia(hoje) - dia(d)) / 86_400_000);
  const hora = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;

  if (dias <= 0) return `hoje${conector}${hora}`;
  if (dias === 1) return `ontem${conector}${hora}`;
  if (dias < 7) return `${SEMANA_LONGA[d.getUTCDay()]}${conector}${hora}`;
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}${conector}${hora}`;
}

/**
 * A primeira letra em maiúscula — para a PEÇA que vira título.
 *
 * A leitura da IA devolve a peça como termo ("petição de manifestação sobre a
 * resposta ao ofício"), e como título de cartão a minúscula inicial parece
 * texto cortado.
 */
export function comoTitulo(texto: string): string {
  return texto ? texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1) : texto;
}

/**
 * A hora do ato, `HH:MM` — e **00:00 quando a fonte não informa**.
 *
 * Decisão do dono do produto em 17/09/2026, e ela inverte uma regra que este
 * projeto seguia: o DJEN publica numa DATA, e a tela evitava "00:00" para não
 * dar ao ato do diário uma precisão de relógio que ele não tem. O pedido é ver
 * uma hora em toda linha; o motivo continua no `title` (`semHoraMotivo`).
 */
export function horaDoAto(m: Pick<Movimentacao, 'time'>): string {
  return m.time ?? '00:00';
}

/** `hoje às 14:32` · `ontem às 00:00` · `15 set às 09:10`. */
export function quandoComHora(m: Pick<Movimentacao, 'quandoCurto' | 'time'>): string {
  return m.quandoCurto ? `${m.quandoCurto} às ${horaDoAto(m)}` : horaDoAto(m);
}

/** O porquê do 00:00 — a fonte não informou a hora. */
export function semHoraMotivo(m: Pick<Movimentacao, 'origem'>): string {
  return m.origem === 'djen'
    ? 'O diário publica em data, sem horário.'
    : 'O tribunal não informou o horário deste ato.';
}
