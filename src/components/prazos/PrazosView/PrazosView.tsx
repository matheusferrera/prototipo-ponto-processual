'use client';
import { useState } from 'react';
import type { Prazo } from '@/types';
import { DateGroupHeader } from '@/components/ui/DateGroupHeader/DateGroupHeader';
import { Button } from '@/components/ui/button';
import { PrazoRow } from '../PrazoRow/PrazoRow';
import { faixaPrazo, type FaixaPrazo } from '@/lib/prazo-apresentacao';
import styles from './PrazosView.module.css';

export type PrazoView = 'lista' | 'kanban' | 'calendario';

type PrazoComData = Prazo & {
  vencimento: string;
  vencimentoISO: string;
  diasRestantes: number;
};

function temDataDefinida(prazo: Prazo): prazo is PrazoComData {
  return prazo.vencimento !== null
    && prazo.vencimentoISO !== null
    && prazo.diasRestantes !== null;
}

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAY_NAMES   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const WEEKDAY_FULL = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];

function accentColor(p: Prazo) {
  const faixa = faixaPrazo(p);
  if (faixa === 'vencidos' || faixa === 'critico') return 'var(--alert)';
  if (faixa === 'proximos') return 'var(--signal-ink)';
  return 'var(--ink-2)';
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

interface FatalGrupo {
  key: string;
  data: Date;
  /** dias corridos até o prazo fatal */
  dias: number;
  itens: PrazoComData[];
}

/** Preserva a ordem de `prazos` dentro de cada grupo, respeitando o sort escolhido. */
/**
 * Agrupa por data de vencimento **preservando a ordem que a lista já tem**.
 *
 * Até 07/09/2026 esta função reordenava os grupos por data
 * (`a.localeCompare(b)`), e isso jogava fora a ordem construída em
 * `sortPrazos`: a vencer primeiro, depois o vencido mais recente. O sintoma
 * aparecia ao revelar os vencidos — em vez de a lista CONTINUAR para baixo, o
 * grupo mais antigo (2020) pulava para o topo e empurrava o que vence amanhã
 * para o fim.
 *
 * `Map` preserva a ordem de inserção, então percorrer o array já ordenado e
 * agrupar na chegada é o bastante: o primeiro grupo é o da primeira linha, o
 * último é o da última. A direção `asc`/`desc` continua sendo decidida em
 * `sortPrazos`, um lugar só — que é o motivo de o parâmetro `desc` ter saído
 * daqui.
 */
function agruparPorFatal(prazos: PrazoComData[]): FatalGrupo[] {
  const mapa = new Map<string, PrazoComData[]>();
  for (const pz of prazos) {
    const atual = mapa.get(pz.vencimentoISO);
    if (atual) atual.push(pz);
    else mapa.set(pz.vencimentoISO, [pz]);
  }

  return [...mapa.entries()].map(([key, itens]) => ({
    key,
    data: parseISODate(key),
    dias: itens[0].diasRestantes,
    itens,
  }));
}

function ListView({ prazos, sort, hasSemData = false }: {
  prazos: PrazoComData[]; sort?: string; hasSemData?: boolean;
}) {
  if (!prazos.length) return !hasSemData ? <p className={styles.emptyState}>Nenhum prazo encontrado com os filtros atuais.</p> : null;
  // Ordenação por cliente, expediente ou tribunal deve manter a ordem recebida.
  if (sort && sort !== 'fatal') return (
    <div className={styles.listView}>
      {prazos.map(p => <PrazoRow key={p.id} prazo={p} />)}
    </div>
  );
  const grupos = agruparPorFatal(prazos);
  return (
    <div className={styles.listView}>
      {grupos.map(g => (
        <section key={g.key} className={styles.pautaGrupo} aria-label={`Vencimento em ${fmtDataLonga(g.data)}`}>
          <DateGroupHeader
            date={fmtDataLonga(g.data)}
            day={WEEKDAY_FULL[g.data.getDay()]}
            dateTime={g.key}
            count={`${g.itens.length} ${g.itens.length === 1 ? 'prazo' : 'prazos'}`}
          />
          {g.itens.map(p => <PrazoRow key={p.id} prazo={p} />)}
        </section>
      ))}
    </div>
  );
}

const KANBAN_COLS: { key: FaixaPrazo; label: string }[] = [
  { key: 'vencidos', label: 'Vencidos' },
  { key: 'critico', label: 'Até 3 dias' },
  { key: 'proximos', label: 'De 4 a 7 dias' },
  { key: 'atencao', label: 'De 8 a 14 dias' },
  { key: 'posteriores', label: 'Após 14 dias' },
  { key: 'encerrados', label: 'Encerrados' },
];

function KanbanView({ prazos }: { prazos: PrazoComData[] }) {
  const colunas = KANBAN_COLS.filter(col => !['vencidos', 'encerrados'].includes(col.key) || prazos.some(p => faixaPrazo(p) === col.key));
  return (
    <div className={styles.kanbanWrap}>
      {colunas.map(col => {
        const items = prazos.filter(p => faixaPrazo(p) === col.key);
        return (
          <section key={col.key} className={styles.kanbanCol} aria-label={col.label}>
            <div className={styles.kanbanColHead} data-faixa={col.key}>
              <h2>{col.label}</h2><span>{items.length}</span>
            </div>
            {items.length ? items.map(p => <PrazoRow key={p.id} prazo={p} compacto />) : <p className={styles.kanbanEmpty}>Nenhum prazo nesta faixa.</p>}
          </section>
        );
      })}
    </div>
  );
}

function CalendarioView({
  prazos, year, month, selectedDay, onSelectDay,
}: {
  prazos: PrazoComData[];
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
  const inMonth: { day: number; pz: PrazoComData }[] = [];
  for (const pz of prazos) {
    const v = parseVencISO(pz.vencimentoISO);
    if (v.year === year && v.month === month) inMonth.push({ day: v.day, pz });
  }
  inMonth.sort((a, b) => a.day - b.day);

  const byDay: Record<number, PrazoComData[]> = {};
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
                  <span key={pz.id} className={styles.calDot} style={{ background: accentColor(pz) }} />
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
              <span className={styles.agendaHeadLabel}>{selectedWeekday}, {selectedDay} de {MONTH_NAMES[month - 1]}</span>
              <div className={styles.listDivider} />
              <button type="button" className={styles.agendaClear} onClick={() => onSelectDay(null)}>
                Ver mês inteiro
              </button>
            </div>
            {dayItems.length === 0 ? (
              <div className={styles.agendaEmpty}>Nenhum prazo neste dia.</div>
            ) : dayItems.map(pz => <PrazoRow key={pz.id} prazo={pz} />)}
          </>
        ) : (
          <>
            <div className={styles.agendaHead}>
              <span className={styles.agendaHeadLabel}>Prazos de {MONTH_NAMES[month - 1]}</span>
              <div className={styles.listDivider} />
            </div>
            {inMonth.length === 0 ? (
              <div className={styles.agendaEmpty}>Nenhum prazo em {MONTH_NAMES[month - 1]} de {year}.</div>
            ) : inMonth.map(({ pz }) => <PrazoRow key={pz.id} prazo={pz} />)}
          </>
        )}
      </section>
    </div>
  );
}

