'use client';

import { useEffect, type RefObject } from 'react';

type FlowOptions = {
  /** ms de um ciclo completo (só vale em `drive: 'time'`) */
  duration?: number;
  /** distância entre os pontos do rastro, em fração do trajeto */
  gap?: number;
  /**
   * `'time'` — o rastro roda no relógio dele, para sempre (o hero).
   * `'scroll'` — o ciclo **é** a posição do desenho na tela: parado, nada se
   * mexe; descendo, o desenho trabalha; subindo, ele desfaz.
   */
  drive?: 'time' | 'scroll';
};

/** amostras usadas para achar onde um marco cai no trajeto */
const SAMPLES = 240;
/**
 * A janela do scrub é medida pelo **centro** do desenho, não pelo topo: com o
 * topo, o ciclo começava com a ilustração inteira ainda abaixo da dobra e
 * boa parte do trabalho acontecia fora da tela — quando o ícone aparecia, já
 * estava tudo resolvido.
 *
 * `u = 0` com o centro a 90% da altura da janela (o desenho acabou de
 * aparecer) e `u = 1` a 40% (a faixa onde o olho está de fato). O ciclo
 * inteiro roda com a ilustração visível.
 */
const ENTER = 0.9;
const SETTLE = 0.4;

/**
 * Motor dos rastros de pontos que percorrem trajetos SVG (mecânica do
 * diagrama do hero, ver TribunalFlow.tsx). Move os pontos com
 * `getPointAtLength`, o que dá movimento contínuo e independente de layout —
 * nada de `stroke-dasharray` por keyframe, que engasga em curva.
 *
 * Marcação esperada dentro do `<svg>`:
 *   <path data-flow-path="a" ... />
 *   <g data-flow-trail="a"><circle/><circle/>…</g>
 *
 * **Janela de atividade.** Cada rastro percorre o trajeto só entre
 * `data-flow-from` e `data-flow-to` (frações do ciclo, padrão 0→1). Antes do
 * `from` ele espera na origem, depois do `to` descansa no destino — é o que
 * dá o compasso de chegada em vez de um loop que nunca resolve, e o que
 * permite encadear dois rastros ("o alerta chega, aí o telefone toca").
 * O grupo recebe `data-flow-state` = `idle | run | done` para o CSS sumir
 * com os pontos fora da janela.
 *
 * **Marcos.** Qualquer elemento com `data-flow-at="<chave do rastro>"` acende
 * (`data-flow-hit="true"`) quando o ponto-líder passa por cima dele, e apaga
 * quando o ciclo volta. A posição no trajeto é medida aqui, procurando o
 * ponto mais próximo do centro do elemento — não há fração escrita na mão,
 * então mexer no desenho não desalinha o marco.
 *
 * Em `drive: 'scroll'` não há `requestAnimationFrame` em aberto: um listener
 * passivo agenda um frame por rolagem e sai. Sem rolagem, zero trabalho.
 * `prefers-reduced-motion` pinta direto o quadro final, com tudo resolvido.
 */
export function useFlowTrails(
  svgRef: RefObject<SVGSVGElement | null>,
  { duration = 2400, gap = 0.02, drive = 'time' }: FlowOptions = {},
) {
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const groups = [...svg.querySelectorAll<SVGGElement>('[data-flow-trail]')];
    const trails = groups
      .map((group, i) => {
        const key = group.dataset.flowTrail ?? '';
        const path = svg.querySelector<SVGPathElement>(`[data-flow-path="${key}"]`);
        const phase = group.dataset.flowPhase;
        const to = Number(group.dataset.flowTo ?? 1);
        return {
          key,
          group,
          path,
          len: path?.getTotalLength() ?? 0,
          dots: [...group.querySelectorAll<SVGCircleElement>('circle')],
          duration: Number(group.dataset.flowDuration) || duration,
          gap: Number(group.dataset.flowGap) || gap,
          phase: phase !== undefined ? Number(phase) : i / groups.length,
          from: Number(group.dataset.flowFrom ?? 0),
          span: Math.max(to - Number(group.dataset.flowFrom ?? 0), 0.001),
          head: 0,
        };
      })
      .filter(t => t.path && t.len > 0);

    if (!trails.length) return;

    const marks = [...svg.querySelectorAll<SVGGraphicsElement>('[data-flow-at]')]
      .map(el => {
        const trail = trails.find(t => t.key === el.dataset.flowAt);
        if (!trail) return null;
        const box = el.getBBox();
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        let at = 0;
        let best = Infinity;
        for (let i = 0; i <= SAMPLES; i++) {
          const p = trail.path!.getPointAtLength((i / SAMPLES) * trail.len);
          const dist = (p.x - cx) ** 2 + (p.y - cy) ** 2;
          if (dist < best) {
            best = dist;
            at = i / SAMPLES;
          }
        }
        return { el, trail, at };
      })
      .filter(m => m !== null);

    /** progresso do ponto dentro da janela do rastro, saturado nas pontas */
    const within = (u: number, t: (typeof trails)[number]) =>
      Math.min(Math.max((u - t.from) / t.span, 0), 1);

    /**
     * Pinta um ciclo. Em `scroll`, `u` é a posição na tela e vale igual para
     * todos os rastros do desenho. Em `time`, `u` é o tempo em ms e cada
     * rastro converte no ritmo e na fase dele.
     */
    const render = (u: number) => {
      svg.dataset.flowReady = 'true';
      for (const t of trails) {
        const local = drive === 'time' ? (((u / t.duration + t.phase) % 1) + 1) % 1 : u;
        t.head = within(local, t);
        t.dots.forEach((_, j) => {
          const pt = t.path!.getPointAtLength(within(local - j * t.gap, t) * t.len);
          t.dots[j].setAttribute('cx', String(pt.x));
          t.dots[j].setAttribute('cy', String(pt.y));
        });
        const state = local < t.from ? 'idle' : t.head < 1 ? 'run' : 'done';
        if (t.group.dataset.flowState !== state) t.group.dataset.flowState = state;
      }
      for (const m of marks) {
        const hit = m.trail.head >= m.at ? 'true' : 'false';
        if (m.el.dataset.flowHit !== hit) m.el.dataset.flowHit = hit;
      }
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      render(1);
      return () => {
        delete svg.dataset.flowReady;
      };
    }

    /* ── o ciclo é a rolagem ─────────────────────────────────────────────── */
    if (drive === 'scroll') {
      let queued = false;
      let last = -1;
      const paint = () => {
        queued = false;
        const vh = window.innerHeight || 1;
        const box = svg.getBoundingClientRect();
        const center = box.top + box.height / 2;
        const u = Math.min(Math.max((vh * ENTER - center) / (vh * (ENTER - SETTLE)), 0), 1);
        if (u === last) return; // parado é parado: nem um write no DOM
        last = u;
        render(u);
      };
      const schedule = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(paint);
      };
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      schedule();
      return () => {
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        delete svg.dataset.flowReady;
      };
    }

    /* ── o ciclo é o relógio (hero) ──────────────────────────────────────── */
    let visible = true;
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0 });
    io.observe(svg);

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      render(now - start);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      delete svg.dataset.flowReady;
    };
  }, [svgRef, duration, gap, drive]);
}
