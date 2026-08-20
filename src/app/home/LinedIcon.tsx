'use client';

import { useRef } from 'react';
import { useFlowTrails } from './useFlowTrails';
import styles from './LinedIcon.module.css';

const W = 220;
const H = 240;
const TRAIL_LEN = 5;

/* ── peças compartilhadas ─────────────────────────────────────────────────
   Mesma gramática do diagrama do hero (TribunalFlow): linha fina, brilho
   lento, rastro de pontos percorrendo um trajeto e nó quadrado com anel
   pulsando. Aqui os trajetos correm por cima de objetos do dia a dia —
   a peça processual, o calendário, a conversa no celular.

   Cada desenho é um ciclo com começo, chegada e descanso: o rastro só anda
   dentro da sua janela (`from`/`to`), os marcos por onde ele passa acendem
   na hora exata e tudo reinicia junto. Nada de loop que gira para sempre —
   o produto promete resolver, e o desenho precisa resolver também. */

/** Trajeto visível: linha de base + brilho. O `id` casa com o rastro. */
function Line({ id, d, delay = 0 }: { id: string; d: string; delay?: number }) {
  return (
    <>
      <path d={d} data-flow-path={id} className={styles.baseLine} />
      <path d={d} className={styles.shimmerLine} style={{ animationDelay: `${delay}s` }} />
    </>
  );
}

/** Trilho discreto: só guia o rastro (usado onde o traço forte atrapalharia). */
function Rail({ id, d }: { id: string; d: string }) {
  return <path d={d} data-flow-path={id} className={styles.rail} />;
}

/** Rastro de pontos que percorre o trajeto `id` entre `from` e `to` do ciclo. */
function Trail({ id, from, to }: { id: string; from?: number; to?: number }) {
  return (
    <g
      className={styles.trail}
      data-flow-trail={id}
      data-flow-phase={0}
      data-flow-from={from}
      data-flow-to={to}
    >
      {Array.from({ length: TRAIL_LEN }).map((_, j) => (
        <circle
          key={j}
          r={3.4 - j * 0.48}
          className={styles.trailDot}
          style={{ opacity: 1 - j / TRAIL_LEN }}
        />
      ))}
    </g>
  );
}

/**
 * Nó do trajeto. Sem `at`, fica aceso o tempo todo (é uma origem que não
 * para). Com `at`, é um destino: só dispara quando o rastro daquele trajeto
 * chega nele, e apaga no reinício do ciclo.
 */
function Node({
  x,
  y,
  r = 20,
  size = 12,
  at,
}: {
  x: number;
  y: number;
  r?: number;
  size?: number;
  at?: string;
}) {
  return (
    <g data-flow-at={at}>
      <circle cx={x} cy={y} r={r} className={at ? styles.ring : styles.ringOrigin} />
      <circle
        cx={x}
        cy={y}
        r={r}
        className={at ? styles.ring : styles.ringOrigin}
        style={{ animationDelay: '1.2s' }}
      />
      <rect x={x - size / 2} y={y - size / 2} width={size} height={size} className={styles.nodeMark} />
    </g>
  );
}

/* ── 1. "A ronda deixa de ser sua" ────────────────────────────────────────
   Os três verbos da descrição, na ordem: o rastro **entra** vindo de fora da
   folha (abre o sistema), **varre** linha por linha acendendo o que importa
   (lê o que saiu) e **sai** pela borda de baixo até a linha do processo
   (arquiva onde pertence). */

const DOC_PAGE = 'M 44,16 L 144,16 L 176,48 L 176,186 L 44,186 Z';
const DOC_FOLD = 'M 144,16 L 144,48 L 176,48';
const DOC_TEXT = [
  { y: 68, x1: 62, x2: 158 },
  { y: 90, x1: 62, x2: 158 },
  { y: 112, x1: 62, x2: 158 },
  { y: 134, x1: 62, x2: 158 },
  { y: 156, x1: 62, x2: 130 },
];
const DOC_SOURCE = { x: 12, y: 44 };
const DOC_FILED = { x: 150, y: 218 };
/** as duas linhas do processo onde a publicação vai parar */
const DOC_ROWS = [
  { y: 210, x2: 130 },
  { y: 226, x2: 104 },
];
const DOC_READ =
  `M ${DOC_SOURCE.x},${DOC_SOURCE.y} C 34,44 36,68 62,68 ` +
  'L 158,68 C 172,68 172,90 158,90 ' +
  'L 62,90 C 48,90 48,112 62,112 ' +
  'L 158,112 C 172,112 172,134 158,134 ' +
  'L 62,134 C 48,134 48,156 62,156 ' +
  `L 124,156 C 146,156 ${DOC_FILED.x},170 ${DOC_FILED.x},190 ` +
  `L ${DOC_FILED.x},${DOC_FILED.y}`;
/** trechos que a leitura classifica como movimentação */
const DOC_MARKS = [
  { y: 90, x1: 62, x2: 108 },
  { y: 134, x1: 62, x2: 96 },
];

