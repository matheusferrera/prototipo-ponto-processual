'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/* useLayoutEffect avisa no SSR; no cliente ele é o que evita o piscar do
   número final antes da contagem começar (roda antes da pintura). */
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** easeOutExpo — sobe rápido e assenta devagar; é o que dá a sensação de "contagem". */
const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - 2 ** (-10 * t));

interface ContadorProps {
  ate: number;
  /** ms da contagem inteira. */
  duracao?: number;
  /** ms de espera antes de começar — usado para encadear com o resto da entrada. */
  atraso?: number;
  className?: string;
}

/**
 * Número que conta de 0 até `ate`.
 *
 * O estado inicial já é o valor final: assim o HTML do servidor, o cliente sem
 * JS e quem pediu `prefers-reduced-motion` veem o número certo — a contagem é
 * enfeite por cima, nunca a única forma de ler o dado.
 */
export function Contador({ ate, duracao = 1600, atraso = 0, className }: ContadorProps) {
  const [valor, setValor] = useState(ate);
  const frameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useIsoLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (ate <= 0) return;

    setValor(0);

    const rodar = () => {
      const inicio = performance.now();
      const passo = (agora: number) => {
        const t = Math.min(1, (agora - inicio) / duracao);
        setValor(Math.round(easeOutExpo(t) * ate));
        if (t < 1) frameRef.current = requestAnimationFrame(passo);
      };
      frameRef.current = requestAnimationFrame(passo);
    };

    if (atraso > 0) timerRef.current = setTimeout(rodar, atraso);
    else rodar();

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [ate, duracao, atraso]);

  /* aria-hidden nos dígitos em movimento + o valor final no aria-label: o
     leitor de tela anuncia "87", não a contagem inteira dígito a dígito. */
  return (
    <span className={className} aria-label={String(ate)}>
      <span aria-hidden="true">{valor}</span>
    </span>
  );
}
