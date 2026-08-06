'use client';

import { Fragment, useMemo, useState, useTransition, useEffect } from 'react';
import { Search, AlertTriangle, Activity, CircleOff } from 'lucide-react';
import type { TribunalStatusItem, TribunalHealthStatus } from '@/types';
import { agruparPorTribunal } from '@/lib/tribunal-status';
import styles from './StatusPageContent.module.css';

interface StatusPageContentProps {
  initialTribunals: TribunalStatusItem[];
  /** true quando a consulta ao backend falhou — a tabela não mostra números inventados. */
  initialUnavailable?: boolean;
  pageInfo?: React.ReactNode;
}

const STATUS_LABEL: Record<TribunalHealthStatus, string> = {
  operacional: 'Operacional',
  sincronizando: 'Varredura em andamento',
  atencao: 'Atenção',
  erro: 'Com falhas',
  nao_configurado: 'Sem credencial',
};

const STATUS_CLASS: Record<TribunalHealthStatus, string> = {
  operacional: styles.statusOperacional,
  sincronizando: styles.statusSincronizando,
  atencao: styles.statusAtencao,
  erro: styles.statusErro,
  nao_configurado: styles.statusNaoConfigurado,
};

function relativeTime(isoDate: string | null): string {
  if (!isoDate) return 'Nunca sincronizado';
  const date = new Date(isoDate);
  const diffMin = Math.floor((Date.now() - date.getTime()) / (1000 * 60));

  if (diffMin < 1) return 'há poucos segundos';
  if (diffMin === 1) return 'há 1 minuto';
  if (diffMin < 60) return `há ${diffMin} minutos`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours === 1) return 'há 1 hora';
  if (diffHours < 24) return `há ${diffHours} horas`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'há 1 dia';
  return `há ${diffDays} dias`;
}

