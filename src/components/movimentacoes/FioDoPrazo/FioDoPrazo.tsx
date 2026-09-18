import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { EventoDoFio, FioDoPrazo as Fio } from '@/lib/api.server';
import type { PrazoDoAto } from '@/types';
import { CadeiaDoPrazo } from '@/components/movimentacoes/AtoDetalhe/AtoDetalhe';
import { MovimentacaoRow } from '@/components/movimentacoes/MovimentacaoRow/MovimentacaoRow';
import { AtosDeTramite } from '@/components/movimentacoes/AtosDeTramite/AtosDeTramite';
import { BaixarPrazo } from '@/components/prazos/BaixarPrazo/BaixarPrazo';
import { LembrarPrazo } from '@/components/prazos/LembrarPrazo/LembrarPrazo';
import { quandoDoPrazo } from '@/lib/fio-do-prazo';
import { wallClock } from '@/lib/wall-clock';
import styles from './FioDoPrazo.module.css';

/**
 * O FIO DO PRAZO — o prazo como recipiente, a movimentação como evento dentro.
 *
 * ## A tese
 *
 * O feed é cronológico e responde "o que chegou". Esta tela responde **"o que
 * aconteceu neste caso desde que o prazo abriu"** — a pergunta de quem tem
 * prazo correndo. A diferença de escala é o argumento inteiro: medido em
 * 15/09/2026 numa conta real, **18.485 movimentações** (370 páginas a 50 por
 * página) contra **11 prazos abertos**.
 *
 * ## A ordem é CRESCENTE, e é a única lista do produto assim
 *
 * O ato que abriu vem primeiro; hoje vem por último. Um prazo é uma história
 * com começo, e ler do fim para o começo desmontaria justamente o que o fio
 * tem a oferecer. Todas as outras listas deste produto são "mais recentes
 * primeiro" porque a pergunta delas é outra.
 *
 * ## O que ele NÃO faz
 *
 * **Não depende da IA.** O corte é `ocorridoEm >= inicioEm` — aritmética de
 * datas. A leitura por IA cobre 6,1% dos atos legíveis (15 de 245 numa conta,
 * 10 de 119 na outra): um fio que dependesse dela viria vazio.
 *
 * **Não pagina.** O backend traz até 200 eventos e diz o total; um prazo cobre
 * dias, não anos. Quando o total passar do teto, a tela diz isso em uma linha
 * em vez de fingir que mostrou tudo.
 *
 * **Não repete o nome do prazo em cada linha.** Ele é o cabeçalho da tela.
 */
