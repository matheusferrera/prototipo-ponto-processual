'use client';

import { useEffect } from 'react';

/**
 * Revelação por scroll dos "atos" da página.
 *
 * Mesma mecânica do `ScrollFx` da landing, mas com atributo próprio
 * (`data-ato`) para não depender do CSS global daquele módulo.
 *
 * A classe que ESCONDE é aplicada por este componente (`.armado` no `<main>`),
 * nunca pelo CSS estático: sem JS, antes da hidratação, ou com
 * `prefers-reduced-motion`, todo o conteúdo já está visível.
 */
export function Revelar({ alvo }: { alvo: string }) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const raiz = document.querySelector<HTMLElement>(`[data-palco="${alvo}"]`);
    if (!raiz) return;

    raiz.dataset.armado = '';

    const io = new IntersectionObserver(
      entradas => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.visivel = '';
          io.unobserve(e.target);
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );

    const atos = raiz.querySelectorAll<HTMLElement>('[data-ato]');
    atos.forEach(el => io.observe(el));

    return () => io.disconnect();
  }, [alvo]);

  return null;
}
