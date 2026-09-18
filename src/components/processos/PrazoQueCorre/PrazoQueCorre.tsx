import Link from 'next/link';
import { Clock3 } from 'lucide-react';
import type { Prazo, Processo, TimelineEvent } from '@/types';
import { quandoDoPrazo } from '@/lib/fio-do-prazo';
import { duracaoLonga, tempoCurto, tomDoPrazo } from '@/lib/processo-apresentacao';
import { StatusDot } from '@/components/ui/StatusDot/StatusDot';
import styles from './PrazoQueCorre.module.css';

/** Meses curtos em UTC — o banco grava wall-clock de Brasília nos campos UTC. */
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "22 de setembro de 2026" — o vencimento por extenso, que é como ele se lê. */
const POR_EXTENSO = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

function dataLonga(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : POR_EXTENSO.format(d);
}

function dataCurta(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
}

/** O que perder o prazo custa — o mesmo vocabulário do dossiê de IA. */
const RISCO: Record<string, string> = {
  preclusao: 'perde o prazo processual',
  perdaDeDireito: 'perde o direito',
  revelia: 'revelia',
  multa: 'multa',
  nenhum: 'sem risco direto',
};

const COMPLEXIDADE: Record<string, string> = {
  baixa: 'trabalho curto',
  media: 'trabalho médio',
  alta: 'trabalho longo',
};

const DE_QUEM: Record<string, string> = {
  destinatario: 'do destinatário',
  parteContraria: 'da parte contrária',
  terceiro: 'de terceiro',
};

const NATUREZA: Record<string, string> = { ciencia: 'ciência', manifestacao: 'manifestação' };
const CANAL: Record<string, string> = { diario: 'pelo diário', portal: 'pelo portal' };

/**
 * A QUALIFICAÇÃO do prazo, por extenso — "prazo de 15 dias · manifestação ·
 * pelo diário · sem dobra · do destinatário".
 *
 * Cada pedaço é um campo declarado, e nenhum é inventado quando falta: um
 * prazo sem `canal` simplesmente não diz por onde correu. `deQuem:
 * 'indefinido'` é o único que vira texto próprio — ele significa "está na sua
 * agenda e ninguém afirmou que é seu", que é diferente de não saber o canal.
 */
function qualificacao(prazo: Prazo): { partes: string[]; aConfirmar: boolean } {
  const partes: string[] = [];
  if (prazo.diasPrazo) partes.push(`prazo de ${prazo.diasPrazo} dias`);
  if (prazo.natureza) partes.push(NATUREZA[prazo.natureza]!);
  if (prazo.canal) partes.push(CANAL[prazo.canal]!);
  if (prazo.emDobro === true) partes.push('em dobro');
  else if (prazo.emDobro === false) partes.push('sem dobra');
  const dono = prazo.deQuem && prazo.deQuem !== 'indefinido' ? DE_QUEM[prazo.deQuem] : null;
  if (dono) partes.push(dono);
  return { partes, aConfirmar: prazo.deQuem === 'indefinido' };
}

/**
 * A RÉGUA do prazo: onde ele começou, onde vence, e quanto já passou.
 *
 * O início é a CIÊNCIA quando ela existe, e a publicação quando não — são os
 * dois marcos que o backend grava, e é o mesmo par que a cadeia do ato abre.
 * Sem nenhum dos dois não há denominador, e a barra não é desenhada: inventar
 * um começo seria desenhar uma progressão que não existe.
 *
 * **A barra nunca escreve "dia 13 de 15".** A janela aqui é de dias de
 * CALENDÁRIO e `diasPrazo` costuma ser em dias úteis — 15 úteis dão 21 —,
 * então numerador e denominador viriam de contagens diferentes. O que a tela
 * escreve é "faltam 7 dias", que sai de `diasRestantes`.
 */
function regua(prazo: Prazo): { fracao: number; de: string; ate: string } | null {
  const inicioISO = prazo.cienciaEm ?? prazo.publicadoEm ?? null;
  if (!inicioISO || !prazo.vencimentoISO) return null;
  const inicio = new Date(inicioISO).getTime();
  const fim = new Date(prazo.vencimentoISO).getTime();
  if (Number.isNaN(inicio) || Number.isNaN(fim) || fim <= inicio) return null;
  const de = dataCurta(inicioISO);
  const ate = dataCurta(prazo.vencimentoISO);
  if (!de || !ate) return null;
  return { fracao: Math.min(1, Math.max(0, (Date.now() - inicio) / (fim - inicio))), de, ate };
}