/** Uma varredura leva dezenas de segundos; "54177ms" não se lê de relance. */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${Math.round(seconds % 60)}s`;
}

function absoluteTime(isoDate: string | null): string {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function StatusPageContent({
  initialTribunals,
  initialUnavailable = false,
  pageInfo,
}: StatusPageContentProps) {
  const [tribunals, setTribunals] = useState<TribunalStatusItem[]>(initialTribunals);
  const [unavailable, setUnavailable] = useState(initialUnavailable);
  const [filterEsfera, setFilterEsfera] = useState<'TODOS' | 'Federal' | 'Estadual' | 'ALERTAS'>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [, startTransition] = useTransition();

  // Polling silencioso a cada 30s. Se o backend cair, a tabela passa a declarar
  // que o status está indisponível em vez de continuar exibindo dados velhos
  // como se fossem atuais.
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/status-tribunais');
        if (!res.ok) {
          setUnavailable(true);
          return;
        }
        const data = await res.json();
        if (Array.isArray(data.tribunals)) {
          setTribunals(data.tribunals);
          setUnavailable(false);
        }
      } catch {
        setUnavailable(true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Uma linha por tribunal: 1º e 2º grau moram na mesma linha, cada um com seu
  // status. Os graus continuam sendo a unidade de medida do backend.
  const grupos = useMemo(() => agruparPorTribunal(tribunals), [tribunals]);

  const filteredTribunals = grupos.filter(g => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      g.codigo.toLowerCase().includes(q) ||
      g.nome.toLowerCase().includes(q) ||
      g.uf.toLowerCase().includes(q) ||
      g.graus.some(t => t.codigo.toLowerCase().includes(q) || t.nome.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (filterEsfera === 'Federal') return g.esfera === 'Federal';
    if (filterEsfera === 'Estadual') return g.esfera === 'Estadual';
    if (filterEsfera === 'ALERTAS') return g.status === 'atencao' || g.status === 'erro';

    return true;
  });

  // Varredura é por grau — duas varreduras do mesmo tribunal são duas varreduras.
  const sincronizandoCount = tribunals.filter(t => t.status === 'sincronizando').length;
  const alertasCount = grupos.filter(g => g.status === 'atencao' || g.status === 'erro').length;

  const lastSyncOverall = tribunals.reduce<string | null>((best, t) => {
    if (!t.lastSyncAt) return best;
    return !best || t.lastSyncAt > best ? t.lastSyncAt : best;
  }, null);

  return (
    <div className={styles.container}>
      {pageInfo}

      <div className={styles.controlsBar}>
        <div className={styles.filterGroup}>
          <button
            onClick={() => startTransition(() => setFilterEsfera('TODOS'))}
            className={`${styles.filterBtn} ${filterEsfera === 'TODOS' ? styles.filterBtnActive : ''}`}
          >
            Todos ({grupos.length})
          </button>
          <button
            onClick={() => startTransition(() => setFilterEsfera('Federal'))}
            className={`${styles.filterBtn} ${filterEsfera === 'Federal' ? styles.filterBtnActive : ''}`}
          >
            Federal ({grupos.filter(g => g.esfera === 'Federal').length})
          </button>
          <button
            onClick={() => startTransition(() => setFilterEsfera('Estadual'))}
            className={`${styles.filterBtn} ${filterEsfera === 'Estadual' ? styles.filterBtnActive : ''}`}
          >
            Estadual ({grupos.filter(g => g.esfera === 'Estadual').length})
          </button>
          <button
            onClick={() => startTransition(() => setFilterEsfera('ALERTAS'))}
            className={`${styles.filterBtn} ${filterEsfera === 'ALERTAS' ? styles.filterBtnActive : ''}`}
          >
            Alertas ({alertasCount})
          </button>
        </div>

        <div className={styles.actionGroup}>
          {/* Reflete o que os dados dizem, não um estado fixo de "robô ativo". */}
          {sincronizandoCount > 0 ? (
            <div className={styles.autoBadge}>
              <Activity size={13} className={styles.pulseIcon} />
              <span>
                {sincronizandoCount === 1
                  ? '1 varredura em andamento'
                  : `${sincronizandoCount} varreduras em andamento`}
              </span>
            </div>
          ) : (
            <div className={styles.idleBadge}>
              <CircleOff size={13} />
              <span>
                {lastSyncOverall
                  ? `Sem varredura ativa · última ${relativeTime(lastSyncOverall)}`
                  : 'Sem varredura ativa'}
              </span>
            </div>
          )}

          <div className={styles.searchBox}>
            <Search size={14} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar por tribunal, sigla ou UF..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>
      </div>

      {unavailable && (
        <div className={styles.unavailableBanner}>
          <AlertTriangle size={16} />
          <span>
            Não foi possível consultar o status dos tribunais. Os dados abaixo podem estar
            desatualizados ou ausentes.
          </span>
        </div>
      )}

      {filteredTribunals.length === 0 ? (
        <div className={styles.emptyState}>
          <AlertTriangle size={32} />
          <strong>
            {tribunals.length === 0 ? 'Status indisponível' : 'Nenhum tribunal encontrado'}
          </strong>
          <p>
            {tribunals.length === 0
              ? 'Nenhum dado de status foi retornado pelo servidor.'
              : `Nenhum resultado corresponde aos filtros aplicados (${searchQuery || filterEsfera}).`}
          </p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thTribunal}>Tribunal</th>
                <th>Sistema</th>
                <th>Status</th>
                <th className={styles.thNum}>Processos</th>
                <th className={styles.thNum}>Sucesso 24h</th>
                {/* Não é latência de rede: é quanto tempo cada varredura levou. */}
                <th className={styles.thNum} title="Duração média de uma varredura nas últimas 24h">
                  Duração média
                </th>
                <th>Última sincronização</th>
              </tr>
            </thead>
            <tbody>
              {filteredTribunals.map(tribunal => (
                <Fragment key={tribunal.id}>
                  <tr className={styles.row}>
                    <td className={styles.tdTribunal}>
                      <span className={styles.courtCode}>{tribunal.codigo}</span>
                      <span className={styles.courtName}>{tribunal.nome}</span>
                      <span className={styles.esferaTag}>
                        {tribunal.uf} • {tribunal.esfera}
                      </span>
                    </td>

                    <td>
                      <span className={styles.sistemaTag}>{tribunal.sistema}</span>
                    </td>

                    {/* Um pill por grau, na mesma linha do tribunal. */}
                    <td>
                      <div className={styles.statusStack}>
                        {tribunal.graus.map(grau => (
                          <div key={grau.id} className={styles.statusEntry}>
                            {grau.grauLabel && (
                              <span className={styles.grauLabel}>{grau.grauLabel}</span>
                            )}
                            <span className={`${styles.statusPill} ${STATUS_CLASS[grau.status]}`}>
                              <span className={`${styles.dot} ${STATUS_CLASS[grau.status]}`} />
                              {STATUS_LABEL[grau.status]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className={styles.tdNum}>{tribunal.activeProcessesCount}</td>

                    <td className={styles.tdNum}>
                      {tribunal.successRate === null ? (
                        <span className={styles.noData} title="Nenhuma execução nas últimas 24h">
                          —
                        </span>
                      ) : (
                        <>
                          {tribunal.successRate}%
                          {typeof tribunal.totalJobsLast24h === 'number' && (
                            <span className={styles.numHint}>
                              {tribunal.successJobsLast24h}/{tribunal.totalJobsLast24h}
                            </span>
                          )}
                        </>
                      )}
                    </td>

                    <td className={styles.tdNum}>
                      {tribunal.latencyMs === null ? (
                        <span className={styles.noData} title="Sem medição no período">
                          —
                        </span>
                      ) : (
                        formatDuration(tribunal.latencyMs)
                      )}
                    </td>

                    <td className={styles.tdSync}>
                      <span className={styles.timeRelative}>{relativeTime(tribunal.lastSyncAt)}</span>
                      <span className={styles.timeAbsolute}>{absoluteTime(tribunal.lastSyncAt)}</span>
                    </td>
                  </tr>

                  {/* Erro em aberto pesa como alerta; falha já superada por um
                      sucesso posterior é só o histórico que explica a taxa. O grau
                      é nomeado: o erro é de um grau, não do tribunal inteiro. */}
                  {tribunal.graus.map(grau =>
                    grau.lastError ? (
                      <tr key={`${grau.id}-erro`} className={styles.errorRow}>
                        <td colSpan={7}>
                          <span className={styles.errorLabel}>
                            Erro em aberto{grau.grauLabel ? ` · ${grau.grauLabel} grau` : ''}
                          </span>
                          <span className={styles.errorText}>{grau.lastError}</span>
                        </td>
                      </tr>
                    ) : grau.lastFailure ? (
                      <tr key={`${grau.id}-falha`} className={styles.pastFailureRow}>
                        <td colSpan={7}>
                          <span className={styles.pastFailureLabel}>
                            Última falha{grau.grauLabel ? ` · ${grau.grauLabel} grau` : ''}
                            {grau.lastFailureAt ? ` · ${relativeTime(grau.lastFailureAt)}` : ''}
                            {' · '}já recuperado
                          </span>
                          <span className={styles.pastFailureText}>{grau.lastFailure}</span>
                        </td>
                      </tr>
                    ) : null,
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
