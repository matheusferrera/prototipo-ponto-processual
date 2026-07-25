'use client';

import {
  type CSSProperties,
  Fragment,
  type KeyboardEvent,
  type PointerEvent,
  useMemo,
  useState,
} from 'react';
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
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BellRing,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  ExternalLink,
  GripVertical,
} from 'lucide-react';
import type { Processo, ProcessoParte, ProximoPrazo } from '@/types';
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

/** Distância humana até agora — "há 2h", "há 3d". */
function timeAgo(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days}d`;
  return `há ${Math.floor(days / 30)}mes`;
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  archived: 'Arquivado',
  suspended: 'Suspenso',
};

function displayStatus(status: string): string {
  return STATUS_LABELS[status?.toLowerCase()] ?? status ?? '—';
}

/** Rótulo curto do prazo mais próximo, já com o senso de urgência. */
function prazoLabel(prazo: ProximoPrazo): string {
  const dias = prazo.diasRestantes;
  if (dias < 0) return `vencido ${displayDate(prazo.dataLimite)}`;
  if (dias === 0) return 'vence hoje';
  if (dias === 1) return 'vence amanhã';
  return `${dias}d · ${displayDate(prazo.dataLimite)}`;
}

function PrazoCell({ processo }: { processo: Processo }) {
  const prazo = processo.proximoPrazo;
  if (!prazo) return <span className={styles.prazoEmpty}>—</span>;

  const dias = prazo.diasRestantes;
  const tone = dias <= 2 ? 'urgente' : dias <= 7 ? 'proximo' : 'calmo';
  const extras = processo.prazosAbertos > 1 ? ` +${processo.prazosAbertos - 1}` : '';

  return (
    <span
      className={`${styles.prazoChip} ${styles[`prazo_${tone}`]}`}
      title={`${prazo.tipo}${prazo.parte ? ` — ${prazo.parte}` : ''} · vence em ${displayDate(prazo.dataLimite)}`}
    >
      {prazoLabel(prazo)}{extras}
    </span>
  );
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
      id: 'prazo',
      accessorFn: row => row.proximoPrazo ? prazoLabel(row.proximoPrazo) : '—',
      header: 'Próximo prazo',
      cell: ({ row }) => <PrazoCell processo={row.original} />,
      size: 150,
      minSize: MIN_COLUMN_SIZE,
      maxSize: 240,
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
      id: 'movimentacoes',
      accessorFn: row => String(row.movimentacoesCount),
      header: 'Movimentações',
      cell: ({ getValue }) => <span className={styles.numeric}>{String(getValue())}</span>,
      size: 130,
      minSize: MIN_COLUMN_SIZE,
      maxSize: 200,
    },
    {
      id: 'lastScrapedAt',
      accessorFn: row => timeAgo(row.lastScrapedAt),
      header: 'Última verificação',
      cell: DateCell,
      size: 160,
      minSize: MIN_COLUMN_SIZE,
      maxSize: 240,
    },
    {
      id: 'syncStatus',
      accessorFn: row => displaySync(row.syncStatus),
      header: 'Sincronização',
      cell: ({ getValue, row }) => (
        <span className={styles.ellipsis} title={row.original.syncError ?? String(getValue())}>
          {String(getValue())}
        </span>
      ),
      size: 150,
      minSize: MIN_COLUMN_SIZE,
      maxSize: 260,
    },
    {
      id: 'grau',
      accessorKey: 'grau',
      header: 'Grau',
      cell: TextCell,
      size: 80,
      minSize: MIN_COLUMN_SIZE,
      maxSize: 140,
    },
    {
      id: 'statusProcesso',
      accessorFn: row => displayStatus(row.status),
      header: 'Situação',
      cell: TextCell,
      size: 130,
      minSize: MIN_COLUMN_SIZE,
      maxSize: 220,
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

/** Largura da coluna de expandir — fica fora do TanStack, então desloca as colunas fixadas. */
const EXPANDER_WIDTH = 36;

function pinnedStyle(column: Column<Processo>): CSSProperties {
  const pinned = column.getIsPinned();
  if (!pinned) return {};
  return {
    left: pinned === 'left' ? `${column.getStart('left') + EXPANDER_WIDTH}px` : undefined,
    right: pinned === 'right' ? `${column.getAfter('right')}px` : undefined,
    position: 'sticky',
    zIndex: 2,
  };
}

/**
 * Painel de detalhe da linha — mostra o que não cabe (ou não está visível) nas
 * colunas: partes completas com representantes, erro de sincronização e a capa.
 */
function RowDetails({ processo }: { processo: Processo }) {
  return (
    <div className={styles.rowDetails}>
      {processo.syncError && (
        <p className={styles.rowDetailsError}>
          Falha na última sincronização: {processo.syncError}
        </p>
      )}

      <div className={styles.rowDetailsPolos}>
        <PoloBlock titulo="Polo ativo" partes={processo.poloAtivo} />
        <PoloBlock titulo="Polo passivo" partes={processo.poloPassivo} />
      </div>

      <dl className={styles.rowDetailsGrid}>
        <DetailItem label="Classe judicial" value={processo.classeJudicial ?? '—'} />
        <DetailItem label="Assunto" value={processo.assunto ?? '—'} />
        <DetailItem label="Grau" value={processo.grau} />
        <DetailItem label="Situação" value={displayStatus(processo.status)} />
        <DetailItem
          label="Valor da causa"
          value={processo.valorCausa == null ? '—' : currencyFormatter.format(processo.valorCausa)}
        />
        <DetailItem label="Autuado em" value={displayDate(processo.autuadoEm)} />
        <DetailItem label="Movimentações" value={String(processo.movimentacoesCount)} />
        <DetailItem label="Prazos abertos" value={String(processo.prazosAbertos)} />
        <DetailItem label="Última verificação" value={timeAgo(processo.lastScrapedAt)} />
        <DetailItem label="Monitoramento" value={processo.whatsEnabled ? 'Ativo' : 'Inativo'} />
      </dl>

      <div className={styles.rowDetailsActions}>
        <Link
          href={`/processos/${encodeURIComponent(processo.cnj)}`}
          className={styles.rowDetailsLink}
          onClick={event => event.stopPropagation()}
        >
          Ver movimentações
        </Link>
        {processo.link && (
          <a
            href={processo.link}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.rowDetailsLink}
            onClick={event => event.stopPropagation()}
          >
            <ExternalLink aria-hidden="true" />
            Abrir no PJe
          </a>
        )}
      </div>
    </div>
  );
}

function PoloBlock({ titulo, partes }: { titulo: string; partes: ProcessoParte[] }) {
  return (
    <div>
      <span className={styles.rowDetailsLabel}>{titulo}</span>
      {partes.length === 0 ? (
        <p className={styles.rowDetailsMuted}>Não extraído</p>
      ) : (
        <ul className={styles.poloList}>
          {partes.map((parte, index) => (
            <li key={`${parte.nome}-${index}`}>
              <span className={styles.poloNome}>{parte.nome}</span>
              {parte.documento && <span className={styles.poloDoc}>{parte.documento}</span>}
              {parte.representantes.length > 0 && (
                <span className={styles.poloRepresentantes}>{parte.representantes.join(' · ')}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className={styles.rowDetailsLabel}>{label}</dt>
      <dd className={value === '—' ? styles.rowDetailsMuted : styles.rowDetailsValue}>{value}</dd>
    </div>
  );
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
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const toggleExpanded = (id: string) => setExpanded(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

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
    width: table.getTotalSize() + EXPANDER_WIDTH,
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
                <th
                  scope="col"
                  className={styles.expanderCell}
                  style={{ width: EXPANDER_WIDTH, left: 0, position: 'sticky', zIndex: 2 }}
                >
                  <span className="sr-only">Detalhes</span>
                </th>
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
            {table.getRowModel().rows.map(row => {
              const isExpanded = expanded.has(row.original.id);
              return (
                <Fragment key={row.id}>
                  <tr
                    className={row.original.state === 'signal' ? styles.rowSignal : undefined}
                    onClick={() => openRow(row.original)}
                  >
                    <td
                      className={styles.expanderCell}
                      style={{ width: EXPANDER_WIDTH, left: 0, position: 'sticky', zIndex: 2 }}
                    >
                      <button
                        type="button"
                        className={styles.expanderButton}
                        onClick={event => {
                          event.stopPropagation();
                          toggleExpanded(row.original.id);
                        }}
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? 'Ocultar' : 'Mostrar'} detalhes do processo ${row.original.cnj}`}
                      >
                        <ChevronDown
                          aria-hidden="true"
                          className={isExpanded ? styles.expanderIconOpen : undefined}
                        />
                      </button>
                    </td>
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
                  {isExpanded && (
                    <tr className={styles.detailsRow}>
                      <td colSpan={row.getVisibleCells().length + 1}>
                        <RowDetails processo={row.original} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
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