const RondaIcon = () => (
  <>
    {/* de onde a publicação vem: um sistema qualquer, fora da folha */}
    <rect
      x={DOC_SOURCE.x - 4}
      y={DOC_SOURCE.y - 4}
      width={8}
      height={8}
      className={styles.sourceMark}
    />

    <path d={DOC_PAGE} className={styles.frame} />
    <path d={DOC_FOLD} className={styles.frame} />

    {DOC_TEXT.map(l => (
      <line key={`txt-${l.y}`} x1={l.x1} y1={l.y} x2={l.x2} y2={l.y} className={styles.tick} />
    ))}
    {DOC_MARKS.map(l => (
      <line
        key={`mark-${l.y}`}
        x1={l.x1}
        y1={l.y}
        x2={l.x2}
        y2={l.y}
        className={styles.dataRow}
        data-flow-at="doc-read"
      />
    ))}

    {/* a linha do processo, onde a publicação vai parar */}
    {DOC_ROWS.map(r => (
      <line key={`row-${r.y}`} x1={48} y1={r.y} x2={r.x2} y2={r.y} className={styles.tick} />
    ))}

    <Rail id="doc-read" d={DOC_READ} />
    <Trail id="doc-read" to={0.82} />

    <Node x={DOC_FILED.x} y={DOC_FILED.y} r={13} size={10} at="doc-read" />
  </>
);

/* ── 2. "O prazo já vem contado" ──────────────────────────────────────────
   A contagem em dias úteis é o que a descrição promete, então é o que o
   desenho mostra: o rastro corre os dias e **salta por cima** das células
   hachuradas (fim de semana, feriado do tribunal) até pousar na data de
   vencimento. Só depois de pousar é que o alerta sai do calendário. */

const CAL = { x: 34, y: 44, w: 152, h: 156 };
const CAL_HEADER_Y = 78;
const CAL_COLS = [72, 110, 148];
const CAL_ROWS = [118, 158];
/** centros das células (4 colunas × 3 linhas) */
const CAL_CX = [53, 91, 129, 167];
const CAL_CY = [98, 138, 179];
/** dias que não contam: o rastro passa por cima deles */
const CAL_OFF = [
  { x: CAL_CX[2], y: CAL_CY[0] },
  { x: CAL_CX[1], y: CAL_CY[2] },
];
const CAL_DEADLINE = { x: CAL_CX[2], y: CAL_CY[2] };
const CAL_ALERT = { x: CAL_CX[2], y: 224 };
const CAL_DAYS =
  `M ${CAL_CX[0]},${CAL_CY[0]} L 110,${CAL_CY[0]} ` +
  `C 118,${CAL_CY[0]} 118,85 ${CAL_CX[2]},85 C 140,85 140,${CAL_CY[0]} 148,${CAL_CY[0]} ` +
  `L ${CAL_CX[3]},${CAL_CY[0]} ` +
  `C 180,${CAL_CY[0]} 180,${CAL_CY[1]} ${CAL_CX[3]},${CAL_CY[1]} ` +
  `L ${CAL_CX[0]},${CAL_CY[1]} ` +
  `C 40,${CAL_CY[1]} 40,${CAL_CY[2]} ${CAL_CX[0]},${CAL_CY[2]} ` +
  `L 72,${CAL_CY[2]} C 80,${CAL_CY[2]} 80,166 ${CAL_CX[1]},166 ` +
  `C 102,166 102,${CAL_CY[2]} 110,${CAL_CY[2]} ` +
  `L ${CAL_DEADLINE.x},${CAL_DEADLINE.y}`;
const CAL_OUT = `M ${CAL_DEADLINE.x},${CAL_DEADLINE.y} L ${CAL_ALERT.x},${CAL_ALERT.y}`;

/** duas diagonais dentro da célula: o dia que não conta */
const hatch = (cx: number, cy: number) =>
  `M ${cx - 13},${cy + 13} L ${cx + 4},${cy - 12} M ${cx - 3},${cy + 13} L ${cx + 14},${cy - 12}`;

const PrazoIcon = () => (
  <>
    {/* argolas */}
    {[70, 110, 150].map(x => (
      <line key={`ring-${x}`} x1={x} y1={30} x2={x} y2={56} className={styles.tickStrong} />
    ))}

    <rect x={CAL.x} y={CAL.y} width={CAL.w} height={CAL.h} className={styles.frame} />
    {CAL_CX.map(x => (
      <line key={`dow-${x}`} x1={x - 9} y1={64} x2={x + 9} y2={64} className={styles.tickStrong} />
    ))}
    <line x1={CAL.x} y1={CAL_HEADER_Y} x2={CAL.x + CAL.w} y2={CAL_HEADER_Y} className={styles.frame} />

    {CAL_COLS.map(x => (
      <line key={`col-${x}`} x1={x} y1={CAL_HEADER_Y} x2={x} y2={CAL.y + CAL.h} className={styles.tick} />
    ))}
    {CAL_ROWS.map(y => (
      <line key={`row-${y}`} x1={CAL.x} y1={y} x2={CAL.x + CAL.w} y2={y} className={styles.tick} />
    ))}

    {CAL_OFF.map(c => (
      <path key={`off-${c.x}-${c.y}`} d={hatch(c.x, c.y)} className={styles.hatch} />
    ))}

    {/* a data de vencimento: pontilhada enquanto é só previsão, cheia quando a contagem chega */}
    <rect
      x={CAL_DEADLINE.x - 19}
      y={CAL_DEADLINE.y - 20}
      width={38}
      height={40}
      className={styles.cellMark}
      data-flow-at="cal-days"
    />

    <Rail id="cal-days" d={CAL_DAYS} />
    <Line id="cal-out" d={CAL_OUT} delay={0.6} />

    <Trail id="cal-days" to={0.6} />
    <Trail id="cal-out" from={0.63} to={0.76} />

    <Node x={CAL_ALERT.x} y={CAL_ALERT.y} r={13} size={10} at="cal-out" />
  </>
);

