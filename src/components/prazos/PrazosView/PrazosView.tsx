'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { Prazo } from '@/types';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { Seal } from '@/components/ui/Seal/Seal';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ExportPrazosPdfButton } from '@/components/prazos/ExportPrazosPdfButton/ExportPrazosPdfButton';
import { tituloPrazo, parteSecundaria, clientePrazo, expedientePrazo, assuntoSecundario, rotuloNatureza } from '@/lib/prazo';
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

function parseISODate(v: string): Date {
  const { year, month, day } = parseVencISO(v);
  return new Date(year, month - 1, day);
}

const dd = (n: number) => String(n).padStart(2, '0');
const fmtDataCurta = (d: Date) => `${dd(d.getDate())}.${dd(d.getMonth() + 1)}`;
const fmtDataLonga = (d: Date) => `${fmtDataCurta(d)}.${d.getFullYear()}`;

function diasColorClass(dias: number, s: typeof styles) {
  if (dias <= 3) return s.diasColorCritical;
  if (dias <= 7) return s.diasColorUrgent;
  return s.diasColorNormal;
}

// ─── Pauta (lista) ───────────────────────────────────────────────────────────
// Agrupada pela DATA DA PAUTA (3 dias antes do fatal, antecipada p/ sexta quando
// cai no fim de semana): é a data em que o prazo precisa ser trabalhado. Cada
// linha carrega o PRAZO FATAL na coluna da esquerda, então as duas datas
// aparecem sem se repetirem.

interface PautaGrupo {
  key: string;
  data: Date;
  /** dias corridos até a data da pauta — negativo = pauta atrasada */
  dias: number;
  itens: Prazo[];
}

/** Preserva a ordem de `prazos` dentro de cada grupo, respeitando o sort escolhido. */
function agruparPorPauta(prazos: Prazo[], desc: boolean): PautaGrupo[] {
  const mapa = new Map<string, Prazo[]>();
  for (const pz of prazos) {
    const atual = mapa.get(pz.pautaISO);
    if (atual) atual.push(pz);
    else mapa.set(pz.pautaISO, [pz]);
  }

  return [...mapa.entries()]
    .sort(([a], [b]) => (desc ? b.localeCompare(a) : a.localeCompare(b)))
    .map(([key, itens]) => ({
      key,
      data: parseISODate(key),
      dias: itens[0].diasParaPauta,
      itens,
    }));
}

function rotuloPauta(dias: number): { texto: string; className: string } {
  if (dias < 0)   return { texto: 'Em atraso', className: styles.pautaRelAtraso };
  if (dias === 0) return { texto: 'Hoje',      className: styles.pautaRelHoje   };
  if (dias === 1) return { texto: 'Amanhã',    className: styles.pautaRelProx   };
  return { texto: `em ${dias} dias`, className: styles.pautaRelProx };
}

function PautaItem({ pz }: { pz: Prazo }) {
  const fatal      = parseISODate(pz.vencimentoISO);
  const isCritical = pz.diasRestantes <= 3;
  const cliente    = clientePrazo(pz);
  const assunto    = assuntoSecundario(pz, cliente);
  const natureza   = rotuloNatureza(pz);
  const stateClass =
    pz.state === 'alert'  ? styles.pautaItemAlert  :
    pz.state === 'signal' ? styles.pautaItemSignal :
    styles.pautaItemQuiet;

  return (
    <Link href={`/processos/${encodeURIComponent(pz.cnj)}`} className={`${styles.pautaItem} ${stateClass}`}>
      <div className={styles.pautaFatal}>
        <span className={styles.pautaFatalLabel}>prazo fatal</span>
        <span className={`${styles.pautaFatalData} ${diasColorClass(pz.diasRestantes, styles)}`}>
          {fmtDataCurta(fatal)}
        </span>
        <span className={styles.pautaFatalSub}>
          {DAY_NAMES[fatal.getDay()].toLowerCase()} · {pz.diasRestantes}d
        </span>
      </div>

      <div className={styles.pautaBody}>
        <div className={styles.pautaTags}>
          <TribTag label={pz.grau ? `${pz.tribunal}-${pz.grau}` : pz.tribunal} />
          {isCritical && <Seal variant="erro" label="CRÍTICO" />}
        </div>

        {/* Título: o cliente. Subtítulo: o que fazer + a matéria. */}
        <div className={styles.pautaCliente}>{cliente}</div>
        <div className={styles.pautaExpediente}>
          {expedientePrazo(pz)}
          {natureza && (
            <>
              <span className={styles.metaSep} aria-hidden="true"> · </span>
              <span className={styles.pautaNatureza}>prazo para {natureza}</span>
            </>
          )}
          {assunto && (
            <>
              <span className={styles.metaSep} aria-hidden="true"> · </span>
              <span className={styles.pautaAssunto}>{assunto}</span>
            </>
          )}
        </div>

        <div className={styles.pautaMeta}>
          <span className={styles.pautaCnj}>autos nº {pz.cnj}</span>
          {pz.orgaoJulgador !== '—' && (
            <>
              <span className={styles.metaSep} aria-hidden="true">·</span>
              <span className={styles.prazoOrgao}>{pz.orgaoJulgador}</span>
            </>
          )}
        </div>
      </div>

      <span className={styles.pautaGo} aria-hidden="true">→</span>
    </Link>
  );
}

