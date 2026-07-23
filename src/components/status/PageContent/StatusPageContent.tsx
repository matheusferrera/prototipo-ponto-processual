'use client';

import { useState, useTransition, useEffect } from 'react';
import { Search, AlertTriangle, Activity, Clock } from 'lucide-react';
import type { TribunalStatusItem } from '@/types';
import styles from './StatusPageContent.module.css';

interface StatusPageContentProps {
  initialTribunals: TribunalStatusItem[];
  pageInfo?: React.ReactNode;
}

export function StatusPageContent({ initialTribunals, pageInfo }: StatusPageContentProps) {
  const [tribunals, setTribunals] = useState<TribunalStatusItem[]>(initialTribunals);
  const [filterEsfera, setFilterEsfera] = useState<'TODOS' | 'Federal' | 'Estadual' | 'ALERTAS'>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastAutoUpdate, setLastAutoUpdate] = useState<Date>(new Date());
  const [, startTransition] = useTransition();

  // Automatic silent polling to fetch updated status every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/status-tribunais');
        if (res.ok) {
          const data = await res.json();
          if (data.tribunals) {
            setTribunals(data.tribunals);
            setLastAutoUpdate(new Date());
          }
        }
      } catch {
        // silent auto update error catch
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const filteredTribunals = tribunals.filter(t => {
    const matchesSearch =
      t.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.uf.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterEsfera === 'Federal') return t.esfera === 'Federal';
    if (filterEsfera === 'Estadual') return t.esfera === 'Estadual';
    if (filterEsfera === 'ALERTAS') return t.status === 'atencao' || t.status === 'erro';

    return true;
  });

  // Calculate relative time string helper
  const getRelativeTime = (isoDate: string | null) => {
    if (!isoDate) return 'Nunca sincronizado';
    const date = new Date(isoDate);
    const diffMin = Math.floor((Date.now() - date.getTime()) / (1000 * 60));

    if (diffMin < 1) return 'há poucos segundos';
    if (diffMin === 1) return 'há 1 minuto';
    if (diffMin < 60) return `há ${diffMin} minutos`;

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours === 1) return 'há 1 hora';
    if (diffHours < 24) return `há ${diffHours} horas`;

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.container}>
      {pageInfo}

      <div className={styles.controlsBar}>
        <div className={styles.filterGroup}>
          <button
            onClick={() => startTransition(() => setFilterEsfera('TODOS'))}
            className={`${styles.filterBtn} ${filterEsfera === 'TODOS' ? styles.filterBtnActive : ''}`}
          >
            Todos ({tribunals.length})
          </button>
          <button
            onClick={() => startTransition(() => setFilterEsfera('Federal'))}
            className={`${styles.filterBtn} ${filterEsfera === 'Federal' ? styles.filterBtnActive : ''}`}
          >
            Federal ({tribunals.filter(t => t.esfera === 'Federal').length})
          </button>
          <button
            onClick={() => startTransition(() => setFilterEsfera('Estadual'))}
            className={`${styles.filterBtn} ${filterEsfera === 'Estadual' ? styles.filterBtnActive : ''}`}
          >
            Estadual ({tribunals.filter(t => t.esfera === 'Estadual').length})
          </button>
          <button
            onClick={() => startTransition(() => setFilterEsfera('ALERTAS'))}
            className={`${styles.filterBtn} ${filterEsfera === 'ALERTAS' ? styles.filterBtnActive : ''}`}
          >
            Alertas ({tribunals.filter(t => t.status === 'atencao' || t.status === 'erro').length})
          </button>
        </div>

        <div className={styles.actionGroup}>
          <div className={styles.autoBadge}>
            <Activity size={13} className={styles.pulseIcon} />
            <span>Sincronização Automática Ativa (Robô PJe)</span>
          </div>

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

      {filteredTribunals.length === 0 ? (
        <div className={styles.emptyState}>
          <AlertTriangle size={32} />
          <strong>Nenhum tribunal encontrado</strong>
          <p>Nenhum resultado corresponde aos filtros aplicados ({searchQuery || filterEsfera}).</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredTribunals.map(tribunal => {
            return (
              <div
                key={tribunal.id}
                className={`${styles.card} ${
                  tribunal.status === 'operacional'
                    ? styles.cardOperacional
                    : tribunal.status === 'sincronizando'
                    ? styles.cardSincronizando
                    : tribunal.status === 'atencao'
                    ? styles.cardAtencao
                    : styles.cardErro
                }`}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.courtIdentity}>
                    <div className={styles.codeRow}>
                      <span className={styles.courtCode}>{tribunal.codigo}</span>
                      <span className={styles.esferaTag}>{tribunal.uf} • {tribunal.esfera}</span>
                    </div>
                    <span className={styles.courtName}>{tribunal.nome}</span>
                  </div>

                  <span
                    className={`${styles.statusPill} ${
                      tribunal.status === 'operacional'
                        ? styles.statusPillOperacional
                        : tribunal.status === 'sincronizando'
                        ? styles.statusPillSincronizando
                        : tribunal.status === 'atencao'
                        ? styles.statusPillAtencao
                        : styles.statusPillErro
                    }`}
                  >
                    <span
                      className={`${styles.dot} ${
                        tribunal.status === 'operacional'
                          ? styles.dotOperacional
                          : tribunal.status === 'sincronizando'
                          ? styles.dotSincronizando
                          : tribunal.status === 'atencao'
                          ? styles.dotAtencao
                          : styles.dotErro
                      }`}
                    />
                    {tribunal.status === 'operacional' && 'Operacional'}
                    {tribunal.status === 'sincronizando' && 'Varredura em andamento'}
                    {tribunal.status === 'atencao' && 'Atenção'}
                    {tribunal.status === 'erro' && 'Indisponível'}
                  </span>
                </div>

                <div className={styles.cardMetrics}>
                  <div className={styles.metricCell}>
                    <span className={styles.metricLabel}>Processos</span>
                    <span className={styles.metricValue}>{tribunal.activeProcessesCount}</span>
                  </div>
                  <div className={styles.metricCell}>
                    <span className={styles.metricLabel}>Sucesso %</span>
                    <span className={styles.metricValue}>{tribunal.successRate}%</span>
                  </div>
                  <div className={styles.metricCell}>
                    <span className={styles.metricLabel}>Latência</span>
                    <span className={styles.metricValue}>{tribunal.latencyMs}ms</span>
                  </div>
                </div>

                {tribunal.lastError && (
                  <div className={styles.errorBanner}>
                    <strong>Aviso de Monitoramento:</strong> {tribunal.lastError}
                  </div>
                )}

                <div className={styles.timeRow}>
                  <span className={styles.timeLabel}>Última Sincronização Automática</span>
                  <div className={styles.timeValue}>
                    <span className={styles.timeRelative}>{getRelativeTime(tribunal.lastSyncAt)}</span>
                    <span style={{ fontSize: '11px', opacity: 0.8 }}>
                      {tribunal.lastSyncAt
                        ? new Date(tribunal.lastSyncAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </span>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.sistemaTag}>Motor: {tribunal.sistema}</span>
                  <span className={styles.autoTag}>
                    <Clock size={11} /> Varredura automática
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
