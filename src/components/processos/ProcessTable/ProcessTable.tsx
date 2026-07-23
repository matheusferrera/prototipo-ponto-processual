'use client';

import { type CSSProperties, type KeyboardEvent, type PointerEvent, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  type Column,
  type ColumnDef,
  type ColumnPinningState,
  type ColumnSizingState,
  flexRender,
  getCoreRowModel,
  type Header,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, BellRing, CircleAlert, CircleCheck, GripVertical } from 'lucide-react';
import type { Processo, ProcessoParte } from '@/types';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { buildQuery } from '@/lib/utils';
import {
  createDefaultProcessTablePreferences,
  PROCESS_COLUMN_IDS,
  PROCESS_COLUMN_LABELS,
  type ProcessColumnId,
} from '@/lib/process-table-preferences';
import { useProcessTablePreferences } from './ProcessTableProvider';
import styles from './ProcessTable.module.css';

interface ProcessTableProps {
  processos: Processo[];
  listParams?: Record<string, string | undefined>;
}

type SortKey = 'recent' | 'cnj' | 'tribunal' | 'valor' | 'autuado';
type SortOrder = 'asc' | 'desc';

const SORT_DEFAULTS: Record<SortKey, SortOrder> = {
  recent: 'desc',
  cnj: 'asc',
  tribunal: 'asc',
  valor: 'desc',
  autuado: 'desc',
};

const MIN_COLUMN_SIZE = 48;

