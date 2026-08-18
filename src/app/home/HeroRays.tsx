'use client';

import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import styles from './HeroRays.module.css';

const LAYERS = 9;

/**
 * Leque de faixas diagonais no canto do hero/CTA final — referência:
 * tennr.com. Cada faixa:
 * 1) entra deslizando de baixo pra cima, escalonada por índice (uma vez,
 *    via CSS animation);
 * 2) depois de assentar, passa a reagir ao scroll em velocidades diferentes
 *    por camada (paralaxe), trocando `animation` por `transition` — só
 *    enquanto o campo está visível na tela (IntersectionObserver) e nunca
 *    com `prefers-reduced-motion`.
 */
export function HeroRays() {
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const layers = field.querySelectorAll<HTMLElement>('[data-ray]');
    const onEntranceEnd = (e: Event) => {
      (e.currentTarget as HTMLElement).classList.add(styles.settled);
    };
    layers.forEach(l => l.addEventListener('animationend', onEntranceEnd, { once: true }));

    // Paralaxe é relativa ao scroll acumulado *desde que o campo apareceu*,
    // não à posição absoluta da página — senão o CTA final (que só entra em
    // cena com a página já rolada) recebe um deslocamento gigante de saída e
    // as faixas somem do quadro em vez de se moverem visivelmente.
    let visible = false;
    let origin: number | null = null;
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && origin === null) origin = window.scrollY;
      },
      { threshold: 0 },
    );
    io.observe(field);

    let ticking = false;
    const onScroll = () => {
      if (!visible || ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        field.style.setProperty('--scroll-y', String(window.scrollY - (origin ?? window.scrollY)));
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      io.disconnect();
      layers.forEach(l => l.removeEventListener('animationend', onEntranceEnd));
    };
  }, []);

  return (
    <div className={styles.field} ref={fieldRef} aria-hidden="true">
      {Array.from({ length: LAYERS }).map((_, i) => (
        <span key={i} data-ray className={styles.ray} style={{ '--i': i } as CSSProperties} />
      ))}
    </div>
  );
}