/**
 * § O QUE CORRE AGORA — o primeiro bloco depois de saber de quem é o caso.
 *
 * ## Por que ele deixou de ser uma aba
 *
 * A camada de prazo é fina: **11 prazos abertos numa conta inteira, 4 na
 * outra** — por processo, a mediana é zero ou um. Uma aba "Prazos" é uma sala
 * construída para uma cadeira, e cobra um clique para descobrir que ela está
 * vazia; cobra de novo na visita seguinte. Aqui o prazo que corre é a primeira
 * coisa abaixo do nome do cliente, e o processo sem prazo **diz que não tem**,
 * em vez de esconder a ausência atrás de um rótulo.
 *
 * ## O que este bloco recusa fazer
 *
 * **Redesenhar o fio do prazo.** A cadeia de contagem — disponibilização,
 * publicação, início, vencimento — continua morando em `/movimentacoes/fio/<id>`
 * e no card do ato. Aqui estão o vencimento, a régua e a providência, e daqui
 * se APONTA para lá. Uma quarta implementação da regra do prazo seria a
 * primeira a divergir das outras três.
 *
 * **Grampear o vencido em zero.** `diasRestantes` negativo atravessa inteiro —
 * o `Math.max(0, …)` que esta base já teve fazia todo prazo vencido aparecer
 * como "vence hoje", em vermelho, no único campo em que errar tarde custa o
 * prazo.
 */
