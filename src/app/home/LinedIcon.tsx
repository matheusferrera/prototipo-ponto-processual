'use client';

import { useRef, type CSSProperties } from 'react';
import { useFlowTrails } from './useFlowTrails';
import styles from './LinedIcon.module.css';

const W = 220;
const H = 240;
const TRAIL_LEN = 5;

/* ── peças compartilhadas ─────────────────────────────────────────────────
   Mesma gramática do diagrama do hero (TribunalFlow): linha fina, brilho
   lento, rastro de pontos percorrendo um trajeto e nó quadrado com anel
   pulsando. Aqui os trajetos correm por cima de objetos do dia a dia —
   a peça processual, o calendário, a conversa no celular. */

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

/** Rastro de pontos que viaja pelo trajeto `id`. */
function Trail({ id, phase, duration }: { id: string; phase?: number; duration?: number }) {
  return (
    <g data-flow-trail={id} data-flow-phase={phase} data-flow-duration={duration}>
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

/** Nó ativo: quadrado sólido + anéis de pulso (dois, defasados). */
function Node({ x, y, r = 20, size = 12 }: { x: number; y: number; r?: number; size?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} className={styles.ring} />
      <circle cx={x} cy={y} r={r} className={styles.ring} style={{ animationDelay: '1.2s' }} />
      <rect x={x - size / 2} y={y - size / 2} width={size} height={size} className={styles.nodeMark} />
    </g>
  );
}

/* ── 1. Leia cada movimentação automaticamente ────────────────────────────
   A peça: folha com orelha dobrada. O rastro varre linha por linha, como
   uma leitura, e acende os trechos que importam. */

const DOC_PAGE = 'M 44,22 L 144,22 L 176,54 L 176,206 L 44,206 Z';
const DOC_FOLD = 'M 144,22 L 144,54 L 176,54';
const DOC_TEXT = [
  { y: 80, x1: 62, x2: 158 },
  { y: 102, x1: 62, x2: 158 },
  { y: 124, x1: 62, x2: 140 },
  { y: 146, x1: 62, x2: 158 },
  { y: 168, x1: 62, x2: 130 },
];
/** trilho de leitura: percorre as linhas em zigue-zague, virando nas margens */
const DOC_READ =
  'M 62,80 L 158,80 C 172,80 172,102 158,102 ' +
  'L 62,102 C 48,102 48,124 62,124 ' +
  'L 140,124 C 154,124 154,146 140,146 ' +
  'L 62,146 C 48,146 48,168 62,168 L 124,168 C 146,168 152,172 152,184';
/** trechos classificados: o que a leitura marcou como movimentação */
const DOC_STAMP = { x: 152, y: 184 };
const DOC_MARKS = [
  { y: 102, x1: 62, x2: 108 },
  { y: 146, x1: 62, x2: 96 },
];

const DocumentIcon = () => (
  <>
    <path d={DOC_PAGE} className={styles.frame} />
    <path d={DOC_FOLD} className={styles.frame} />

    {DOC_TEXT.map((l, i) => (
      <line key={`txt-${i}`} x1={l.x1} y1={l.y} x2={l.x2} y2={l.y} className={styles.tick} />
    ))}
    {DOC_MARKS.map((l, i) => (
      <line
        key={`mark-${i}`}
        x1={l.x1}
        y1={l.y}
        x2={l.x2}
        y2={l.y}
        className={styles.dataRow}
        style={{ animationDelay: `${1.1 * i}s` } as CSSProperties}
      />
    ))}

    <Rail id="doc-read" d={DOC_READ} />
    <Trail id="doc-read" phase={0} duration={5600} />

    {/* o carimbo: a movimentação lida vira dado classificado */}
    <Node x={DOC_STAMP.x} y={DOC_STAMP.y} r={16} />
  </>
);

/* ── 2. Elimine o prazo perdido ───────────────────────────────────────────
   O calendário: o rastro corre os dias, para na data marcada e sai dali
   como alerta — antes de o prazo fechar. */

const CAL = { x: 34, y: 44, w: 152, h: 156 };
const CAL_HEADER_Y = 78;
const CAL_COLS = [72, 110, 148];
const CAL_ROWS = [118, 158];
/** centros das células (4 colunas × 3 linhas) */
const CAL_CX = [53, 91, 129, 167];
const CAL_CY = [98, 138, 179];
const CAL_DEADLINE = { x: CAL_CX[2], y: CAL_CY[2] };
const CAL_ALERT = { x: CAL_CX[2], y: 222 };
/** trilho: dia após dia, em zigue-zague, até a data marcada */
const CAL_DAYS =
  `M ${CAL_CX[0]},${CAL_CY[0]} L ${CAL_CX[3]},${CAL_CY[0]} ` +
  `C 180,${CAL_CY[0]} 180,${CAL_CY[1]} ${CAL_CX[3]},${CAL_CY[1]} ` +
  `L ${CAL_CX[0]},${CAL_CY[1]} ` +
  `C 40,${CAL_CY[1]} 40,${CAL_CY[2]} ${CAL_CX[0]},${CAL_CY[2]} ` +
  `L ${CAL_DEADLINE.x},${CAL_DEADLINE.y}`;
const CAL_OUT = `M ${CAL_DEADLINE.x},${CAL_DEADLINE.y} L ${CAL_ALERT.x},${CAL_ALERT.y}`;

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

    {/* a data marcada */}
    <rect x={CAL_DEADLINE.x - 19} y={CAL_DEADLINE.y - 20} width={38} height={40} className={styles.cellMark} />

    <Rail id="cal-days" d={CAL_DAYS} />
    <Line id="cal-out" d={CAL_OUT} delay={0.6} />

    <Trail id="cal-days" phase={0} duration={5200} />
    <Trail id="cal-out" phase={0.4} duration={1000} />

    <Node x={CAL_DEADLINE.x} y={CAL_DEADLINE.y} r={17} />
    <Node x={CAL_ALERT.x} y={CAL_ALERT.y} r={13} size={10} />
  </>
);