/* ── 3. "Quando o cliente liga, você já sabe" ─────────────────────────────
   O pilar é uma corrida, e o desenho é a corrida: dois rastros chegam ao
   mesmo celular, o alerta da publicação e a ligação do cliente. As janelas
   são escalonadas de propósito — o alerta pousa e acende antes de o
   telefone tocar, em todo ciclo. */

const WA_NODE = { x: 28, y: 92 };
const WA_PHONE = { x: 86, y: 38, w: 86, h: 162 };
const WA_ALERT = { x: 98, y: 66, w: 62, h: 32 };
const WA_CALL = { x: 98, y: 132, w: 62, h: 30 };
const WA_CALLER = { x: 194, y: 178 };
const WA_SEND = `M ${WA_NODE.x},${WA_NODE.y} C 24,56 56,40 100,50 C 112,53 110,72 104,82`;
const WA_RING =
  `M ${WA_CALLER.x},${WA_CALLER.y} C 206,150 196,126 176,133 C 168,136 164,142 160,147`;

const AvisoIcon = () => (
  <>
    <rect
      x={WA_PHONE.x}
      y={WA_PHONE.y}
      width={WA_PHONE.w}
      height={WA_PHONE.h}
      className={styles.frame}
    />
    <line x1={116} y1={50} x2={142} y2={50} className={styles.tick} />
    <line x1={116} y1={188} x2={142} y2={188} className={styles.tick} />

    {/* o alerta do Ponto Processual: chega primeiro */}
    <g data-flow-at="wa-send">
      <rect
        x={WA_ALERT.x}
        y={WA_ALERT.y}
        width={WA_ALERT.w}
        height={WA_ALERT.h}
        className={styles.bubbleAccent}
      />
      <line x1={106} y1={78} x2={146} y2={78} className={styles.bubbleTextAccent} />
      <line x1={106} y1={88} x2={134} y2={88} className={styles.bubbleTextAccent} />
    </g>

    {/* a ligação do cliente: chega depois, e já encontra a resposta na tela */}
    <g data-flow-at="wa-call">
      <rect
        x={WA_CALL.x}
        y={WA_CALL.y}
        width={WA_CALL.w}
        height={WA_CALL.h}
        className={styles.bubble}
      />
      <circle cx={112} cy={147} r={6} className={styles.bubbleText} />
      <line x1={126} y1={143} x2={150} y2={143} className={styles.bubbleText} />
      <line x1={126} y1={152} x2={142} y2={152} className={styles.bubbleText} />
    </g>

    <Line id="wa-send" d={WA_SEND} />
    <Rail id="wa-call" d={WA_RING} />

    <Trail id="wa-send" to={0.3} />
    <Trail id="wa-call" from={0.46} to={0.72} />

    {/* dois pontos de partida: a plataforma e o cliente. Quem chega primeiro
        é o que o pilar afirma. */}
    <Node x={WA_NODE.x} y={WA_NODE.y} r={16} />
    <Node x={WA_CALLER.x} y={WA_CALLER.y} r={11} size={8} />
  </>
);

const ICONS = {
  ronda: RondaIcon,
  prazo: PrazoIcon,
  aviso: AvisoIcon,
} as const;

export type LinedIconVariant = keyof typeof ICONS;

/**
 * Ilustrações dos três pilares ("Você não perde prazo por desorganização").
 * Mesma mecânica e mesma paleta do diagrama do hero (TribunalFlow): rastro de
 * pontos animado por `useFlowTrails` (rAF + getPointAtLength) em vez de
 * keyframes de traço — é o que dá a fluidez contínua, sem saltos.
 *
 * O ciclo é a rolagem (`drive: 'scroll'`), não um relógio: parado o desenho
 * não se mexe, descendo ele trabalha, subindo ele desfaz. As três máquinas
 * terminam o serviço enquanto o pilar ainda sobe até a altura de leitura, e
 * ficam no quadro resolvido justamente enquanto o texto está sendo lido.
 */
export function LinedIcon({ variant, size }: { variant: LinedIconVariant; size?: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const IconComponent = ICONS[variant];
  useFlowTrails(svgRef, { gap: 0.02, drive: 'scroll' });

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className={styles.svg}
      aria-hidden="true"
      style={size ? { width: size, height: size } : undefined}
    >
      <IconComponent />
    </svg>
  );
}
