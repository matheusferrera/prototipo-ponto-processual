'use client';

import { useEffect, type RefObject } from 'react';

type FlowOptions = {
  /** ms para um ponto percorrer o trajeto inteiro */
  duration?: number;
  /** distância entre os pontos do rastro, em fração do trajeto */
  gap?: number;
};

/**
 * Motor dos rastros de pontos que percorrem trajetos SVG (mecânica do
 * diagrama do hero, ver TribunalFlow.tsx). Um único rAF move todos os pontos
 * com `getPointAtLength`, o que dá movimento contínuo e independente de
 * layout — nada de `stroke-dasharray` por keyframe, que engasga em curva.
 *
 * Marcação esperada dentro do `<svg>`:
 *   <path data-flow-path="a" ... />
 *   <g data-flow-trail="a"><circle/><circle/>…</g>
 *
 * Por rastro dá pra sobrescrever `data-flow-duration` (ms), `data-flow-gap`
 * (fração) e `data-flow-phase` (0–1, onde o rastro começa no trajeto). Sem
 * `data-flow-phase`, os rastros são distribuídos igualmente no ciclo.
 *
 * Respeita `prefers-reduced-motion` (não anima) e só gasta frame enquanto o
 * SVG está na viewport. Marca `data-flow-ready` no `<svg>` no primeiro frame:
 * é o gancho pro CSS só mostrar os pontos depois que eles têm posição.
 */
export function useFlowTrails(
  svgRef: RefObject<SVGSVGElement | null>,
  { duration = 2400, gap = 0.02 }: FlowOptions = {},
) {
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const groups = [...svg.querySelectorAll<SVGGElement>('[data-flow-trail]')];
    const trails = groups
      .map((group, i) => {
        const key = group.dataset.flowTrail ?? '';
        const path = svg.querySelector<SVGPathElement>(`[data-flow-path="${key}"]`);
        const phase = group.dataset.flowPhase;
        return {
          path,
          len: path?.getTotalLength() ?? 0,
          dots: [...group.querySelectorAll<SVGCircleElement>('circle')],
          duration: Number(group.dataset.flowDuration) || duration,
          gap: Number(group.dataset.flowGap) || gap,
          phase: phase !== undefined ? Number(phase) : i / groups.length,
        };
      })
      .filter(t => t.path && t.len > 0);

    if (!trails.length) return;

    let visible = true;
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0 });
    io.observe(svg);

    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      // até o primeiro posicionamento os pontos estariam todos em (0,0)
      svg.dataset.flowReady = 'true';
      const elapsed = now - start;
      for (const trail of trails) {
        trail.dots.forEach((dot, j) => {
          const t = ((elapsed / trail.duration + trail.phase - j * trail.gap) % 1 + 1) % 1;
          const pt = trail.path!.getPointAtLength(t * trail.len);
          dot.setAttribute('cx', String(pt.x));
          dot.setAttribute('cy', String(pt.y));
        });
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      delete svg.dataset.flowReady;
    };
  }, [svgRef, duration, gap]);
}
