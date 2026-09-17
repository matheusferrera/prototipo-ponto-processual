'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/** A partir daqui a aba Novas mostra o ato ao lado da lista. */
export const LARGURA_DO_PAINEL = '(min-width: 1200px)';

/**
 * O LINK DE UM ATO — o card no celular, o painel ao lado no desktop largo.
 *
 * O `href` é sempre o endereço do ato (`/movimentacoes/<id>`), que a fenda
 * `@card` intercepta e abre por cima da lista. É o que vale sem JavaScript, no
 * clique do meio, no "abrir em nova aba" e em qualquer tela estreita.
 *
 * **No desktop largo, com `hrefPainel`, o clique troca o painel** em vez de
 * abrir o card: a lista e o ato cabem lado a lado, e cobrir a lista com um
 * card para ler um ato de cada vez desperdiçaria a largura que a tela tem. A
 * troca é `replace`, não `push` — navegar entre cinco novidades não pode
 * encher o histórico de cinco entradas que o voltar teria de desfazer.
 */
export function LinkDoAto({
  id,
  hrefPainel,
  className,
  selecionado,
  children,
  ...resto
}: {
  id: string;
  hrefPainel?: string;
  className?: string;
  selecionado?: boolean;
  children: ReactNode;
  'aria-label'?: string;
}) {
  const router = useRouter();

  return (
    <Link
      {...resto}
      href={`/movimentacoes/${encodeURIComponent(id)}`}
      className={className}
      aria-current={selecionado ? 'true' : undefined}
      onClick={evento => {
        if (!hrefPainel) return;
        if (evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
        if (!window.matchMedia(LARGURA_DO_PAINEL).matches) return;
        evento.preventDefault();
        router.replace(hrefPainel, { scroll: false });
      }}
    >
      {children}
    </Link>
  );
}
