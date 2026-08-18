'use client';

import { useEffect } from 'react';

/**
 * Efeitos de scroll leves, sem sequestrar a roda do mouse:
 * 1) Reveal (fade + subir) em elementos `[data-reveal]` ao entrarem na
 *    viewport — via IntersectionObserver, uma vez só por elemento.
 * 2) Header muda de tema (claro/escuro) conforme a seção `[data-nav-theme]`
 *    que está sob ele.
 *
 * Não renderiza nada — só liga observers depois da hidratação. Sem JS (ou
 * antes da hidratação), tudo já está visível: a classe que esconde os
 * elementos só é aplicada em `<body>` por este componente, então crawlers e
 * navegadores sem JS sempre veem o conteúdo completo.
 */
export function ScrollFx() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) return; // mantém tudo visível, sem animar

    document.body.classList.add('reveal-armed');

    const revealEls = document.querySelectorAll<HTMLElement>('[data-reveal]');
    const revealIo = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealIo.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    revealEls.forEach(el => revealIo.observe(el));

    const header = document.querySelector<HTMLElement>('[data-nav]');
    const themeEls = document.querySelectorAll<HTMLElement>('[data-nav-theme]');
    let navIo: IntersectionObserver | undefined;
    if (header && themeEls.length) {
      navIo = new IntersectionObserver(
        entries => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              header.dataset.theme = entry.target.getAttribute('data-nav-theme') ?? 'light';
            }
          }
        },
        { rootMargin: '-72px 0px -85% 0px', threshold: 0 },
      );
      themeEls.forEach(el => navIo!.observe(el));
    }

    return () => {
      revealIo.disconnect();
      navIo?.disconnect();
    };
  }, []);

  return null;
}
