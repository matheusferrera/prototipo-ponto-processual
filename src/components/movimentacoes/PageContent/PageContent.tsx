import type { ReactNode } from 'react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn, buildQuery } from '@/lib/utils';
import { MovimentacaoRow } from '@/components/movimentacoes/MovimentacaoRow/MovimentacaoRow';
import { AtosDeTramite } from '@/components/movimentacoes/AtosDeTramite/AtosDeTramite';
import { agruparTramite } from '@/lib/fio-do-prazo';
import type { Movimentacao } from '@/types';
import { DateGroupHeader } from '@/components/ui/DateGroupHeader/DateGroupHeader';
import styles from './PageContent.module.css';

interface PageContentProps {
  movimentacoes: {
    date: string;
    day: string;
    items: Movimentacao[];
  }[];
  pageInfo?: ReactNode;
  total: number;
  totalPages: number;
  currentPage: number;
  /** Quantas linhas o backend serve por página — a conta do "1–50 de 6.478". */
  porPagina: number;
  /** params de filtro/busca a preservar nos links de paginação */
  listParams?: Record<string, string | undefined>;
}

export function PageContent({
  movimentacoes, pageInfo, total, totalPages, currentPage, porPagina, listParams = {},
}: PageContentProps) {
  const itemsOnPage = movimentacoes.flatMap(g => g.items).length;
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * porPagina + 1;
  const rangeEnd = (currentPage - 1) * porPagina + itemsOnPage;
  const pageHref = (p: number) => buildQuery(listParams, { page: String(p) });
  const hasFilters = ['q', 'tribunal', 'tipo', 'categoria', 'sort'].some(key => Boolean(listParams[key]));
  const isEmpty = total === 0;

  /* Uma linha do feed — a mesma dentro e fora do bloco de trâmite, senão o
     colapso passaria a ser um segundo renderizador do mesmo ato.

     **O destino é o ATO, e é um link simples.** Até 15/09/2026 era
     `?aberta=<id>`, que expandia um painel dentro da lista; hoje a navegação é
     interceptada por `@card/(.)[id]` e o ato abre num card POR CIMA, com a
     lista parada atrás. Nada aqui precisa saber disso — a linha só aponta para
     o endereço do ato, e ele funciona dos dois jeitos: card quando se chega da
     lista, página inteira quando se abre direto. Ver `CardDoAto`. */
  const renderLinha = (m: Movimentacao) => (
    <MovimentacaoRow m={m} href={`/movimentacoes/${m.id}`} />
  );

  return (
    <>
      <div className={styles.scrollArea}>
        {pageInfo}

        <div className={styles.content}>
          {isEmpty ? (
            <EmptyState hasFilters={hasFilters} />
          ) : (
            movimentacoes.map(g => (
              <section key={`${g.date}-${g.day}`} className={styles.dateGroup} aria-label={`${g.date} — ${g.day}`}>
                {/* O cabeçalho de dia GRUDA no topo da lista.
                    Ele é a única estrutura do feed e estava desenhado com a
                    tipografia mais fraca da página (11px em `--ink-3`, que
                    mede 4,32:1 e reprova o AA). Grudando, o dia em que o olho
                    está fica sempre nomeado — que é o que substitui a moldura
                    de cada linha como orientação. */}
                <DateGroupHeader
                  date={g.date}
                  day={g.day}
                  count={`${g.items.length} ${g.items.length === 1 ? 'movimentação' : 'movimentações'}`}
                />

                {/* ── O CARTÓRIO COLAPSA ────────────────────────────────
                    Corridas consecutivas de trâmite e publicação viram uma
                    linha de 44px com "mostrar" ao lado. São 63% do feed,
                    medido — e cada uma ocupava a altura de uma sentença.

                    O que está DENTRO de um prazo aberto nunca entra no bloco:
                    "Decorrido prazo do réu" é trâmite pela categoria e é, com
                    o relógio correndo, a linha mais importante do dia. Ver
                    `colapsavelNaLista`. */}
                <ol className={styles.list}>
                  {agruparTramite(g.items).map((bloco, i) => (
                    bloco.tipo === 'linha'
                      ? <li key={bloco.item.id}>{renderLinha(bloco.item)}</li>
                      : (
                        <li key={`tramite-${g.date}-${i}`}>
                          <AtosDeTramite itens={bloco.itens}>
                            {bloco.itens.map(m => <li key={m.id}>{renderLinha(m)}</li>)}
                          </AtosDeTramite>
                        </li>
                      )
                  ))}
                </ol>
              </section>
            ))
          )}
        </div>
      </div>

      {!isEmpty && (
      <div className={`px-page ${styles.pagination}`}>
        <span className={styles.paginationInfo}>{rangeStart}–{rangeEnd} de {total}</span>
        <div className={styles.spacer} />
        <Link
          href={pageHref(currentPage - 1)}
          aria-disabled={currentPage === 1}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'icon-sm' }),
            'border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--paper-2)]',
            currentPage === 1 && 'pointer-events-none opacity-40',
          )}
        >←</Link>
        <span className={styles.paginationPage}>{currentPage} / {totalPages}</span>
        <Link
          href={pageHref(currentPage + 1)}
          aria-disabled={currentPage === totalPages}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'icon-sm' }),
            'border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--paper-2)]',
            currentPage === totalPages && 'pointer-events-none opacity-40',
          )}
        >→</Link>
      </div>
      )}
    </>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyMark} aria-hidden="true" />
      {hasFilters ? (
        <>
          <p className={styles.emptyTitle}>Nenhuma movimentação encontrada</p>
          <p className={styles.emptyText}>Nenhuma movimentação corresponde aos filtros ou à busca atual.</p>
          <Link
            href="/movimentacoes"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-2)]')}
          >
            Limpar filtros
          </Link>
        </>
      ) : (
        <>
          <p className={styles.emptyTitle}>Nenhuma movimentação ainda</p>
          <p className={styles.emptyText}>
            Assim que a plataforma identificar uma movimentação nova em algum dos seus processos, ela aparece aqui.
          </p>
        </>
      )}
    </div>
  );
}
