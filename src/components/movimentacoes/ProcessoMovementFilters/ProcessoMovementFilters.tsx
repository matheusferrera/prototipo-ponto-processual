'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownWideNarrow, Check, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import type { CategoriaMovimentacao } from '@/types';
import styles from './ProcessoMovementFilters.module.css';

const CATEGORIES: { value: CategoriaMovimentacao; label: string; detail: string }[] = [
  { value: 'decisorio', label: 'Decisões judiciais', detail: 'Sentenças, decisões e despachos' },
  { value: 'publicacao', label: 'Publicações e comunicações', detail: 'Diário, intimações e citações' },
  { value: 'atoDeParte', label: 'Petições e recursos', detail: 'Manifestações e documentos das partes' },
  { value: 'prazo', label: 'Eventos de prazo', detail: 'Início, suspensão e decurso de prazo' },
  { value: 'tramite', label: 'Rotinas do processo', detail: 'Conclusão, remessa, certidões e arquivamento' },
];

interface Filters {
  q?: string;
  from?: string;
  to?: string;
  sort: 'asc' | 'desc';
  categorias: CategoriaMovimentacao[];
}

export function ProcessoMovementFilters({ basePath, filters, total }: {
  basePath: string;
  filters: Filters;
  total: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const count = filters.categorias.length + Number(!!filters.q) + Number(!!(filters.from || filters.to)) + Number(filters.sort === 'asc');

  function navigate(next: Filters) {
    const params = new URLSearchParams({ cat: next.categorias.join(',') || 'todas' });
    if (next.q?.trim()) params.set('q', next.q.trim());
    if (next.from) params.set('from', next.from);
    if (next.to) params.set('to', next.to);
    if (next.sort === 'asc') params.set('sort', 'asc');
    startTransition(() => router.replace(`${basePath}?${params}`, { scroll: false }));
  }

  useEffect(() => () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
  }, []);

  function update(next: Filters, debounce = false) {
    setDraft(next);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = null;
    if (next.from && next.to && next.from > next.to) {
      setError('A data final deve ser igual ou posterior à data inicial.');
      return;
    }
    setError('');
    if (debounce) {
      searchTimer.current = setTimeout(() => {
        searchTimer.current = null;
        navigate(next);
      }, 350);
    } else navigate(next);
  }

  function close() { setOpen(false); trigger.current?.focus(); }

  const chips = [
    ...(filters.q ? [{ id: 'q', label: `Busca: ${filters.q}`, next: { ...filters, q: '' } }] : []),
    ...(filters.from || filters.to ? [{ id: 'periodo', label: `${filters.from?.split('-').reverse().join('/') || 'Início'} até ${filters.to?.split('-').reverse().join('/') || 'hoje'}`, next: { ...filters, from: '', to: '' } }] : []),
    ...filters.categorias.map(value => ({ id: value, label: CATEGORIES.find(c => c.value === value)!.label, next: { ...filters, categorias: filters.categorias.filter(c => c !== value) } })),
    ...(filters.sort === 'asc' ? [{ id: 'sort', label: 'Mais antigas primeiro', next: { ...filters, sort: 'desc' as const } }] : []),
  ];

  return (
    <div className={styles.root} aria-busy={pending}>
      <div className={styles.toolbar}>
        <div className={styles.result} role="status" aria-live="polite">
          <strong>{pending ? 'Atualizando…' : `${total} movimentações`}</strong>
          <span>{count ? 'com os filtros selecionados' : 'Histórico completo · todas as categorias'}</span>
        </div>
        <button ref={trigger} type="button" className={styles.trigger} aria-expanded={open} aria-controls="processo-movement-filters" onClick={() => {
          if (open) close();
          else { setOpen(true); }
        }}>
          <SlidersHorizontal size={16} aria-hidden="true" /> Filtros
          {count > 0 && <span className={styles.count}>{count}</span>}
          <ChevronDown size={14} aria-hidden="true" className={open ? styles.rotated : ''} />
        </button>
      </div>

      {chips.length > 0 && <div className={styles.chips} aria-label="Filtros ativos">
        {chips.map(chip => <button key={chip.id} type="button" disabled={pending} onClick={() => update(chip.next)} aria-label={`Remover filtro ${chip.label}`}>{chip.label}<X size={12} aria-hidden="true" /></button>)}
        <button type="button" disabled={pending} className={styles.clear} onClick={() => update({ sort: 'desc', categorias: [] })}>Limpar filtros</button>
      </div>}

      {open && <form id="processo-movement-filters" className={styles.panel} onSubmit={event => { event.preventDefault(); update(draft); }} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); close(); } }}>
        <div className={styles.heading}><div><h3>Filtrar movimentações</h3><p>Os filtros são aplicados automaticamente.</p></div><button type="button" className={styles.close} onClick={close} aria-label="Fechar filtros"><X size={18} /></button></div>
        <label className={styles.field}>Buscar na descrição<div className={styles.search}><Search size={16} aria-hidden="true" /><input type="search" value={draft.q ?? ''} onChange={e => update({ ...draft, q: e.target.value }, true)} placeholder="Ex.: publicado, sentença, juntada" /></div></label>
        <div className={styles.fields}>
          <label className={styles.field}>Data inicial<input type="date" value={draft.from ?? ''} onChange={e => update({ ...draft, from: e.target.value })} /></label>
          <label className={styles.field}>Data final<input type="date" value={draft.to ?? ''} onChange={e => update({ ...draft, to: e.target.value })} /></label>
          <label className={styles.field}><span><ArrowDownWideNarrow size={14} aria-hidden="true" /> Ordenar por</span><select value={draft.sort} onChange={e => update({ ...draft, sort: e.target.value as Filters['sort'] })}><option value="desc">Mais recentes</option><option value="asc">Mais antigas</option></select></label>
        </div>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <fieldset className={styles.categories}>
          <legend>Categorias <span>Selecione uma ou mais</span></legend>
          <div className={styles.categoryGrid}>
            <button type="button" className={styles.category} aria-pressed={draft.categorias.length === 0} onClick={() => update({ ...draft, categorias: [] })}><span className={styles.check}>{draft.categorias.length === 0 && <Check size={13} />}</span><span><strong>Todas as movimentações</strong><small>Inclui todas as categorias e rotinas</small></span></button>
            {CATEGORIES.map(item => <label key={item.value} className={styles.category} data-selected={draft.categorias.includes(item.value) || undefined}>
              <input type="checkbox" checked={draft.categorias.includes(item.value)} onChange={e => update({ ...draft, categorias: e.target.checked ? [...draft.categorias, item.value] : draft.categorias.filter(c => c !== item.value) })} />
              <span><strong>{item.label}</strong><small>{item.detail}</small></span>
            </label>)}
          </div>
        </fieldset>
        <div className={styles.footer}><button type="button" className={styles.reset} disabled={pending} onClick={() => update({ sort: 'desc', categorias: [] })}>Ver todas as movimentações</button><button type="button" className={styles.cancel} onClick={close}>Fechar filtros</button></div>
      </form>}
    </div>
  );
}
