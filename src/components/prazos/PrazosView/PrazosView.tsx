'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { Prazo } from '@/types';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { Seal } from '@/components/ui/Seal/Seal';
import { Button, buttonVariants } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import styles from './PrazosView.module.css';

export type PrazoView = 'lista' | 'kanban' | 'calendario';

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAY_NAMES   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const WEEKDAY_FULL = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];

function accentColor(state: Prazo['state']) {
  if (state === 'alert')  return 'var(--alert)';
  if (state === 'signal') return 'var(--brick)';
  return 'var(--quiet)';
}

function parseVencISO(v: string): { year: number; month: number; day: number } {
  const [y, m, d] = v.split('-').map(Number);
  return { year: y, month: m, day: d };
}

function diasColorClass(dias: number, s: typeof styles) {
  if (dias <= 3) return s.diasColorCritical;
  if (dias <= 7) return s.diasColorUrgent;
  return s.diasColorNormal;
}

// ─── Lista ───────────────────────────────────────────────────────────────────

function ListView({ prazos }: { prazos: Prazo[] }) {
  return (
    <div className={`px-page ${styles.listView}`}>
      <div className={styles.listHeader}>
        <span className={styles.listHeaderLabel}>§ PRÓXIMOS VENCIMENTOS</span>
        <div className={styles.listDivider} />
      </div>

      {prazos.length === 0 && (
        <div className={styles.emptyState}>Nenhum prazo encontrado com os filtros atuais.</div>
      )}

      {prazos.map(pz => {
        const isCritical  = pz.diasRestantes <= 3;
        const itemStateClass = pz.state === 'alert' ? styles.prazoItemAlert : pz.state === 'signal' ? styles.prazoItemSignal : styles.prazoItemQuiet;
        const diasClass   = diasColorClass(pz.diasRestantes, styles);
        const venceClass  = isCritical ? styles.venceNumCritical : styles.venceNumNormal;

        return (
          <div key={pz.id} className={`${styles.prazoItem} ${itemStateClass}`}>
            <div className={styles.prazoHead}>
              <div className={styles.prazoTags}>
                <TribTag label={pz.tribunal} />
                <span className={styles.prazoTipo}>{pz.tipo}</span>
                {isCritical && <Seal variant="erro" label="CRÍTICO" />}
              </div>

              <div className={styles.prazoMetaDesktop}>
                <div style={{ textAlign: 'right' }}>
                  <div className={`${styles.diasNum} ${diasClass}`}>{pz.diasRestantes}d</div>
                  <div className={styles.diasSub}>restantes</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={styles.venceLabel}>Vence em</div>
                  <div className={`${styles.venceNum} ${venceClass}`}>{pz.vencimento}</div>
                </div>
              </div>
            </div>

            <div className={styles.prazoBody}>
              <div className={styles.prazoParteName}>{pz.assunto}</div>
              <div className={styles.prazoProcessMeta}>
                <span className={styles.prazoCnj}>{pz.cnj}</span>
                {pz.orgaoJulgador !== '—' && (
                  <>
                    <span className={styles.metaSep} aria-hidden="true">·</span>
                    <span className={styles.prazoOrgao}>{pz.orgaoJulgador}</span>
                  </>
                )}
              </div>
            </div>

            <div className={styles.prazoMetaMobile}>
              <div className={styles.prazoMetaMobileInner}>
                <span className={`${styles.mDias} ${diasClass}`}>{pz.diasRestantes}d</span>
                <span className={styles.mRest}>rest.</span>
                <span className={styles.mSep}>·</span>
                <span className={`${styles.mVence} ${venceClass}`}>{pz.vencimento}</span>
                <Link
                  href={`/processos/${encodeURIComponent(pz.cnj)}`}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'ml-auto border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--paper-2)] shrink-0')}
                >
                  Ver →
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Kanban ──────────────────────────────────────────────────────────────────

const KANBAN_COLS = [
  { label: 'Crítico', minD: 0,  maxD: 3,       accent: 'var(--alert)',  soft: 'var(--alert-soft)'  },
  { label: 'Urgente', minD: 4,  maxD: 7,       accent: 'var(--signal)', soft: 'var(--signal-soft)' },
  { label: 'Atenção', minD: 8,  maxD: 14,      accent: 'var(--brick)',  soft: 'var(--brick-soft)'  },
  { label: 'Normal',  minD: 15, maxD: Infinity, accent: 'var(--quiet)', soft: 'var(--quiet-soft)'  },
] as const;

function KanbanView({ prazos }: { prazos: Prazo[] }) {
  return (
    <div className={`px-page ${styles.kanbanWrap}`}>
      {KANBAN_COLS.map(col => {
        const items = prazos.filter(p => p.diasRestantes >= col.minD && p.diasRestantes <= col.maxD);
        return (
          <div key={col.label} className={styles.kanbanCol}>
            <div
              className={styles.kanbanColHead}
              style={{ background: col.soft, borderTop: `2px solid ${col.accent}` }}
            >
              <span className={styles.kanbanColLabel} style={{ color: col.accent }}>{col.label}</span>
              <span className={styles.kanbanColCount} style={{ color: col.accent }}>{items.length}</span>
            </div>

            {items.length === 0 ? (
              <div className={styles.kanbanEmpty}>Nenhum prazo</div>
            ) : items.map(pz => (
              <div
                key={pz.id}
                className={styles.kanbanCard}
                style={{ borderTop: `2px solid ${col.accent}` }}
              >
                <div className={styles.kanbanCardHead}>
                  <TribTag label={pz.tribunal} />
                  <span className={styles.kanbanCardTipo}>{pz.tipo}</span>
                </div>
                <div className={styles.kanbanCardParte}>{pz.assunto}</div>
                <div className={styles.kanbanCardProcess}>
                  <span className={styles.kanbanCardCnj}>{pz.cnj}</span>
                  {pz.orgaoJulgador !== '—' && (
                    <span className={styles.kanbanCardOrgao}>{pz.orgaoJulgador}</span>
                  )}
                </div>
                <div className={styles.kanbanCardFoot}>
                  <span className={styles.kanbanDias} style={{ color: col.accent }}>{pz.diasRestantes}d</span>
                  <span className={styles.kanbanVence}>{pz.vencimento}</span>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Calendário ──────────────────────────────────────────────────────────────

function AgendaItem({ pz, showDay }: { pz: Prazo; showDay?: number }) {
  return (
    <Link
      href={`/processos/${encodeURIComponent(pz.cnj)}`}
      className={styles.agendaItem}
      style={{ borderLeftColor: accentColor(pz.state) }}
    >
      <div className={styles.agendaItemHead}>
        {showDay != null && <span className={styles.agendaDayBadge}>dia {String(showDay).padStart(2, '0')}</span>}
        <TribTag label={pz.tribunal} />
        <span className={styles.prazoTipo}>{pz.tipo}</span>
        <span className={`${styles.agendaDias} ${diasColorClass(pz.diasRestantes, styles)}`}>{pz.diasRestantes}d</span>
      </div>
      <div className={styles.agendaParte}>{pz.assunto}</div>
      <div className={styles.agendaCnj}>{pz.cnj}</div>
    </Link>
  );
}

function CalendarioView({
  prazos, year, month, selectedDay, onSelectDay,
}: {
  prazos: Prazo[];
  year: number;
  month: number;
  selectedDay: number | null;
  onSelectDay: (day: number | null) => void;
}) {
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth  = new Date(year, month, 0).getDate();
  const today        = new Date();
  const todayDay     = today.getFullYear() === year && today.getMonth() + 1 === month ? today.getDate() : -1;

  // Só prazos do ano+mês exibidos, ordenados por dia
  const inMonth: { day: number; pz: Prazo }[] = [];
  for (const pz of prazos) {
    const v = parseVencISO(pz.vencimentoISO);
    if (v.year === year && v.month === month) inMonth.push({ day: v.day, pz });
  }
  inMonth.sort((a, b) => a.day - b.day);

  const byDay: Record<number, Prazo[]> = {};
  for (const { day, pz } of inMonth) byDay[day] = [...(byDay[day] ?? []), pz];

  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const dayItems = selectedDay ? (byDay[selectedDay] ?? []) : [];
  const selectedWeekday = selectedDay ? WEEKDAY_FULL[new Date(year, month - 1, selectedDay).getDay()] : '';

  return (
    <div className={`px-page ${styles.calView}`}>
      <div className={styles.calDayNames}>
        {DAY_NAMES.map(d => (
          <div key={d} className={styles.calDayName}>{d}</div>
        ))}
      </div>

      <div className={styles.calGrid}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} className={`${styles.calCell} ${styles.calCellEmpty}`} aria-hidden="true" />;

          const items      = byDay[day] ?? [];
          const isToday    = day === todayDay;
          const isSelected = day === selectedDay;
          return (
            <button
              key={i}
              type="button"
              className={`${styles.calCell} ${styles.calCellFilled} ${isSelected ? styles.calCellSelected : ''}`}
              aria-pressed={isSelected}
              aria-current={isToday ? 'date' : undefined}
              aria-label={`${day} de ${MONTH_NAMES[month - 1]}, ${items.length === 0 ? 'sem prazos' : `${items.length} prazo${items.length > 1 ? 's' : ''}`}`}
              onClick={() => onSelectDay(isSelected ? null : day)}
            >
              <span className={`${styles.calDayNum} ${isToday ? styles.calDayNumToday : styles.calDayNumNormal}`}>
                {day}
              </span>

              <span className={styles.calDots} aria-hidden="true">
                {items.slice(0, 3).map(pz => (
                  <span key={pz.id} className={styles.calDot} style={{ background: accentColor(pz.state) }} />
                ))}
                {items.length > 3 && <span className={styles.calMore}>+{items.length - 3}</span>}
              </span>
            </button>
          );
        })}
      </div>

      <section className={styles.agenda} aria-label="Prazos do período selecionado">
        {selectedDay ? (
          <>
            <div className={styles.agendaHead}>
              <span className={styles.agendaHeadLabel}>§ {selectedWeekday}, {selectedDay} de {MONTH_NAMES[month - 1]}</span>
              <div className={styles.listDivider} />
              <button type="button" className={styles.agendaClear} onClick={() => onSelectDay(null)}>
                Ver mês inteiro
              </button>
            </div>
            {dayItems.length === 0 ? (
              <div className={styles.agendaEmpty}>Nenhum prazo neste dia.</div>
            ) : dayItems.map(pz => <AgendaItem key={pz.id} pz={pz} />)}
          </>
        ) : (
          <>
            <div className={styles.agendaHead}>
              <span className={styles.agendaHeadLabel}>§ PRAZOS DE {MONTH_NAMES[month - 1].toUpperCase()}</span>
              <div className={styles.listDivider} />
            </div>
            {inMonth.length === 0 ? (
              <div className={styles.agendaEmpty}>Nenhum prazo em {MONTH_NAMES[month - 1]} de {year}.</div>
            ) : inMonth.map(({ day, pz }) => <AgendaItem key={pz.id} pz={pz} showDay={day} />)}
          </>
        )}
      </section>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function PrazosView({ prazos, view }: { prazos: Prazo[]; view: PrazoView }) {
  const now                     = new Date();
  const [calYear, setCalYear]   = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calDay, setCalDay]     = useState<number | null>(now.getDate());

  const criticalCount = prazos.filter(p => p.diasRestantes <= 3).length;
  const firstCritical = prazos.find(p => p.diasRestantes <= 3);

  const isCurrentMonth = calYear === now.getFullYear() && calMonth === now.getMonth() + 1;

  function prevMonth() {
    const d = new Date(calYear, calMonth - 2);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth() + 1);
    setCalDay(null);
  }

  function nextMonth() {
    const d = new Date(calYear, calMonth);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth() + 1);
    setCalDay(null);
  }

  function goToday() {
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth() + 1);
    setCalDay(now.getDate());
  }

  return (
    <div className={styles.root}>
      {view === 'calendario' && (
        <div className={styles.calNavBar}>
          <div className={styles.calNavGroup}>
            <Button onClick={prevMonth} variant="outline" size="icon" aria-label="Mês anterior" className="border-[var(--line)] text-[var(--ink-2)] max-md:size-11">←</Button>
            <span className={styles.calNavLabel} aria-live="polite">{MONTH_NAMES[calMonth - 1]} {calYear}</span>
            <Button onClick={nextMonth} variant="outline" size="icon" aria-label="Próximo mês" className="border-[var(--line)] text-[var(--ink-2)] max-md:size-11">→</Button>
          </div>
          <Button onClick={goToday} variant="outline" size="sm" disabled={isCurrentMonth && calDay === now.getDate()} className="border-[var(--line)] text-[var(--ink-2)] max-md:h-11 max-md:px-4">
            Hoje
          </Button>
        </div>
      )}

      <div className={styles.scrollArea}>
        {criticalCount > 0 && (
          <Alert className={styles.alert}>
            <AlertTitle className={styles.alertCount}>
              {criticalCount} prazo{criticalCount > 1 ? 's' : ''} crítico{criticalCount > 1 ? 's' : ''}
            </AlertTitle>
            {firstCritical && (
              <AlertDescription className={styles.alertDesc}>
                — {firstCritical.assunto} vence em {firstCritical.diasRestantes} dia{firstCritical.diasRestantes !== 1 ? 's' : ''}
              </AlertDescription>
            )}
          </Alert>
        )}

        {view === 'lista'      && <ListView      prazos={prazos} />}
        {view === 'kanban'     && <KanbanView     prazos={prazos} />}
        {view === 'calendario' && (
          <CalendarioView prazos={prazos} year={calYear} month={calMonth} selectedDay={calDay} onSelectDay={setCalDay} />
        )}
      </div>
    </div>
  );
}
