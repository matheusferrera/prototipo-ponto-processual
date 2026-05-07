'use client';
import { useState } from 'react';
import type { Prazo } from '@/types';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { Seal } from '@/components/ui/Seal/Seal';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import styles from './PrazosView.module.css';

type View = 'lista' | 'kanban' | 'calendario';

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAY_NAMES   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function accentColor(state: Prazo['state']) {
  if (state === 'alert')  return 'var(--alert)';
  if (state === 'signal') return 'var(--brick)';
  return 'var(--quiet)';
}

function parseVenc(v: string): { day: number; month: number } {
  const [d, m] = v.split('/').map(Number);
  return { day: d, month: m };
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
                <Button variant="outline" size="sm" className="border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--paper-2)] whitespace-nowrap">Ver processo →</Button>
              </div>
            </div>

            <div className={styles.prazoBody}>
              <div className={styles.prazoParteName}>{pz.parte}</div>
              <div className={styles.prazoCnj}>{pz.cnj}</div>
            </div>

            <div className={styles.prazoMetaMobile}>
              <div className={styles.prazoMetaMobileInner}>
                <span className={`${styles.mDias} ${diasClass}`}>{pz.diasRestantes}d</span>
                <span className={styles.mRest}>rest.</span>
                <span className={styles.mSep}>·</span>
                <span className={`${styles.mVence} ${venceClass}`}>{pz.vencimento}</span>
                <Button variant="outline" size="sm" className="ml-auto border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--paper-2)] shrink-0">Ver →</Button>
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
                <div className={styles.kanbanCardParte}>{pz.parte}</div>
                <div className={styles.kanbanCardCnj}>{pz.cnj}</div>
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

function CalendarioView({ prazos, year, month }: { prazos: Prazo[]; year: number; month: number }) {
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth  = new Date(year, month, 0).getDate();
  const today        = new Date();
  const todayDay     = today.getFullYear() === year && today.getMonth() + 1 === month ? today.getDate() : -1;

  const byDay: Record<number, Prazo[]> = {};
  for (const pz of prazos) {
    const { day, month: m } = parseVenc(pz.vencimento);
    if (m === month) byDay[day] = [...(byDay[day] ?? []), pz];
  }

  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className={`px-page ${styles.calView}`}>
      <div className={styles.calDayNames}>
        {DAY_NAMES.map(d => (
          <div key={d} className={styles.calDayName}>{d}</div>
        ))}
      </div>

      <div className={styles.calGrid}>
        {cells.map((day, i) => {
          const items   = day ? (byDay[day] ?? []) : [];
          const isToday = day === todayDay;
          return (
            <div
              key={i}
              className={`${styles.calCell} ${day ? styles.calCellFilled : styles.calCellEmpty}`}
            >
              {day && (
                <>
                  <div className={`${styles.calDayNum} ${isToday ? styles.calDayNumToday : styles.calDayNumNormal}`}>
                    {day}
                  </div>

                  {items.length > 0 && (
                    <div className={styles.calDots}>
                      {items.slice(0, 3).map(pz => (
                        <span key={pz.id} style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor(pz.state), display: 'block', flexShrink: 0 }} />
                      ))}
                      {items.length > 3 && (
                        <span style={{ fontSize: 8, color: 'var(--ink-4)', lineHeight: 1, alignSelf: 'center' }}>+{items.length - 3}</span>
                      )}
                    </div>
                  )}

                  <div className={styles.calEvents}>
                    {items.map(pz => (
                      <div
                        key={pz.id}
                        className={styles.calEvent}
                        style={{
                          background: pz.state === 'alert' ? 'var(--alert-soft)' : pz.state === 'signal' ? 'var(--brick-soft)' : 'var(--quiet-soft)',
                          borderLeft: `2px solid ${accentColor(pz.state)}`,
                        }}
                      >
                        <div className={styles.calEventTitle} style={{ color: accentColor(pz.state) }}>{pz.tipo}</div>
                        <div className={styles.calEventParte}>{pz.parte}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

const VIEW_LABELS: Record<View, string> = { lista: 'Lista', kanban: 'Kanban', calendario: 'Calendário' };
const VIEWS: View[] = ['lista', 'kanban', 'calendario'];

export function PrazosView({ prazos }: { prazos: Prazo[] }) {
  const [view, setView]       = useState<View>('lista');
  const now                   = new Date();
  const [calYear, setCalYear]   = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);

  const criticalCount = prazos.filter(p => p.diasRestantes <= 3).length;
  const firstCritical = prazos.find(p => p.diasRestantes <= 3);

  function prevMonth() {
    const d = new Date(calYear, calMonth - 2);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth() + 1);
  }

  function nextMonth() {
    const d = new Date(calYear, calMonth);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth() + 1);
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.headerCopy}>
          <div className={styles.eyebrow}>{prazos.length} prazos ativos</div>
          <div className={styles.title}>Prazos</div>
        </div>

        <div className={styles.headerBottom}>
          <div className={styles.tabs}>
            {VIEWS.map(v => (
              <Button
                key={v}
                onClick={() => setView(v)}
                variant={view === v ? 'default' : 'outline'}
                size="sm"
                className={`${styles.tabBtn}${view === v ? ` ${styles.tabBtnActive}` : ' border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--paper-2)]'}`}
              >
                {VIEW_LABELS[v]}
              </Button>
            ))}
          </div>

          {view === 'calendario' && (
            <div className={styles.calNav}>
              <Button onClick={prevMonth} variant="outline" size="icon-sm" className="border-[var(--line)] text-[var(--ink-2)]">←</Button>
              <span className={styles.calNavLabel}>{MONTH_NAMES[calMonth - 1]} {calYear}</span>
              <Button onClick={nextMonth} variant="outline" size="icon-sm" className="border-[var(--line)] text-[var(--ink-2)]">→</Button>
            </div>
          )}
        </div>
      </div>

      {criticalCount > 0 && (
        <Alert className={styles.alert}>
          <AlertTitle className={styles.alertCount}>
            {criticalCount} prazo{criticalCount > 1 ? 's' : ''} crítico{criticalCount > 1 ? 's' : ''}
          </AlertTitle>
          {firstCritical && (
            <AlertDescription className={styles.alertDesc}>
              — {firstCritical.parte} vence em {firstCritical.diasRestantes} dia{firstCritical.diasRestantes !== 1 ? 's' : ''}
            </AlertDescription>
          )}
        </Alert>
      )}

      {view === 'lista'      && <ListView      prazos={prazos} />}
      {view === 'kanban'     && <KanbanView     prazos={prazos} />}
      {view === 'calendario' && <CalendarioView prazos={prazos} year={calYear} month={calMonth} />}
    </div>
  );
}