function ListView({ prazos, sort, order }: { prazos: Prazo[]; sort?: string; order?: string }) {
  // A pauta é cronológica; só uma ordenação por data explicitamente decrescente a inverte.
  const desc = order === 'desc' && (sort === 'fatal' || sort === 'pauta');
  const grupos = agruparPorPauta(prazos, desc);

  return (
    <div className={`px-page ${styles.listView}`}>
      <div className={styles.listHeader}>
        <span className={styles.listHeaderLabel}>§ PAUTA DE PRAZOS</span>
        <div className={styles.listDivider} />
        <span className={styles.pautaTotal}>
          {prazos.length} {prazos.length === 1 ? 'prazo' : 'prazos'}
        </span>

      </div>

      <p className={styles.pautaNota}>
        Agrupado pela <strong>data da pauta</strong> — 3 dias antes do prazo fatal, antecipada para a
        sexta quando cai no fim de semana.
      </p>

      {grupos.length === 0 && (
        <div className={styles.emptyState}>Nenhum prazo encontrado com os filtros atuais.</div>
      )}

      {grupos.map(g => {
        const rot = rotuloPauta(g.dias);
        return (
          <section key={g.key} className={styles.pautaGrupo} aria-label={`Pauta de ${fmtDataLonga(g.data)}`}>
            <div className={styles.pautaHead}>
              <span className={`${styles.pautaRel} ${rot.className}`}>{rot.texto}</span>
              <span className={styles.pautaHeadData}>
                {fmtDataLonga(g.data)} — {WEEKDAY_FULL[g.data.getDay()]}
              </span>
              <div className={styles.listDivider} />
              <span className={styles.pautaHeadCount}>
                {g.itens.length} {g.itens.length === 1 ? 'prazo' : 'prazos'}
              </span>
            </div>

            {g.itens.map(pz => <PautaItem key={pz.id} pz={pz} />)}
          </section>
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
            ) : items.map(pz => {
              const titulo = tituloPrazo(pz);
              const parte  = parteSecundaria(pz, titulo);
              return (
              <div
                key={pz.id}
                className={styles.kanbanCard}
                style={{ borderTop: `2px solid ${col.accent}` }}
              >
                <div className={styles.kanbanCardHead}>
                  <TribTag label={pz.tribunal} />
                  <span className={styles.kanbanCardTipo}>{pz.tipo}</span>
                </div>
                {rotuloNatureza(pz) && (
                  <div className={styles.kanbanCardNatureza}>prazo para {rotuloNatureza(pz)}</div>
                )}
                <div className={styles.kanbanCardAssunto}>{titulo}</div>
                {parte && (
                  <div className={styles.kanbanCardParte}>
                    <span className={styles.kanbanCardParteLabel}>Parte</span>
                    <span className={styles.kanbanCardParteNome}>{parte}</span>
                  </div>
                )}
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
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Calendário ──────────────────────────────────────────────────────────────

function AgendaItem({ pz, showDay }: { pz: Prazo; showDay?: number }) {
  const titulo = tituloPrazo(pz);
  const parte  = parteSecundaria(pz, titulo);
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
      <div className={styles.agendaAssunto}>{titulo}</div>
      {rotuloNatureza(pz) && (
        <div className={styles.agendaNatureza}>prazo para {rotuloNatureza(pz)}</div>
      )}
      {parte && (
        <div className={styles.agendaParte}>
          <span className={styles.agendaParteLabel}>Parte</span>
          <span className={styles.agendaParteNome}>{parte}</span>
        </div>
      )}
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

export function PrazosView({
  prazos,
  view,
  sort,
  order,
  criticos,
  pautaAtrasada,
  titularIndisponivel,
}: {
  prazos: Prazo[];
  view: PrazoView;
  sort?: string;
  order?: string;
  /** Contagens já calculadas no servidor sobre o conjunto filtrado. */
  criticos?: number;
  pautaAtrasada?: number;
  /**
   * "Somente do Dr." (o padrão) pedido sem credencial com OAB/CPF cadastrada —
   * a lista veio sem o recorte, com os dois lados.
   */
  titularIndisponivel?: boolean;
}) {
  const now                     = new Date();
  const [calYear, setCalYear]   = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calDay, setCalDay]     = useState<number | null>(now.getDate());

  const criticalCount = criticos ?? prazos.filter(p => p.diasRestantes <= 3).length;
  const atrasadaCount = pautaAtrasada ?? prazos.filter(p => p.diasParaPauta < 0).length;
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
      <div className={styles.exportBar}>
        <ExportPrazosPdfButton prazos={prazos} format="pauta" />
        <ExportPrazosPdfButton prazos={prazos} />
      </div>

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
        {titularIndisponivel && (
          <Alert className={styles.alert}>
            <AlertTitle className={styles.alertCount}>Mostrando os prazos dos dois lados</AlertTitle>
            <AlertDescription className={styles.alertDesc}>
              — o titular é identificado pela OAB e pelo CPF das credenciais; nenhuma cadastrada tem esses dados,
              então não dá para separar só os do Dr.
            </AlertDescription>
          </Alert>
        )}

        {criticalCount > 0 && (
          <Alert className={styles.alert}>
            <AlertTitle className={styles.alertCount}>
              {criticalCount} prazo{criticalCount > 1 ? 's' : ''} crítico{criticalCount > 1 ? 's' : ''}
            </AlertTitle>
            {firstCritical && (
              <AlertDescription className={styles.alertDesc}>
                — {clientePrazo(firstCritical)}: {expedientePrazo(firstCritical)} vence em {firstCritical.diasRestantes} dia{firstCritical.diasRestantes !== 1 ? 's' : ''}
                {atrasadaCount > 0 && ` · ${atrasadaCount} com a pauta em atraso`}
              </AlertDescription>
            )}
          </Alert>
        )}

        {view === 'lista'      && <ListView      prazos={prazos} sort={sort} order={order} />}
        {view === 'kanban'     && <KanbanView     prazos={prazos} />}
        {view === 'calendario' && (
          <CalendarioView prazos={prazos} year={calYear} month={calMonth} selectedDay={calDay} onSelectDay={setCalDay} />
        )}
      </div>
    </div>
  );
}