function ExpedientesSemData({ prazos }: { prazos: Prazo[] }) {
  if (!prazos.length) return null;
  return (
    <section className={styles.semDataSection} aria-labelledby="expedientes-sem-data-title">
      <div className={styles.semDataHeader}>
        <h2 id="expedientes-sem-data-title">Sem data definida</h2>
        <span>{prazos.length} {prazos.length === 1 ? 'expediente' : 'expedientes'}</span>
      </div>
      <p className={styles.semDataNote}>Não há data de vencimento informada para estes expedientes.</p>
      {prazos.map(p => <PrazoRow key={p.id} prazo={p} />)}
    </section>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function PrazosView({
  prazos,
  view,
  sort,
}: {
  prazos: Prazo[];
  view: PrazoView;
  /**
   * Só para saber se a lista está agrupada por vencimento (`fatal`) ou numa
   * ordem alfabética que deve ser respeitada como veio. A DIREÇÃO (`asc`/`desc`)
   * não chega aqui: ela já foi aplicada em `sortPrazos`, no servidor, e ter os
   * dois lugares decidindo ordem foi o que fez o grupo de 2020 subir ao topo
   * quando os vencidos eram revelados.
   */
  sort?: string;
}) {
  const now                     = new Date();
  const [calYear, setCalYear]   = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calDay, setCalDay]     = useState<number | null>(now.getDate());

  const prazosComData = prazos.filter(temDataDefinida);
  const prazosSemData = prazos.filter(prazo => !temDataDefinida(prazo));
  const criticalCount = prazosComData.filter(p => faixaPrazo(p) === 'critico').length;
  const overdueCount = prazosComData.filter(p => faixaPrazo(p) === 'vencidos').length;

  /* **A lista abre no que está por vencer; o que passou fica atrás de um
     botão.** A agenda deixou de cortar por data em 07/09/2026, e numa conta
     real isso é 313 vencidos e 175 encerrados contra 12 a vencer — despejados
     de uma vez, eles afogam justamente o que a tela existe para mostrar.
     Esconder não é o mesmo que cortar: eles ESTÃO carregados, o contador do
     resumo já os conta, e um clique os revela.

     Só na visão de LISTA. O kanban tem coluna própria para *Vencidos* e
     *Encerrados* e o calendário os põe nos meses passados — nesses dois, a
     separação já é a estrutura da tela. */
  const passados = new Set(['vencidos', 'encerrados']);
  const jaVencidos = prazosComData.filter(prazo => passados.has(faixaPrazo(prazo)));
  const aVencer = prazosComData.filter(prazo => !passados.has(faixaPrazo(prazo)));
  const [mostrarVencidos, setMostrarVencidos] = useState(false);
  const listaVisivel = mostrarVencidos ? prazosComData : aVencer;

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
        <div className={styles.resumo} aria-label="Resumo dos prazos filtrados">
          <span><strong>{prazos.length}</strong> {prazos.length === 1 ? 'expediente no recorte' : 'expedientes no recorte'}</span>
          {criticalCount > 0 && <span className={styles.resumoUrgente}><strong>{criticalCount}</strong> com vencimento em até 3 dias</span>}
          {overdueCount > 0 && <span className={styles.resumoUrgente}><strong>{overdueCount}</strong> {overdueCount === 1 ? 'vencido' : 'vencidos'}</span>}
          {prazosSemData.length > 0 && <span><strong>{prazosSemData.length}</strong> sem data definida</span>}
        </div>

        {view === 'lista'      && <ListView      prazos={listaVisivel} sort={sort} hasSemData={prazosSemData.length > 0} />}

        {view === 'lista' && jaVencidos.length > 0 && (
          <div className={styles.maisVencidos}>
            <Button
              variant="outline"
              onClick={() => setMostrarVencidos(atual => !atual)}
              aria-expanded={mostrarVencidos}
              className="border-[var(--line)] text-[var(--ink-2)] max-md:h-11"
            >
              {mostrarVencidos
                ? 'Ocultar expedientes vencidos'
                : `Mostrar expedientes vencidos (${jaVencidos.length})`}
            </Button>
          </div>
        )}
        {view === 'kanban'     && <KanbanView     prazos={prazosComData} />}
        {view === 'calendario' && (
          <CalendarioView prazos={prazosComData} year={calYear} month={calMonth} selectedDay={calDay} onSelectDay={setCalDay} />
        )}

        <ExpedientesSemData prazos={prazosSemData} />
      </div>
    </div>
  );
}