export function FioDoPrazo({ fio, prazoDoAto }: {
  fio: Fio;
  /**
   * O prazo como o ATO o descreve — é ele que carrega a `cadeia`, e por isso a
   * conta do vencimento mora aqui e não no card do ato (ver `CorpoDoCard`).
   * `null` quando o ato que abriu não foi encontrado, ou quando a conta não
   * reproduz a data gravada: aí o botão simplesmente não aparece.
   */
  prazoDoAto?: PrazoDoAto | null;
}) {
  const { prazo, regua, eventos, total } = fio;
  const peca = prazo.ato?.ia?.peca?.trim() || prazo.tipo;
  const quando = quandoDoPrazo(regua?.restam ?? prazo.diasRestantes);
  const vencido = (regua?.restam ?? prazo.diasRestantes ?? 0) < 0;
  const urgente = (regua?.restam ?? prazo.diasRestantes ?? 99) <= 3;
  const estimado = prazo.metodoPrazo !== undefined && prazo.metodoPrazo !== 'textoExplicito';

  /* QUANTAS MOVIMENTAÇÕES DESDE QUE ABRIU — sem o ato que abriu, que não é
     novidade sobre si mesmo. `total` conta a janela inteira (o abridor
     incluído, porque ele é o primeiro item do fio), então o título subtrai.
     Sem isso o fio diria "1 movimentação desde que abriu" para o prazo em que
     nada aconteceu, e a movimentação seria ele mesmo — a mesma correção que o
     cartão da lista já carrega, e a frase precisa significar o mesmo nas duas
     telas. */
  const desde = Math.max(0, total - (eventos.some(e => e.abriuOPrazo) ? 1 : 0));

  return (
    <div className={styles.raiz}>

      {/* ── A CABEÇA DO FIO ───────────────────────────────────────────────
          Tudo que o advogado precisa antes de ler um único evento: o que
          produzir, até quando, de quem é o caso e em que ponto da janela
          estamos. */}
      <header className={styles.cabeca} data-urgente={urgente || undefined} data-vencido={vencido || undefined}>
        <div className={styles.cabecaTopo}>
          <h1 className={styles.peca}>{peca}</h1>
          {quando && <span className={styles.quando}>{quando}</span>}
        </div>

        <p className={styles.vencimento}>
          {prazo.vencimento ? (
            <>
              vence <strong>{porExtenso(prazo.vencimentoISO)}</strong>
              {/* O "≈" é o que impede uma estimativa de passar por vencimento
                  oficial do tribunal. Aqui ele vira frase inteira, porque há
                  espaço — no feed cabe só o caractere. */}
              {estimado && <span className={styles.estimativa}> · data calculada por nós, não publicada pelo tribunal</span>}
            </>
          ) : (
            /* Prazo sem data é estado VÁLIDO, não erro: o PJe ainda não
               calculou o decurso, ou o texto não declarou os dias. Dizer isso é
               melhor que uma data em branco, e muito melhor que uma inventada. */
            <span className={styles.semData}>sem data-limite definida pelo tribunal</span>
          )}
          {prazo.diasPrazo ? <> · prazo de {prazo.diasPrazo} {prazo.diasPrazo === 1 ? 'dia' : 'dias'}</> : null}
          {prazo.canal === 'diario' ? ' · pelo diário' : prazo.canal === 'portal' ? ' · pelo portal' : null}
        </p>

        <p className={styles.processo}>
          {prazo.cliente?.length ? <strong>{prazo.cliente.join(', ')}</strong> : prazo.parte || '—'}
          {prazo.parteContraria?.length ? <> × {prazo.parteContraria.join(', ')}</> : null}
        </p>
        <p className={styles.cnj}>
          {prazo.cnj} · {prazo.orgaoJulgador} · {prazo.tribunal}
        </p>

        {/* A RÉGUA. `totalDias` é a janela de CALENDÁRIO entre a publicação e o
            vencimento — não o "15 dias" do ato, que pode estar em dias úteis.
            Por isso a barra não vem rotulada "dia 13 de 15": o numerador e o
            denominador seriam de contagens diferentes, e a frase certa já está
            no topo ("faltam 2 dias"). */}
        {regua && (
          <div className={styles.regua}>
            <span className={styles.trilha} aria-hidden="true">
              <span className={styles.percorrido} style={{ width: `${pct(regua.decorridos, regua.totalDias)}%` }} />
            </span>
            <span className={styles.reguaTexto}>
              {curta(regua.inicioEm)}{' → '}{curta(prazo.vencimentoISO)}
            </span>
          </div>
        )}

        <div className={styles.acoes}>
          <BaixarPrazo prazoId={prazo.id} fechado={Boolean(prazo.fechado)} compacto />
          <LembrarPrazo prazoId={prazo.id} vencimentoISO={prazo.vencimentoISO} lembrarEm={prazo.lembrarEm ?? null} />
          {prazo.movementId && (
            <Link href={`/movimentacoes/${prazo.movementId}`} className={styles.saida}>
              Ver o ato que abriu <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          )}
        </div>
        {/* ── COMO CHEGAMOS NESSA DATA ────────────────────────────────────
            Veio do card do ato em 18/09/2026, a pedido do dono do produto: lá
            ela disputava o lugar com "tudo o que aconteceu neste prazo", e aqui
            está a tela CUJO assunto é o prazo. Os quatro marcos —
            disponibilização, publicação, início, vencimento — com o dispositivo
            de cada um; nada é calculado no navegador.

            **Abre FECHADA**, como abria no card: a conta é conferência de quem
            quer, não leitura obrigatória de quem só veio ver o que aconteceu. */}
        {prazoDoAto && (
          <details className={styles.conta}>
            <summary className={styles.contaResumo}>Ver como chegamos nessa data</summary>
            <div className={styles.contaCorpo}>
              <CadeiaDoPrazo prazo={prazoDoAto} estimado={estimado} />
            </div>
          </details>
        )}
      </header>

      {/* ── O DECORRER ───────────────────────────────────────────────────── */}
      <section className={styles.decorrer} aria-label="O que aconteceu desde que o prazo abriu">
        <h2 className={styles.tituloSecao}>
          {desde === 0
            ? 'Nada aconteceu no processo desde que o prazo abriu'
            : `Desde que ele abriu · ${desde} ${desde === 1 ? 'movimentação' : 'movimentações'}`}
        </h2>

        {/* Silêncio É resposta, e é dito em uma frase. Um fio vazio sem isto
            parece um fio que não carregou — e a dúvida sobre se o sistema está
            olhando é o oposto do que o produto vende. Medido em 15/09/2026:
            5 dos 11 prazos abertos da conta estavam exatamente assim. */}
        {desde === 0 && (
          <p className={styles.silencio}>
            O processo não se moveu desde {porExtenso(regua?.inicioEm ?? prazo.publicadoEm ?? null, false)}.
            Nada mudou o que você tem de protocolar.
          </p>
        )}

        {eventos.length > 0 && (
          <ol className={styles.fio}>
            {blocosDoFio(eventos).map((bloco, i) => (
              bloco.tipo === 'evento'
                ? <Evento key={bloco.evento.item.id} evento={bloco.evento} />
                : (
                  <li key={`tramite-${i}`} className={styles.eventoTramite}>
                    <span className={styles.trilho} aria-hidden="true"><span className={styles.pontoFraco} /></span>
                    <div className={styles.conteudoTramite}>
                      <AtosDeTramite itens={bloco.itens.map(e => e.item)}>
                        {bloco.itens.map(e => (
                          <li key={e.item.id}>
                            <MovimentacaoRow m={e.item} noProcesso comHora comData href={`/movimentacoes/${e.item.id}`} />
                          </li>
                        ))}
                      </AtosDeTramite>
                    </div>
                  </li>
                )
            ))}
          </ol>
        )}

        {/* HOJE fecha a leitura no lugar certo: o fio sobe do passado até aqui,
            e a última coisa que se lê é quanto ainda resta. */}
        <div className={styles.hoje} data-urgente={urgente || undefined} data-vencido={vencido || undefined}>
          <span className={styles.hojeMarca} aria-hidden="true" />
          <span className={styles.hojeTexto}>
            hoje{quando ? ` — ${quando}` : ''}
          </span>
        </div>

        {total > eventos.length && (
          <p className={styles.teto}>
            Mostrando os {eventos.length} primeiros de {total}.
          </p>
        )}
      </section>
    </div>
  );
}

