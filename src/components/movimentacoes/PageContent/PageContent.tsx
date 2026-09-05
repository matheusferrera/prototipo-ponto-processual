import type { ReactNode } from 'react';
import Link from 'next/link';
import { Seal } from '@/components/ui/Seal/Seal';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { buttonVariants } from '@/components/ui/button';
import { cn, buildQuery } from '@/lib/utils';
import {
  clienteMovimentacao, assuntoSecundario, descricaoMovimentacao,
  resumoMovimentacao, temLeituraIa, acaoMovimentacao, seloOrigem,
  vencimentoDoAto, pedeConferencia,
} from '@/lib/movimentacao';
import type { Movimentacao } from '@/types';
import { categoriaCurta } from '@/lib/categoria-movimentacao';
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
  /** params de filtro/busca a preservar nos links de paginação */
  listParams?: Record<string, string | undefined>;
}

export function PageContent({ movimentacoes, pageInfo, total, totalPages, currentPage, listParams = {} }: PageContentProps) {
  const itemsOnPage = movimentacoes.flatMap(g => g.items).length;
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * 20 + 1;
  const rangeEnd = (currentPage - 1) * 20 + itemsOnPage;
  const pageHref = (p: number) => buildQuery(listParams, { page: String(p) });
  const hasFilters = ['q', 'tribunal', 'tipo', 'sort'].some(key => Boolean(listParams[key]));
  const isEmpty = total === 0;

  return (
    <>
      <div className={styles.scrollArea}>
        {pageInfo}

        <div className={`px-page ${styles.content}`}>
          {isEmpty ? (
            <EmptyState hasFilters={hasFilters} />
          ) : (
            movimentacoes.map((g, gi) => (
              <div key={gi} className={styles.dateGroup}>
                <div className={styles.dateHeader}>
                  <span className={`${styles.dateLabel}${gi === 0 ? ` ${styles.dateLabelFirst}` : ''}`}>
                    § {g.date} — {g.day}
                  </span>
                  <div className={styles.dateDivider} />
                  <span className={styles.dateCount}>
                    {g.items.length} {g.items.length === 1 ? 'movimentação' : 'movimentações'}
                  </span>
                </div>
                {g.items.map(m => <MovItem key={m.id} m={m} />)}
              </div>
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

function MovItem({ m }: { m: Movimentacao }) {
  const itemStateClass =
    m.state === 'signal' ? styles.itemSignal :
    m.state === 'alert'  ? styles.itemAlert  :
    styles.itemQuiet;

  const cliente = clienteMovimentacao(m);
  const assunto = assuntoSecundario(m, cliente);
  const resumo = resumoMovimentacao(m);
  const comIa = temLeituraIa(m);
  const acao = acaoMovimentacao(m);
  const selo = seloOrigem(m);
  // A que serve o ato. Fica ao lado do tipo porque responde a mesma pergunta
  // num nível acima: `tipo` é inferido do texto ("Juntada"), `categoria` vem
  // classificada do banco e é o que a lista filtra.
  const categoria = categoriaCurta(m.categoria);
  const vencimento = vencimentoDoAto(m);
  const conferir = pedeConferencia(m);
  // O rótulo do ato ("Despacho — 8ª Turma Cível") só vira linha própria quando
  // NÃO é ele que está no corpo: com a leitura da IA no lugar dele, repeti-lo
  // logo abaixo seria dizer duas vezes a mesma coisa.
  const rotulo = comIa ? descricaoMovimentacao(m) : null;

  return (
    <Link href={`/movimentacoes/${m.id}`} className={`${styles.item} ${itemStateClass}`}>
      {/* A coluna do PRAZO. Só existe quando o ato abre um — que é a minoria —,
          e some inteira quando não, em vez de desenhar um travessão. Ver
          `.prazoCol` no CSS para o histórico. */}
      {!vencimento ? (
        <div className={`${styles.prazoCol} ${styles.prazoVazio}`} aria-hidden="true" />
      ) : (
        <div className={styles.prazoCol}>
          <span className={styles.prazoLabel}>
            {vencimento.emDias < 0 ? 'venceu' : 'vence'}
          </span>
          <span
            className={`${styles.prazoData} ${
              vencimento.emDias < 0 ? styles.prazoVencido :
              vencimento.urgente    ? styles.prazoUrgente : ''
            }`}
          >
            {/* "≈" quando a data é cálculo nosso, não o vencimento publicado
                pelo tribunal. Fica COLADO na data, dentro do mesmo bloco: solto
                numa linha própria ele viraria um símbolo sem referente. A
                ressalva cabe num caractere; o detalhe explica por extenso. */}
            {vencimento.estimado && (
              <span className={styles.prazoEstimado} title="data estimada — ver o detalhe">≈ </span>
            )}
            {vencimento.curto}
          </span>
          {vencimento.dias && <span className={styles.prazoQuando}>{vencimento.dias}</span>}
        </div>
      )}

      <div className={styles.bodyCol}>
        <div className={styles.bodyHeader}>
          <TribTag label={m.tribunal} />
          <span className={`${styles.tipoLabel} ${m.state === 'signal' ? styles.tipoSignal : styles.tipoNormal}`}>
            {m.tipo}
          </span>
          {categoria && <span className={styles.categoriaLabel}>{categoria}</span>}
          {m.state === 'signal' && <Seal variant="nova" />}
          {m.state === 'alert'  && <Seal variant="erro" />}
          {/* Publicação no diário não é movimento do tribunal — sem este selo,
              ela e a linha do DataJud sobre o mesmo ato parecem duplicata. */}
          {selo && <Seal variant="outline" label={selo} />}
        </div>

        {/* Título — o cliente, o que o advogado procura ao varrer o feed */}
        <div className={styles.cliente}>{cliente}</div>
        {/* Corpo — o que aconteceu: a leitura da IA quando há, o rótulo quando não */}
        <div className={styles.detail}>{resumo}</div>
        {/* Só quando o corpo é a leitura da IA: aí o rótulo do ato ainda informa */}
        {rotulo && <div className={styles.rotuloAto}>{rotulo}</div>}
        {acao && (
          <div className={acao.minha ? styles.acaoMinha : styles.acao}>
            <span className={styles.acaoLabel}>
              {acao.minha ? 'você precisa' : 'providência de outra parte'}
            </span>
            {acao.texto}
            {/* A IA leu com confiança baixa (ato truncado, dispositivo ausente).
                Dizer isso é o oposto de esconder: o advogado decide prazo com
                este campo, e palpite apresentado como fato é o erro caro. */}
            {conferir && acao.minha && (
              <span className={styles.conferir}>confira o texto do ato</span>
            )}
          </div>
        )}
        {assunto && <div className={styles.assunto}>{assunto}</div>}

        <div className={styles.processMeta}>
          <span className={styles.cnj}>autos nº {m.cnj}</span>
          {m.orgaoJulgador !== '—' && (
            <>
              <span className={styles.metaSep} aria-hidden="true">·</span>
              <span className={styles.orgaoJulgador}>{m.orgaoJulgador}</span>
            </>
          )}
        </div>
      </div>

      <span className={styles.go} aria-hidden="true">→</span>
    </Link>
  );
}
