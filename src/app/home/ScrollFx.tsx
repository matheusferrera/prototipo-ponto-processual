'use client';

import { useEffect } from 'react';

/**
 * Efeitos de scroll leves, sem sequestrar a roda do mouse:
 * 1) Reveal (fade + subir) em elementos `[data-reveal]` quando o topo deles
 *    cruza a linha do meio da tela — via IntersectionObserver, uma vez só
 *    por elemento.
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
    let pending = revealEls.length;

    const reveal = (el: Element) => {
      el.classList.add('is-visible');
      midIo.unobserve(el);
      pending -= 1;
      if (pending === 0) window.removeEventListener('scroll', onTailScroll);
    };

    // Gatilho: o topo do elemento cruzando a linha do meio da tela. Encolher
    // a raiz em 50% pela base é o que move o gatilho do rodapé da viewport
    // para o centro dela — antes bastava o elemento espiar na borda de baixo
    // (12% dele visível) e a animação já tinha acabado quando ele chegava na
    // altura de leitura. Numa grade, a linha inteira cruza o meio junto, e é
    // isso que faz o --reveal-delay ler como cascata em vez de ruído.
    const midIo = new IntersectionObserver(
      entries => entries.forEach(e => e.isIntersecting && reveal(e.target)),
      { threshold: 0, rootMargin: '0px 0px -50% 0px' },
    );
    revealEls.forEach(el => midIo.observe(el));

    // Rede de segurança para o pé da página: quem está na última meia-tela do
    // documento nunca alcança a linha do meio — a página acaba antes — e
    // ficaria escondido para sempre (o CTA final numa tela alta, tipo tablet
    // em pé). Encostou no fim do scroll, o que sobrou entra: a essa altura
    // esses elementos já estão em quadro, parados na posição final deles.
    // Não serve de gatilho concorrente porque só dispara no fim do curso.
    const onTailScroll = () => {
      const d = document.documentElement;
      if (window.scrollY + window.innerHeight < d.scrollHeight - 2) return;
      revealEls.forEach(el => {
        if (!el.classList.contains('is-visible')) reveal(el);
      });
    };
    window.addEventListener('scroll', onTailScroll, { passive: true });

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
      midIo.disconnect();
      window.removeEventListener('scroll', onTailScroll);
      navIo?.disconnect();
    };
  }, []);

  return null;
}