const STATE_LABELS: Record<Processo['state'], string> = {
  signal: 'Com novidade',
  alert: 'Com erro',
  quiet: 'Monitorado',
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function displayDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

function displayPartes(partes: ProcessoParte[]): string {
  if (!partes.length) return '—';
  const names = partes.map(parte => parte.nome).filter(Boolean);
  if (names.length <= 2) return names.join('; ');
  return `${names.slice(0, 2).join('; ')} +${names.length - 2}`;
}

function displaySync(status: string | null): string {
  if (!status) return 'Pendente';
  const labels: Record<string, string> = {
    success: 'Sincronizado',
    synced: 'Sincronizado',
    error: 'Com erro',
    pending: 'Pendente',
    running: 'Sincronizando',
  };
  return labels[status.toLowerCase()] ?? status;
}

function SortHeader({
  label,
  sortKey,
  listParams,
}: {
  label: string;
  sortKey: SortKey;
  listParams: Record<string, string | undefined>;
}) {
  const activeSort = (listParams.sort || 'recent') as SortKey;
  const currentOrder = listParams.order === 'asc' ? 'asc' : listParams.order === 'desc'
    ? 'desc'
    : SORT_DEFAULTS[activeSort] ?? 'desc';
  const active = activeSort === sortKey;
  const nextOrder: SortOrder = active
    ? currentOrder === 'asc' ? 'desc' : 'asc'
    : SORT_DEFAULTS[sortKey];
  const href = `/processos${buildQuery(listParams, {
    sort: sortKey,
    order: nextOrder,
    page: '1',
  })}`;

  return (
    <Link
      href={href}
      className={styles.sortLink}
      aria-label={`Ordenar por ${label}, ${nextOrder === 'asc' ? 'crescente' : 'decrescente'}`}
    >
      <span>{label}</span>
      {active
        ? currentOrder === 'asc'
          ? <ArrowUp aria-hidden="true" />
          : <ArrowDown aria-hidden="true" />
        : <ArrowUpDown aria-hidden="true" />}
    </Link>
  );
}

function StateCell({ processo }: { processo: Processo }) {
  const label = STATE_LABELS[processo.state];
  const Icon = processo.state === 'signal' ? BellRing : processo.state === 'alert' ? CircleAlert : CircleCheck;
  return (
    <span className={`${styles.stateCell} ${styles[`state_${processo.state}`]}`} title={label}>
      <Icon aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

function makeColumns(listParams: Record<string, string | undefined>): ColumnDef<Processo>[] {
  return [
    {
      id: 'state',
      accessorKey: 'state',
      header: 'Estado',
      cell: ({ row }) => <StateCell processo={row.original} />,
      size: 72,
      minSize: MIN_COLUMN_SIZE,
      maxSize: 100,
    },
    {
      id: 'tribunal',
      accessorKey: 'tribunal',
      header: () => <SortHeader label="Tribunal" sortKey="tribunal" listParams={listParams} />,
      cell: ({ getValue }) => <TribTag label={String(getValue())} />,
      size: 96,
      minSize: MIN_COLUMN_SIZE,
      maxSize: 180,
    },
    {
      id: 'cnj',
      accessorKey: 'cnj',
      header: () => <SortHeader label="Número CNJ" sortKey="cnj" listParams={listParams} />,
      cell: ({ getValue, row }) => (
        <Link
          href={`/processos/${encodeURIComponent(row.original.cnj)}`}
          className={styles.processLink}
          onClick={event => event.stopPropagation()}
        >
          <span className={styles.cnj}>{String(getValue())}</span>
          <span className="sr-only">Abrir processo</span>
        </Link>
      ),
      size: 230,
      minSize: MIN_COLUMN_SIZE,
      maxSize: 360,
    },
    {
      id: 'orgaoJulgador',
      accessorKey: 'orgaoJulgador',
      header: 'Órgão julgador',
      cell: TextCell,
      size: 220,
      minSize: MIN_COLUMN_SIZE,
      maxSize: 420,
    },
    {
      id: 'classeJudicial',
      accessorFn: row => row.classeJudicial ?? '—',
      header: 'Classe judicial',
      cell: TextCell,
      size: 190,
      minSize: MIN_COLUMN_SIZE,
      maxSize: 380,
    },
    {
      id: 'assunto',
      accessorFn: row => row.assunto ?? '—',
      header: 'Assunto',
      cell: TextCell,
      size: 240,
      minSize: MIN_COLUMN_SIZE,
      maxSize: 460,
    },
    {
      id: 'poloAtivo',
      accessorFn: row => displayPartes(row.poloAtivo),
      header: 'Polo ativo',
      cell: TextCell,
      size: 210,
      minSize: MIN_COLUMN_SIZE,
      maxSize: 440,
    },
    {
      id: 'poloPassivo',
      accessorFn: row => displayPartes(row.poloPassivo),
      header: 'Polo passivo',
      cell: TextCell,
      size: 210,
      minSize: MIN_COLUMN_SIZE,
      maxSize: 440,
    },
    {
      id: 'valorCausa',
      accessorFn: row => row.valorCausa == null ? '—' : currencyFormatter.format(row.valorCausa),
      header: () => <SortHeader label="Valor da causa" sortKey="valor" listParams={listParams} />,
      cell: ({ getValue }) => <span className={styles.numeric}>{String(getValue())}</span>,
      size: 150,
      minSize: MIN_COLUMN_SIZE,
      maxSize: 240,
    },
    {
      id: 'autuadoEm',
      accessorFn: row => displayDate(row.autuadoEm),
      header: () => <SortHeader label="Autuação" sortKey="autuado" listParams={listParams} />,
      cell: DateCell,
      size: 150,
      minSize: MIN_COLUMN_SIZE,
      maxSize: 220,
    },
    {
      id: 'ultimaMov',
      accessorKey: 'ultimaMov',
      header: 'Última movimentação',
      cell: TextCell,
      size: 260,
      minSize: MIN_COLUMN_SIZE,
      maxSize: 520,
    },
    {
      id: 'lastMovAt',
      accessorFn: row => displayDate(row.lastMovAt),
      header: () => <SortHeader label="Data da última movimentação" sortKey="recent" listParams={listParams} />,
      cell: DateCell,
      size: 180,
      minSize: MIN_COLUMN_SIZE,
      maxSize: 260,
    },
    {
      id: 'syncStatus',
      accessorFn: row => displaySync(row.syncStatus),
      header: 'Sincronização',
      cell: TextCell,
      size: 150,
      minSize: MIN_COLUMN_SIZE,
      maxSize: 260,
    },
    {
      id: 'whatsEnabled',
      accessorFn: row => row.whatsEnabled ? 'Ativo' : 'Inativo',
      header: 'Monitoramento',
      cell: TextCell,
      size: 150,
      minSize: MIN_COLUMN_SIZE,
      maxSize: 220,
    },
  ];
}

function TextCell({ getValue }: { getValue: () => unknown }) {
  const value = String(getValue() ?? '—');
  return <span className={styles.ellipsis} title={value}>{value}</span>;
}

function DateCell({ getValue }: { getValue: () => unknown }) {
  return <span className={styles.date}>{String(getValue() ?? '—')}</span>;
}

function pinnedStyle(column: Column<Processo>): CSSProperties {
  const pinned = column.getIsPinned();
  if (!pinned) return {};
  return {
    left: pinned === 'left' ? `${column.getStart('left')}px` : undefined,
    right: pinned === 'right' ? `${column.getAfter('right')}px` : undefined,
    position: 'sticky',
    zIndex: 2,
  };
}

function resizeColumn(
  event: PointerEvent<HTMLButtonElement>,
  column: Column<Processo>,
  setSizing: (value: ColumnSizingState | ((current: ColumnSizingState) => ColumnSizingState)) => void,
) {
  event.preventDefault();
  event.stopPropagation();
  const target = event.currentTarget;
  const startX = event.clientX;
  const startSize = column.getSize();
  target.setPointerCapture(event.pointerId);

  const move = (moveEvent: globalThis.PointerEvent) => {
    const size = Math.min(column.columnDef.maxSize ?? 520, Math.max(
      column.columnDef.minSize ?? MIN_COLUMN_SIZE,
      startSize + moveEvent.clientX - startX,
    ));
    setSizing(current => ({ ...current, [column.id]: Math.round(size) }));
  };
  const finish = () => {
    target.removeEventListener('pointermove', move);
    target.removeEventListener('pointerup', finish);
    target.removeEventListener('pointercancel', finish);
  };
  target.addEventListener('pointermove', move);
  target.addEventListener('pointerup', finish);
  target.addEventListener('pointercancel', finish);
}

function ResizeHandle({
  header,
  setSizing,
}: {
  header: Header<Processo, unknown>;
  setSizing: (value: ColumnSizingState | ((current: ColumnSizingState) => ColumnSizingState)) => void;
}) {
  const column = header.column;
  const defaultSize = createDefaultProcessTablePreferences().columnSizing[column.id];
  const adjustKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home') return;
    event.preventDefault();
    const next = event.key === 'Home' ? defaultSize : column.getSize() + (event.key === 'ArrowRight' ? 12 : -12);
    const size = Math.min(column.columnDef.maxSize ?? 520, Math.max(column.columnDef.minSize ?? MIN_COLUMN_SIZE, next));
    setSizing(current => ({ ...current, [column.id]: size }));
  };

  return (
    <button
      type="button"
      className={styles.resizeHandle}
      onPointerDown={event => resizeColumn(event, column, setSizing)}
      onDoubleClick={() => setSizing(current => ({ ...current, [column.id]: defaultSize }))}
      onKeyDown={adjustKeyboard}
      role="separator"
      aria-orientation="vertical"
      aria-label={`Redimensionar coluna ${PROCESS_COLUMN_LABELS[column.id as ProcessColumnId]}`}
      aria-valuemin={column.columnDef.minSize ?? MIN_COLUMN_SIZE}
      aria-valuemax={column.columnDef.maxSize ?? 520}
      aria-valuenow={column.getSize()}
      title="Arraste para redimensionar; duplo clique para restaurar"
    >
      <GripVertical aria-hidden="true" />
    </button>
  );
}

export function ProcessTable({ processos, listParams = {} }: ProcessTableProps) {
  const router = useRouter();
  const { preferences, setPreferences } = useProcessTablePreferences();
  const columns = useMemo(() => makeColumns(listParams), [listParams]);

  const updateSizing = (value: ColumnSizingState | ((current: ColumnSizingState) => ColumnSizingState)) => {
    setPreferences(current => ({
      ...current,
      columnSizing: typeof value === 'function' ? value(current.columnSizing) : value,
    }));
  };

  // TanStack Table é um motor headless: seus getters mutáveis não devem ser memoizados pelo React Compiler.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: processos,
    columns,
    state: {
      columnOrder: preferences.columnOrder,
      columnVisibility: preferences.columnVisibility,
      columnSizing: preferences.columnSizing,
      columnPinning: preferences.columnPinning,
    },
    onColumnOrderChange: updater => setPreferences(current => ({
      ...current,
      columnOrder: typeof updater === 'function' ? updater(current.columnOrder) : updater,
    })),
    onColumnVisibilityChange: updater => setPreferences(current => ({
      ...current,
      columnVisibility: typeof updater === 'function' ? updater(current.columnVisibility) : updater,
    })),
    onColumnSizingChange: updateSizing,
    onColumnPinningChange: updater => setPreferences(current => ({
      ...current,
      columnPinning: typeof updater === 'function'
        ? updater(current.columnPinning) as ColumnPinningState
        : updater,
    })),
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
  });

  const activeSort = (listParams.sort || 'recent') as SortKey;
  const activeOrder: SortOrder = listParams.order === 'asc' ? 'asc' : listParams.order === 'desc'
    ? 'desc'
    : SORT_DEFAULTS[activeSort] ?? 'desc';

  const rowHref = (processo: Processo) => `/processos/${encodeURIComponent(processo.cnj)}`;
  const openRow = (processo: Processo) => router.push(rowHref(processo));

  const tableStyle = {
    width: table.getTotalSize(),
    '--process-font-size': `${preferences.fontSize}px`,
  } as CSSProperties;

  return (
    <section
      className={styles.workspace}
      data-density={preferences.density}
      style={{ '--process-font-size': `${preferences.fontSize}px` } as CSSProperties}
      aria-label="Tabela de processos"
    >
      <div className={styles.tableMeta}>
        <span>{table.getVisibleLeafColumns().length} colunas visíveis</span>
        <span className={styles.tableMetaHint}>Arraste os divisores do cabeçalho para ajustar as larguras.</span>
      </div>

      <div className={styles.desktopTableWrap} tabIndex={0} aria-label="Tabela com rolagem horizontal">
        <table className={styles.table} style={tableStyle}>
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  const columnId = header.column.id as ProcessColumnId;
                  const sortKey = columnId === 'cnj' ? 'cnj'
                    : columnId === 'tribunal' ? 'tribunal'
                      : columnId === 'valorCausa' ? 'valor'
                        : columnId === 'autuadoEm' ? 'autuado'
                          : columnId === 'lastMovAt' ? 'recent'
                            : null;
                  const isSorted = sortKey === activeSort;
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      style={{ width: header.getSize(), ...pinnedStyle(header.column) }}
                      className={header.column.getIsPinned() ? styles.pinnedCell : undefined}
                      aria-sort={sortKey ? isSorted ? activeOrder === 'asc' ? 'ascending' : 'descending' : 'none' : undefined}
                    >
                      <div className={styles.headerContent}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </div>
                      {header.column.getCanResize() && <ResizeHandle header={header} setSizing={updateSizing} />}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr
                key={row.id}
                className={row.original.state === 'signal' ? styles.rowSignal : undefined}
                onClick={() => openRow(row.original)}
              >
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    style={{ width: cell.column.getSize(), ...pinnedStyle(cell.column) }}
                    className={cell.column.getIsPinned() ? styles.pinnedCell : undefined}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.mobileCards}>
        {table.getRowModel().rows.map(row => {
          const secondaryCells = row.getVisibleCells().filter(cell => cell.column.id !== 'state' && cell.column.id !== 'cnj');
          return (
            <Link key={row.id} href={rowHref(row.original)} className={styles.mobileCard}>
              <div className={styles.mobileCardHeader}>
                {preferences.columnVisibility.state !== false && (
                  <StateCell processo={row.original} />
                )}
                {preferences.columnVisibility.cnj !== false && (
                  <span className={styles.cnj}>{row.original.cnj}</span>
                )}
              </div>
              <dl className={styles.mobileCardFields}>
                {secondaryCells.map(cell => (
                  <div key={cell.id}>
                    <dt>{PROCESS_COLUMN_LABELS[cell.column.id as ProcessColumnId]}</dt>
                    <dd>{flexRender(cell.column.columnDef.cell, cell.getContext())}</dd>
                  </div>
                ))}
              </dl>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export { PROCESS_COLUMN_IDS };
