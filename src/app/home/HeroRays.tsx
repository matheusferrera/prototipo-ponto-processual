'use client';

import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import styles from './HeroRays.module.css';

const LAYERS = 11;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Leque de faixas diagonais no canto do hero/CTA final — referência:
 * tennr.com. O campo publica três variáveis e todo o desenho reage a elas
 * no CSS:
 *
 * - `--p`   progresso 0→1 do scroll *dentro da própria seção* (não a posição
 *           absoluta da página): 0 quando o topo da seção encosta no topo da
 *           viewport, 1 quando o fim dela chega ao fim da tela. É isso que
 *           faz o efeito acompanhar a section inteira e recomeçar do zero no
 *           CTA final, em vez de já entrar em cena deslocado.
 * - `--mx`  / `--my` posição do mouse normalizada (-1..1) a partir do centro
 *           da viewport, suavizada por interpolação a cada frame.
 *
 * Cada faixa: entra deslizando de baixo (uma vez, via CSS animation) e depois
 * passa a seguir `--p` (deslocamento vertical + abertura do leque) e o mouse,
 * com amplitude proporcional ao índice da camada — as de trás andam menos que
 * as da frente, que é o que dá profundidade.
 *
 * Só roda enquanto a seção está visível (IntersectionObserver), nunca com
 * `prefers-reduced-motion`, e o mouse só entra em jogo em ponteiro fino.
 */
export function HeroRays() {
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const host = field.closest('section') ?? field;

    const layers = field.querySelectorAll<HTMLElement>('[data-ray]');
    const onEntranceEnd = (e: Event) => {
      (e.currentTarget as HTMLElement).classList.add(styles.settled);
    };
    layers.forEach(l => l.addEventListener('animationend', onEntranceEnd, { once: true }));

    let visible = false;
    let ticking = false;
    // Alvo do mouse e valor suavizado — a interpolação acontece no frame,
    // não no CSS: transition em transform brigaria com o update por scroll.
    let targetX = 0;
    let targetY = 0;
    let easedX = 0;
    let easedY = 0;

    const frame = () => {
      ticking = false;

      const rect = host.getBoundingClientRect();
      const vh = window.innerHeight;
      // Seção mais alta que a tela (hero): o progresso tem que cobrir todo o
      // tempo em que o fundo fica grudado — do topo da seção encostando no
      // topo da tela até o fim dela passar por ali. Dividir pelo excedente
      // (height - vh) fazia o progresso saturar em 1 cedo demais e a animação
      // travava pelo resto do hero.
      // Seção baixa (CTA final): progresso é a entrada em cena.
      const p =
        rect.height > vh + 40
          ? clamp01(-rect.top / rect.height)
          : clamp01((vh - rect.top) / (vh + rect.height));
      field.style.setProperty('--p', p.toFixed(4));

      easedX += (targetX - easedX) * 0.12;
      easedY += (targetY - easedY) * 0.12;
      field.style.setProperty('--mx', easedX.toFixed(4));
      field.style.setProperty('--my', easedY.toFixed(4));

      // Continua rodando enquanto o mouse ainda não alcançou o alvo.
      if (Math.abs(targetX - easedX) > 0.002 || Math.abs(targetY - easedY) > 0.002) schedule();
    };

    const schedule = () => {
      if (ticking || !visible) return;
      ticking = true;
      requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) schedule();
      },
      { threshold: 0 },
    );
    io.observe(host);

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const onMouseMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth) * 2 - 1;
      targetY = (e.clientY / window.innerHeight) * 2 - 1;
      schedule();
    };
    if (finePointer) window.addEventListener('mousemove', onMouseMove, { passive: true });

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (finePointer) window.removeEventListener('mousemove', onMouseMove);
      io.disconnect();
      layers.forEach(l => l.removeEventListener('animationend', onEntranceEnd));
    };
  }, []);

  return (
    <div className={styles.field} ref={fieldRef} aria-hidden="true">
      {Array.from({ length: LAYERS }).map((_, i) => (
        <span key={i} data-ray className={styles.ray} style={{ '--i': i } as CSSProperties} />
      ))}
      <span className={styles.sheen} />
    </div>
  );
}