function Evento({ evento }: { evento: EventoDoFio }) {
  return (
    <li className={styles.evento} data-marco={evento.abriuOPrazo ? 'abriu' : undefined}>
      <span className={styles.trilho} aria-hidden="true">
        <span className={evento.abriuOPrazo || evento.mexeComOPrazo ? styles.ponto : styles.pontoFraco} />
      </span>
      <div className={styles.conteudo}>
        {evento.abriuOPrazo && <span className={styles.marco}>o prazo abriu aqui</span>}
        <MovimentacaoRow m={evento.item} noProcesso comHora comData href={`/movimentacoes/${evento.item.id}`} />
      </div>
    </li>
  );
}

type BlocoDoFio =
  | { tipo: 'evento'; evento: EventoDoFio }
  | { tipo: 'tramite'; itens: EventoDoFio[] };

/**
 * As corridas de trâmite do fio, colapsadas — a mesma regra do feed, aplicada a
 * eventos em vez de movimentações.
 *
 * **O ato que abriu o prazo nunca entra num bloco**, mesmo que a categoria dele
 * seja trâmite: ele é o começo da história e o único evento com marco próprio.
 */
function blocosDoFio(eventos: readonly EventoDoFio[]): BlocoDoFio[] {
  const blocos: BlocoDoFio[] = [];
  let corrida: EventoDoFio[] = [];

  const fechar = () => {
    if (corrida.length >= 2) blocos.push({ tipo: 'tramite', itens: corrida });
    else for (const evento of corrida) blocos.push({ tipo: 'evento', evento });
    corrida = [];
  };

  for (const evento of eventos) {
    if (!evento.mexeComOPrazo && !evento.abriuOPrazo) { corrida.push(evento); continue; }
    fechar();
    blocos.push({ tipo: 'evento', evento });
  }
  fechar();

  return blocos;
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/**
 * "quarta, 17 de setembro" — a data que se lê, não a que se confere.
 *
 * O DIA DA SEMANA não é enfeite: é ele que diz se dá tempo. "17/09" não
 * responde "tenho o fim de semana?", e essa é a primeira conta que se faz ao
 * ver um vencimento.
 *
 * Tudo em wall-clock de Brasília (`getUTC*`): as datas do banco já SÃO locais,
 * e ler com `getDate()` volta 3h — o que empurra para o dia anterior toda data
 * publicada às 00:00, que é como o DJEN publica. Ver `wall-clock.ts`.
 */
function porExtenso(iso: string | null | undefined, comSemana = true): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const w = wallClock(d);
  const dia = `${w.dia} de ${MESES[w.mes]}`;
  return comSemana ? `${SEMANA[w.diaDaSemana]}, ${dia}` : dia;
}

/** "3 set" — para as pontas da régua, onde só a posição importa. */
function curta(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const w = wallClock(d);
  return `${w.dia} ${MESES_CURTOS[w.mes]}`;
}

/** A barra, em inteiros — `width: 85.714%` não é mais preciso, só mais longo. */
function pct(parte: number, total: number): number {
  if (total < 1) return 0;
  return Math.round(Math.min(1, Math.max(0, parte / total)) * 100);
}