/* ── 3. Feche o ciclo com seu cliente ─────────────────────────────────────
   A conversa: o aviso sai do Ponto Processual, vira mensagem no celular do
   cliente e a resposta volta — o ciclo se fecha sem planilha no meio. */

const WA_NODE = { x: 32, y: 116 };
const WA_PHONE = { x: 88, y: 40, w: 84, h: 158 };
const WA_IN = { x: 98, y: 74, w: 54, h: 28 };
const WA_OUT_BUBBLE = { x: 108, y: 120, w: 54, h: 28 };
const WA_SEND = `M ${WA_NODE.x},${WA_NODE.y} C ${WA_NODE.x},60 58,52 ${WA_IN.x},${WA_IN.y + 14}`;
const WA_BACK =
  `M ${WA_OUT_BUBBLE.x + WA_OUT_BUBBLE.w},${WA_OUT_BUBBLE.y + 13} ` +
  `C 196,134 202,212 118,220 C 56,226 ${WA_NODE.x},176 ${WA_NODE.x},${WA_NODE.y}`;

const WhatsappIcon = () => (
  <>
    <rect
      x={WA_PHONE.x}
      y={WA_PHONE.y}
      width={WA_PHONE.w}
      height={WA_PHONE.h}
      className={styles.frame}
    />
    <line x1={WA_PHONE.x + 26} y1={WA_PHONE.y + 12} x2={WA_PHONE.x + 54} y2={WA_PHONE.y + 12} className={styles.tick} />
    <line x1={WA_PHONE.x + 30} y1={WA_PHONE.y + WA_PHONE.h - 12} x2={WA_PHONE.x + 50} y2={WA_PHONE.y + WA_PHONE.h - 12} className={styles.tick} />

    {/* mensagem que chega do Ponto Processual */}
    <rect x={WA_IN.x} y={WA_IN.y} width={WA_IN.w} height={WA_IN.h} className={styles.bubbleAccent} />
    <line x1={WA_IN.x + 8} y1={WA_IN.y + 10} x2={WA_IN.x + 38} y2={WA_IN.y + 10} className={styles.bubbleTextAccent} />
    <line x1={WA_IN.x + 8} y1={WA_IN.y + 18} x2={WA_IN.x + 28} y2={WA_IN.y + 19} className={styles.bubbleTextAccent} />

    {/* resposta do cliente */}
    <rect x={WA_OUT_BUBBLE.x} y={WA_OUT_BUBBLE.y} width={WA_OUT_BUBBLE.w} height={WA_OUT_BUBBLE.h} className={styles.bubble} />
    <line x1={WA_OUT_BUBBLE.x + 8} y1={WA_OUT_BUBBLE.y + 10} x2={WA_OUT_BUBBLE.x + 32} y2={WA_OUT_BUBBLE.y + 10} className={styles.bubbleText} />
    <line x1={WA_OUT_BUBBLE.x + 8} y1={WA_OUT_BUBBLE.y + 18} x2={WA_OUT_BUBBLE.x + 42} y2={WA_OUT_BUBBLE.y + 19} className={styles.bubbleText} />

    <Line id="wa-send" d={WA_SEND} />
    <Line id="wa-back" d={WA_BACK} delay={1.3} />

    <Trail id="wa-send" phase={0} duration={1500} />
    <Trail id="wa-back" phase={0.55} duration={3200} />

    <Node x={WA_NODE.x} y={WA_NODE.y} r={18} />
  </>
);

const ICONS = {
  documento: DocumentIcon,
  prazo: PrazoIcon,
  whatsapp: WhatsappIcon,
} as const;

export type LinedIconVariant = keyof typeof ICONS;

/**
 * Ilustrações dos pilares ("Sem prazo perdido"). Mesma mecânica e mesma
 * paleta do diagrama do hero (TribunalFlow): rastro de pontos animado por
 * `useFlowTrails` (rAF + getPointAtLength) em vez de keyframes de traço — é
 * o que dá a fluidez contínua, sem saltos.
 */
export function LinedIcon({ variant, size }: { variant: LinedIconVariant; size?: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const IconComponent = ICONS[variant];
  useFlowTrails(svgRef, { duration: 2600, gap: 0.02 });

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