export function PrazoQueCorre({ prazo, vencidos, semData, processo, ultimoAto }: {
  /** O prazo mais próximo do vencimento, ou `null` quando nada corre. */
  prazo: Prazo | null;
  /** Quantos passaram da data sem encerramento registrado. */
  vencidos: number;
  /** Quantos expedientes estão sem data definida. */
  semData: number;
  processo: Processo;
  /**
   * A última movimentação do processo, **sem os filtros da tela** — é ela que
   * decide se o silêncio existe. Ver `NadaCorre`.
   */
  ultimoAto?: UltimoAto | null;
}) {
  if (!prazo) return <NadaCorre processo={processo} ultimo={ultimoAto ?? null} />;

  const tom = tomDoPrazo({ diasRestantes: prazo.diasRestantes });
  const quando = quandoDoPrazo(prazo.diasRestantes);
  const { partes, aConfirmar } = qualificacao(prazo);
  const barra = regua(prazo);
  const ia = prazo.ato?.ia;
  /* Só `textoExplicito` é o ATO declarando os dias. `prazoLegal`,
     `padraoCpc218` e `analiseIa` são conta nossa sobre uma regra que não
     conhece feriado estadual — e `painel`/`grid` é o tribunal publicando o
     vencimento, que não leva ressalva nenhuma. */
  const doTribunal = prazo.origemPrazo === 'painel' || prazo.origemPrazo === 'grid';
  const estimado = !doTribunal && prazo.metodoPrazo !== 'textoExplicito';

  return (
    <div className={styles.cartao} data-tom={tom}>
      {/* Duas colunas no desktop: a CONTA à esquerda (vencimento, qualificação,
          régua), a PROVIDÊNCIA à direita. Os dois envoltórios existem para o
          grid não depender de quais filhos condicionais estão presentes — com
          `grid-row: span` sobre irmãos opcionais, faltar o aviso ou faltar a
          leitura de IA reorganizava o bloco inteiro. */}
      <div className={styles.conta}>
      <div className={styles.topo}>
        <span className={styles.selo}>
          <Clock3 aria-hidden="true" size={14} strokeWidth={2} />
          {doTribunal ? 'Prazo do tribunal' : estimado ? 'Prazo estimado' : 'Prazo declarado no ato'}
        </span>
        {quando && <span className={styles.restam}>{quando}</span>}
      </div>

      <div className={styles.vencimentoBloco}>
        <span className={styles.rotulo}>Vencimento</span>
        <p className={styles.vencimento}>
          {prazo.vencimentoISO ? (
            <>
              {estimado && <span className={styles.estimado} title="data calculada por nós, não publicada pelo tribunal">≈</span>}
              <time dateTime={prazo.vencimentoISO}>{dataLonga(prazo.vencimentoISO)}</time>
            </>
          ) : 'Sem data definida'}
        </p>
      </div>

      {(partes.length > 0 || aConfirmar) && (
        <p className={styles.qualificacao}>
          {partes.join(' · ')}
          {aConfirmar && <span className={styles.aConfirmar}>de quem, a confirmar</span>}
        </p>
      )}

      {barra && (
        <div className={styles.reguaLinha}>
          <span className={styles.barra} aria-hidden="true">
            <span className={styles.preenchida} style={{ width: `${Math.round(barra.fracao * 100)}%` }} />
          </span>
          <span className={styles.janela}>{barra.de} → {barra.ate}</span>
        </div>
      )}
      </div>

      <div className={styles.lado}>

      {/* ── O DONO DO PRAZO AINDA NÃO AFIRMADO ──────────────────────────────
          `deQuem: 'indefinido'` quer dizer que o ato nomeia uma parte deste
          processo e ninguém disse que ela é o cliente. Está na agenda por
          precaução, e a tela precisa dizer isso — senão o advogado trabalha
          num prazo que pode ser da outra parte, ou ignora um que é dele. */}
      {aConfirmar && (
        <p className={styles.aviso}>
          Este prazo está na sua agenda porque o ato nomeia uma parte deste processo — mas
          {' '}<strong>ninguém afirmou que ele é seu</strong>. Responder de que lado você está resolve os dois.
        </p>
      )}

      {ia?.oQueFazer && (
        <div className={styles.providencia}>
          <span className={styles.providenciaRotulo}>Você precisa</span>
          <p className={styles.providenciaTexto}>{ia.oQueFazer}</p>
          <p className={styles.chips}>
            {ia.risco && <span className={`${styles.chip} ${ia.risco === 'nenhum' ? styles.chipQuieto : styles.chipAlerta}`}>{RISCO[ia.risco]}</span>}
            {ia.complexidade && <span className={styles.chip}>{COMPLEXIDADE[ia.complexidade]}</span>}
            {ia.precisaDosAutos && <span className={styles.chip}>precisa dos autos</span>}
            {ia.confianca && ia.confianca !== 'alta' && <span className={`${styles.chip} ${styles.chipAtencao}`}>confiança {ia.confianca} — confira</span>}
          </p>
        </div>
      )}
      </div>

      {(vencidos > 0 || semData > 0) && (
        <p className={styles.outros}>
          {vencidos > 0 && `${vencidos} ${vencidos === 1 ? 'prazo passou' : 'prazos passaram'} da data sem encerramento registrado. `}
          {semData > 0 && `${semData} ${semData === 1 ? 'expediente sem data definida' : 'expedientes sem data definida'}.`}
        </p>
      )}

      {/* O ato que abriu o prazo pode não existir (origem `painel`/`grid`: o
          PJe entrega a agenda com o vencimento pronto, sem texto de ato para
          pendurar). Sem ele não há fio nem card — e a linha some, em vez de
          virar um botão que leva a lugar nenhum. */}
      {prazo.movementId && (
        <div className={styles.saidas}>
          {/* `prazo.id`, não `prazo.movementId`: a rota do fio é
              `GET /deadlines/{id}/fio`, e o `findDeadline` casa por `Deadline.id`.
              Com o id do MOVIMENTO o backend devolvia 404 e a tela caía no
              `notFound()` — medido em 18/09/2026, o mesmo prazo responde 200 com
              o id do prazo e 404 com o do ato. O botão mais visível deste bloco
              não levava a lugar nenhum. */}
          <Link href={`/movimentacoes/fio/${encodeURIComponent(prazo.id)}`} className={`${styles.botao} ${styles.botaoForte}`}>
            Ver o fio do prazo →
          </Link>
          <Link href={`/movimentacoes/${encodeURIComponent(prazo.movementId)}`} className={styles.botao}>
            Ver o ato →
          </Link>
        </div>
      )}
    </div>
  );
}

/** O que a tela precisa saber da última movimentação — nada além disto. */
export type UltimoAto = Pick<TimelineEvent, 'id' | 'title' | 'dia'>;

/** Dias inteiros entre hoje e um `YYYY-MM-DD` de Brasília. */
function diasDesde(dia: string): number | null {
  const [ano, mes, d] = dia.split('-').map(Number);
  if (!ano || !mes || !d) return null;
  const hoje = new Date();
  const hojeUTC = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.floor((hojeUTC - Date.UTC(ano, mes - 1, d)) / 86_400_000);
}

