'use client';
import { useState } from 'react';
import type { Prazo } from '@/types';
import { TribTag } from '@/components/ui/TribTag';
import { Seal } from '@/components/ui/Seal';

type View = 'lista' | 'kanban' | 'calendario';

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAY_NAMES = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function accentColor(state: Prazo['state']) {
  if (state === 'alert') return 'var(--alert)';
  if (state === 'signal') return 'var(--brick)';
  return 'var(--quiet)';
}

function parseVenc(v: string): { day: number; month: number } {
  const [d, m] = v.split('/').map(Number);
  return { day: d, month: m };
}

// ─── Lista ───────────────────────────────────────────────────────────────────

function ListView({ prazos }: { prazos: Prazo[] }) {
  return (
    <div className="px-page" style={{ padding: '24px 32px', overflow: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--brick)', letterSpacing: '0.05em' }}>
          § PRÓXIMOS VENCIMENTOS
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      </div>

      {prazos.map(pz => {
        const isCritical = pz.diasRestantes <= 3;
        const leftBorder = pz.state === 'alert' ? 'var(--alert)' : pz.state === 'signal' ? 'var(--brick)' : 'var(--line)';
        const diasColor = isCritical ? 'var(--alert)' : pz.diasRestantes <= 7 ? 'var(--brick)' : 'var(--ink)';

        return (
          <div
            key={pz.id}
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--line)',
              borderLeft: `3px solid ${leftBorder}`,
              marginBottom: 10,
            }}
          >
            {/* Cabeçalho: tags + meta desktop */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', padding: '14px 20px 0', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                <TribTag label={pz.tribunal} />
                <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>
                  {pz.tipo}
                </span>
                {isCritical && <Seal variant="erro" label="CRÍTICO" />}
              </div>

              {/* Meta desktop — oculto no mobile via CSS */}
              <div className="prazos-meta-desktop" style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--ui)', fontWeight: 700, fontSize: 30, letterSpacing: '-0.02em', color: diasColor, lineHeight: 1 }}>
                    {pz.diasRestantes}d
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>restantes</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>
                    Vence em
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 17, marginTop: 3, color: isCritical ? 'var(--alert)' : 'var(--ink)' }}>
                    {pz.vencimento}
                  </div>
                </div>
                <button style={{ fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 12, padding: '7px 12px', border: '1px solid var(--ink)', background: 'var(--paper)', color: 'var(--ink)', borderRadius: 0, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Ver processo →
                </button>
              </div>
            </div>

            {/* Corpo: parte + CNJ */}
            <div style={{ padding: '8px 20px 14px' }}>
              <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pz.parte}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pz.cnj}
              </div>
            </div>

            {/* Meta mobile — sem inline display, visível só via CSS */}
            <div className="prazos-meta-mobile">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px 12px', borderTop: '1px solid var(--line-soft)', flexWrap: 'nowrap' }}>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 18, color: diasColor, lineHeight: 1, flexShrink: 0 }}>
                  {pz.diasRestantes}d
                </span>
                <span style={{ fontSize: 11, color: 'var(--ink-3)', flexShrink: 0 }}>rest.</span>
                <span style={{ color: 'var(--line-soft)', flexShrink: 0 }}>·</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: isCritical ? 'var(--alert)' : 'var(--ink-2)', flexShrink: 0 }}>
                  {pz.vencimento}
                </span>
                <button style={{ marginLeft: 'auto', fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 11, padding: '6px 12px', border: '1px solid var(--ink)', background: 'var(--paper)', color: 'var(--ink)', borderRadius: 0, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  Ver →
                </button>
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
  { label: 'Crítico',  minD: 0,  maxD: 3,        accent: 'var(--alert)',  soft: 'var(--alert-soft)'  },
  { label: 'Urgente',  minD: 4,  maxD: 7,        accent: 'var(--signal)', soft: 'var(--signal-soft)' },
  { label: 'Atenção',  minD: 8,  maxD: 14,       accent: 'var(--brick)',  soft: 'var(--brick-soft)'  },
  { label: 'Normal',   minD: 15, maxD: Infinity,  accent: 'var(--quiet)',  soft: 'var(--quiet-soft)'  },
] as const;

function KanbanView({ prazos }: { prazos: Prazo[] }) {
  return (
    <div className="px-page prazos-kanban-wrap" style={{ padding: '24px 32px', overflow: 'auto', flex: 1, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      {KANBAN_COLS.map(col => {
        const items = prazos.filter(p => p.diasRestantes >= col.minD && p.diasRestantes <= col.maxD);
        return (
          <div key={col.label} className="prazos-kanban-col" style={{ flex: 1, minWidth: 180 }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: col.soft, borderTop: `2px solid ${col.accent}`, marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: col.accent, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{col.label}</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: col.accent }}>{items.length}</span>
            </div>

            {items.length === 0 ? (
              <div style={{ padding: '16px 12px', fontSize: 12, color: 'var(--ink-4)', textAlign: 'center', border: '1px dashed var(--line)' }}>
                Nenhum prazo
              </div>
            ) : items.map(pz => (
              <div key={pz.id} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderTop: `2px solid ${col.accent}`, marginBottom: 8, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <TribTag label={pz.tribunal} />
                  <span style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{pz.tipo}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{pz.parte}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', marginBottom: 10 }}>{pz.cnj}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 22, color: col.accent, lineHeight: 1 }}>{pz.diasRestantes}d</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>{pz.vencimento}</span>
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
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const todayDay = today.getFullYear() === year && today.getMonth() + 1 === month ? today.getDate() : -1;

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
    <div className="px-page" style={{ padding: '24px 32px', overflow: 'auto', flex: 1 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 1 }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ padding: '6px', textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'var(--paper-2)' }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'var(--line-soft)' }}>
        {cells.map((day, i) => {
          const items = day ? (byDay[day] ?? []) : [];
          const isToday = day === todayDay;
          return (
            <div key={i} className="prazos-cal-cell" style={{ background: day ? 'var(--paper)' : 'var(--paper-2)', minHeight: 96, padding: '6px 8px' }}>
              {day && (
                <>
                  <div style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    fontWeight: isToday ? 700 : 400,
                    color: isToday ? 'var(--paper)' : 'var(--ink-3)',
                    marginBottom: 6,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 20,
                    height: 20,
                    background: isToday ? 'var(--brick)' : 'transparent',
                  }}>
                    {day}
                  </div>

                  {/* Dots — visíveis só no mobile via CSS */}
                  {items.length > 0 && (
                    <div className="prazos-cal-dots">
                      {items.slice(0, 3).map(pz => (
                        <span key={pz.id} style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor(pz.state), display: 'block', flexShrink: 0 }} />
                      ))}
                      {items.length > 3 && (
                        <span style={{ fontSize: 8, color: 'var(--ink-4)', lineHeight: 1, alignSelf: 'center' }}>+{items.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Labels — visíveis só no desktop via CSS */}
                  <div className="prazos-cal-events">
                    {items.map(pz => (
                      <div key={pz.id} style={{ background: pz.state === 'alert' ? 'var(--alert-soft)' : pz.state === 'signal' ? 'var(--brick-soft)' : 'var(--quiet-soft)', borderLeft: `2px solid ${accentColor(pz.state)}`, padding: '3px 5px', marginBottom: 3, fontSize: 10, lineHeight: 1.3 }}>
                        <div style={{ fontWeight: 700, color: accentColor(pz.state), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pz.tipo}</div>
                        <div style={{ color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pz.parte}</div>
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
  const [view, setView] = useState<View>('lista');
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);

  const criticalCount = prazos.filter(p => p.diasRestantes <= 3).length;
  const firstCritical = prazos.find(p => p.diasRestantes <= 3);

  function tabBtn(v: View, i: number): React.CSSProperties {
    const active = view === v;
    return {
      fontFamily: 'var(--ui)',
      fontWeight: 600,
      fontSize: 12,
      padding: '6px 16px',
      border: '1px solid var(--line)',
      borderRight: i < VIEWS.length - 1 ? 'none' : '1px solid var(--line)',
      background: active ? 'var(--brick)' : 'var(--paper)',
      color: active ? '#fff' : 'var(--ink-2)',
      borderRadius: 0,
      cursor: 'pointer',
    };
  }

  function navBtn(): React.CSSProperties {
    return { fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 12, padding: '5px 10px', border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink-2)', borderRadius: 0, cursor: 'pointer' };
  }

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Topbar */}
      <div className="prazos-topbar px-page" style={{ padding: '18px 32px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 16, background: 'var(--paper)', flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>
            {prazos.length} prazos ativos
          </div>
          <div style={{ fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em', marginTop: 2 }}>Prazos</div>
        </div>

        {view === 'calendario' && (
          <div className="prazos-cal-nav" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={prevMonth} style={navBtn()}>←</button>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, minWidth: 110, textAlign: 'center' }}>
              {MONTH_NAMES[calMonth - 1]} {calYear}
            </span>
            <button onClick={nextMonth} style={navBtn()}>→</button>
          </div>
        )}

        <div className="prazos-tabs" style={{ display: 'flex' }}>
          {VIEWS.map((v, i) => (
            <button key={v} onClick={() => setView(v)} style={tabBtn(v, i)}>{VIEW_LABELS[v]}</button>
          ))}
        </div>
      </div>

      {/* Alerta crítico */}
      {criticalCount > 0 && (
        <div className="prazos-alert" style={{ margin: '16px 32px 0', padding: '12px 16px', background: 'var(--alert-soft)', borderLeft: '3px solid var(--alert)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--alert)' }}>
            {criticalCount} prazo{criticalCount > 1 ? 's' : ''} crítico{criticalCount > 1 ? 's' : ''}
          </span>
          {firstCritical && (
            <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>
              — {firstCritical.parte} vence em {firstCritical.diasRestantes} dia{firstCritical.diasRestantes !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {view === 'lista'      && <ListView      prazos={prazos} />}
      {view === 'kanban'     && <KanbanView     prazos={prazos} />}
      {view === 'calendario' && <CalendarioView prazos={prazos} year={calYear} month={calMonth} />}
    </div>
  );
}
