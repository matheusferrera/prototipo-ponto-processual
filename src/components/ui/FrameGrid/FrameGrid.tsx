'use client';

import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import styles from './FrameGrid.module.css';

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Hash determinístico 0..1 (finalizador do murmur3). Precisa ser
 * determinístico — o mesmo valor no servidor e no cliente, senão o React
 * reclama de hidratação —, mas também precisa *descorrelacionar vizinhos*:
 * um multiplicativo simples (`i * K % N`) avança sempre no mesmo passo entre
 * índices consecutivos, então as fases das células formavam uma progressão
 * aritmética e o padrão de acesas marchava fileira a fileira em vez de
 * pipocar espalhado. O hash abaixo espalha de verdade.
 */
const hash01 = (n: number) => {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

export interface FrameGridProps {
  /**
   * `scroll` (padrão): o desenho é empurrado pelo progresso de scroll da
   * seção que o contém — é o que dá o percurso do hero e do CTA final.
   * `idle`: sem scroll (painel de login/cadastro), o padrão de células acesas
   * respira sozinho por animação CSS e só o mouse desloca a malha.
   */
  variant?: 'scroll' | 'idle';
  /** Colunas/linhas da malha. O padrão sangra fora do quadro em qualquer
   *  viewport de desktop — é a máscara que recorta, não a contagem. */
  cols?: number;
  rows?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Malha de quadros vazios no canto do hero/CTA/painel de marca — o
 * vocabulário vem do `AuthShell` (quadrado sem preenchimento, fio de 1px e
 * anel grosso em branco translúcido), a mecânica vem do leque que ela
 * substitui. O campo publica quatro variáveis e todo o desenho reage a elas
 * no CSS:
 *
 * - `--fg-p`   progresso 0→1 do scroll *dentro da própria seção* (não a
 *              posição absoluta da página): 0 quando o topo da seção encosta
 *              no topo da viewport, 1 quando o fim dela chega ao fim da tela.
 *              É isso que faz o efeito acompanhar a section inteira e
 *              recomeçar do zero no CTA final. Só desloca.
 * - `--fg-t`   fase do padrão de células acesas. Na variante `scroll` anda
 *              junto com `--fg-p`; na `idle` é uma animação CSS lenta. Está
 *              separado de `--fg-p` justamente para que o painel de login
 *              possa respirar sem que a malha saia andando de lado.
 * - `--fg-mx` / `--fg-my` posição do mouse normalizada (-1..1) a partir do
 *              centro da viewport, suavizada por interpolação a cada frame.
 *
 * Cada célula: entra em varredura diagonal (uma vez, via CSS animation) e
 * depois segue as variáveis — a malha se abre a partir do centro e as células
 * mais ao fundo derivam menos que as da frente, que é o que dá profundidade.
 *
 * Só roda enquanto a seção está visível (IntersectionObserver), nunca com
 * `prefers-reduced-motion`, e o mouse só entra em jogo em ponteiro fino.
 */
export function FrameGrid({
  variant = 'scroll',
  cols = 10,
  rows = 9,
  className,
  style,
}: FrameGridProps) {
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const host = field.closest('section') ?? field.parentElement ?? field;
    const trackScroll = variant === 'scroll';

    let visible = false;
    let ticking = false;
    // Alvo do mouse e valor suavizado — a interpolação acontece no frame, não
    // no CSS: uma transition em transform brigaria com o update por scroll.
    let targetX = 0;
    let targetY = 0;
    let easedX = 0;
    let easedY = 0;

    const frame = () => {
      ticking = false;

      if (trackScroll) {
        const rect = host.getBoundingClientRect();
        const vh = window.innerHeight;
        // Seção mais alta que a tela (hero): o progresso tem que cobrir todo o
        // tempo em que o fundo fica grudado — do topo da seção encostando no
        // topo da tela até o fim dela passar por ali. Dividir pelo excedente
        // (height - vh) fazia o progresso saturar em 1 cedo demais.
        // Seção baixa (CTA final): o progresso é a entrada em cena.
        const p =
          rect.height > vh + 40
            ? clamp01(-rect.top / rect.height)
            : clamp01((vh - rect.top) / (vh + rect.height));
        field.style.setProperty('--fg-p', p.toFixed(4));
        field.style.setProperty('--fg-t', p.toFixed(4));
      }

      easedX += (targetX - easedX) * 0.12;
      easedY += (targetY - easedY) * 0.12;
      field.style.setProperty('--fg-mx', easedX.toFixed(4));
      field.style.setProperty('--fg-my', easedY.toFixed(4));

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

    if (trackScroll) {
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
    }

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const onMouseMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth) * 2 - 1;
      targetY = (e.clientY / window.innerHeight) * 2 - 1;
      schedule();
    };
    if (finePointer) window.addEventListener('mousemove', onMouseMove, { passive: true });

    return () => {
      if (trackScroll) {
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
      }
      if (finePointer) window.removeEventListener('mousemove', onMouseMove);
      io.disconnect();
    };
  }, [variant]);

  // Centro da malha: é a partir dele que as células se afastam com o scroll.
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const span = Math.max(1, cols - 1 + (rows - 1));

  return (
    <div
      ref={fieldRef}
      aria-hidden="true"
      className={[styles.field, variant === 'idle' && styles.idle, className]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      <div
        className={styles.grid}
        style={{ gridTemplateColumns: `repeat(${cols}, var(--fg-cell))` }}
      >
        {Array.from({ length: cols * rows }).map((_, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          return (
            <span
              key={i}
              className={styles.cell}
              style={
                {
                  '--col': col,
                  '--row': row,
                  '--cx': cx,
                  '--cy': cy,
                  // Profundidade: cresce para o canto oposto, então a deriva
                  // de mouse tem direção coerente em vez de ruído.
                  '--depth': ((col + row) / span).toFixed(3),
                  // Duas fases e um jitter de frequência por célula. Duas
                  // ondas somadas em vez de uma: com uma só, todas as células
                  // piscam no mesmo compasso e o olho acha o ritmo. Somando
                  // duas de períodos incomensuráveis, cada célula acende e
                  // apaga na sua hora e o padrão nunca se repete dentro do
                  // percurso da seção.
                  '--ph1': hash01(i * 3 + 1).toFixed(4),
                  '--ph2': hash01(i * 3 + 2).toFixed(4),
                  '--rjit': hash01(i * 3 + 3).toFixed(4),
                } as CSSProperties
              }
            >
              <span className={styles.frame} />
            </span>
          );
        })}
      </div>
    </div>
  );
}