/** "hoje" · "ontem" · "há 9 dias" — a distância, na palavra que se usa. */
function quandoMoveu(dias: number): string {
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  return `há ${dias} dias`;
}

/**
 * NADA CORRE — e não é a mesma coisa que "nada acontece".
 *
 * Este bloco responde por PRAZO, e o título dizia "Nada corre." sempre que não
 * havia prazo aberto — inclusive num processo que tinha se movimentado no dia
 * anterior, com a movimentação visível na lista logo abaixo. Pior: o corpo
 * escrevia "Nenhuma movimentação desde 16/09/2026 — 1 dia de silêncio", usando
 * como marco de SILÊNCIO exatamente a data do ato que acabara de chegar. Uma
 * tela desmentindo a outra metade de si mesma.
 *
 * Agora são dois fatos separados, e o segundo decide o título:
 *
 * | última movimentação | título | corpo |
 * |---|---|---|
 * | até 30 dias | "Nenhum prazo em aberto." | o que foi, quando foi, e o link para o ato |
 * | mais que isso, ou nenhuma | "Nada corre." | o silêncio, por extenso |
 *
 * **O marco é o ato, não `Process.lastMovAt`.** Os dois deveriam concordar e
 * não concordam: medido em 17/09/2026, `lastMovAt` vem **3 h à frente** do
 * `ocorridoEm` do mesmo movimento (21:37 contra 18:37) — a coluna guarda um
 * instante UTC de verdade onde o resto do banco grava wall-clock de Brasília.
 * Impresso com `timeZone: 'UTC'`, um ato das 21h vira o dia seguinte. `dia` do
 * evento é a MESMA chave que agrupa a lista, então o bloco e a linha abaixo
 * dele nunca mais podem nomear dias diferentes para o mesmo fato.
 *
 * Metade de um acervo está de fato parada, e para esses o silêncio continua
 * sendo a notícia: "consultado há 3 h, sem falha" é o que transforma "nada
 * aconteceu" em "nós conferimos, e nada aconteceu" — que é o produto.
 */
function NadaCorre({ processo, ultimo }: { processo: Processo; ultimo: UltimoAto | null }) {
  const falhou = Boolean(processo.syncError);
  const dias = ultimo ? diasDesde(ultimo.dia) : null;
  /* Sem ato na mão (filtro estreito, lista vazia) o campo da capa ainda
     responde — é o mesmo dado, com um dia de folga na virada da noite. */
  const silencio = duracaoLonga(processo.lastMovAt);
  const andou = ultimo !== null && dias !== null && dias <= 30;

  return (
    <div className={`${styles.cartao} ${styles.parado}`}>
      <p className={styles.paradoTitulo}>{andou ? 'Nenhum prazo em aberto.' : 'Nada corre.'}</p>

      {andou ? (
        <p className={styles.paradoTexto}>
          O processo se moveu <strong>{quandoMoveu(dias!)}</strong>, e nada do que chegou abriu prazo.{' '}
          <Link href={`/movimentacoes/${encodeURIComponent(ultimo!.id)}`} className={styles.paradoLink}>
            {ultimo!.title}
          </Link>
        </p>
      ) : (
        <p className={styles.paradoTexto}>
          Nenhum prazo em aberto.{' '}
          {processo.lastMovAt && silencio ? (
            <>
              Nenhuma movimentação desde{' '}
              <strong>{new Date(processo.lastMovAt).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</strong> —{' '}
              <strong>{silencio}</strong> de silêncio.
            </>
          ) : 'Nenhuma movimentação registrada nesta consulta.'}
        </p>
      )}

      <p className={styles.paradoSync}>
        <StatusDot state={falhou ? 'alert' : 'quiet'} />
        {falhou ? (
          <span>
            A última consulta <strong>falhou</strong>{processo.lastScrapedAt ? ` ${tempoCurto(processo.lastScrapedAt)}` : ''}.{' '}
            <strong>O silêncio pode ser nosso.</strong> Use “Analisar processo” para tentar de novo.
          </span>
        ) : processo.lastScrapedAt ? (
          <span>
            Consultado <strong>{tempoCurto(processo.lastScrapedAt)}</strong>, sem falha.{' '}
            {andou
              ? <>A tela está em dia com o tribunal.</>
              : <><strong>O silêncio é do tribunal, não da consulta.</strong></>}
          </span>
        ) : (
          <span>Aguardando a primeira consulta a este processo.</span>
        )}
      </p>
    </div>
  );
}
