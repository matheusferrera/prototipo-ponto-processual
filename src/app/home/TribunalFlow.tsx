'use client';

import { useRef } from 'react';
import { useFlowTrails } from './useFlowTrails';
import styles from './TribunalFlow.module.css';

const SOURCES = [
  { y: 20, label: 'PJe' },
  { y: 96, label: 'e-SAJ' },
  { y: 172, label: 'TJSP' },
  { y: 248, label: 'TJRJ' },
  { y: 324, label: 'STJ' },
  { y: 400, label: 'Projudi' },
];

const HUB = { x: 400, y: 210 };
const OUT_X = 740;
const TRAIL_LEN = 5;

function curveTo(y0: number) {
  const mid = (y0 + HUB.y) / 2;
  return `M 0,${y0} C 180,${y0} 300,${mid} ${HUB.x},${HUB.y}`;
}

const PATHS = [...SOURCES.map(s => curveTo(s.y)), `M ${HUB.x},${HUB.y} L ${OUT_X},${HUB.y}`];

/**
 * Diagrama animado: tribunais (fontes à esquerda) convergindo pro hub
 * central — Ponto Processual — e saindo num fluxo único até o WhatsApp do
 * usuário. Mecânica de referência: capconvert.com (hero) — bézier
 * convergentes com um rastro de pontos viajando por cada linha; aqui
 * adaptado pro domínio (tribunais → produto → celular) e à paleta do site.
 *
 * O motor dos rastros vive em `useFlowTrails` e é o mesmo usado pelos
 * ícones dos pilares (LinedIcon.tsx).
 */
export function TribunalFlow() {
  const svgRef = useRef<SVGSVGElement>(null);
  useFlowTrails(svgRef, { duration: 2400 });

  return (
    <div className={styles.wrap}>
      <svg
        ref={svgRef}
        className={styles.svg}
        viewBox="0 0 800 420"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        {PATHS.map((d, i) => (
          <path key={`base-${i}`} d={d} data-flow-path={i} className={styles.baseLine} />
        ))}
        {SOURCES.map((s, i) => (
          <path
            key={`shimmer-${i}`}
            d={curveTo(s.y)}
            className={styles.shimmerLine}
            style={{ animationDelay: `${i * 0.22}s` }}
          />
        ))}

        {SOURCES.map((s, i) => (
          <text key={`label-${i}`} x={8} y={s.y - 10} className={styles.sourceLabel}>
            {s.label}
          </text>
        ))}

        {PATHS.map((_, i) => (
          <g key={`trail-${i}`} data-flow-trail={i}>
            {Array.from({ length: TRAIL_LEN }).map((_, j) => (
              <circle key={j} r={3.2 - j * 0.45} className={styles.trailDot} style={{ opacity: 1 - j / TRAIL_LEN }} />
            ))}
          </g>
        ))}

        <g>
          <circle cx={HUB.x} cy={HUB.y} r={26} className={styles.hubRing} />
          <circle cx={HUB.x} cy={HUB.y} r={26} className={styles.hubRing} style={{ animationDelay: '1.2s' }} />
          <rect x={HUB.x - 7} y={HUB.y - 7} width={14} height={14} className={styles.hubMark} />
        </g>
        <text x={HUB.x} y={HUB.y + 48} textAnchor="middle" className={styles.hubLabel}>
          PONTO PROCESSUAL
        </text>
        <g className={styles.phoneGroup} transform="translate(730, 196)">
          <g transform="scale(1.2)" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
            <path d="M12 18h.01" />
          </g>
          <text x={14} y={42} textAnchor="middle" className={styles.phoneLabel}>
            SEU CELULAR
          </text>
        </g>
      </svg>
    </div>
  );
}
