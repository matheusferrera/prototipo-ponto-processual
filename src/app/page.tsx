import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, RefreshCw, Scale } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { getProcessos, getMovimentacoes, getPrazos, getScraperSecrets } from '@/lib/api.server';
import { tituloPrazo } from '@/lib/prazo';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { Seal } from '@/components/ui/Seal/Seal';
import { StatusDot } from '@/components/ui/StatusDot/StatusDot';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Dashboard — Ponto Processual',
  description: 'Visão geral da carteira.',
};

export default async function DashboardPage() {
  const [{ processos }, { groups: movimentacoes, newToday }, { prazos }, secrets] = await Promise.all([
    getProcessos(),
    getMovimentacoes(1, 50),
    getPrazos(),
    getScraperSecrets(),
  ]);
  const semCredenciais = secrets.length === 0;
  const sincronizandoPelaPrimeiraVez = !semCredenciais && processos.length === 0;
  const allMovs = movimentacoes.flatMap(g => g.items);
  const movsHoje = movimentacoes.find(g => g.date === 'HOJE')?.items ?? [];
  const novasHoje = newToday;
  const prazosCriticos = prazos.filter(p => p.diasRestantes !== null && p.diasRestantes <= 3);
  const prazosOrdenados = [...prazos].sort((a, b) => {
    if (a.diasRestantes === null && b.diasRestantes === null) return 0;
    if (a.diasRestantes === null) return 1;
    if (b.diasRestantes === null) return -1;
    return a.diasRestantes - b.diasRestantes;
  });
  const processosAlert = processos.filter(p => p.state === 'alert').length;
  const processosSignal = processos.filter(p => p.state === 'signal').length;
  const processosQuiet = processos.filter(p => p.state === 'quiet').length;
  const whatsAtivos = processos.filter(p => p.whatsEnabled).length;

  return (
    <AppLayout active="Dashboard" mobileTitle="Dashboard" mobileBreadcrumb="Início / Dashboard">
      {/* Topbar */}
      <div
        className={styles.topbar}
        style={{
          borderBottom: '1px solid var(--line)',
          background: 'var(--paper)',
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1 }}>
          <div className={styles.topbarTitle}>Dashboard</div>
          <div className={styles.topbarBreadcrumb}>Início / Dashboard</div>
        </div>
        {!semCredenciais && !sincronizandoPelaPrimeiraVez && (
          <div
            className={styles.syncBadge}
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: 'var(--quiet)',
              background: 'var(--quiet-soft)',
              padding: '4px 12px',
              border: '1px solid var(--quiet)',
              flexShrink: 0,
            }}
          >
            ● SINCRONIZADO · há 12 min
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {semCredenciais ? (
          <DashboardEmptyState variant="no-credentials" />
        ) : sincronizandoPelaPrimeiraVez ? (
          <DashboardEmptyState variant="syncing" />
        ) : (
        <>
        {/* Alerta crítico */}
        {prazosCriticos.length > 0 && (
          <div
            className={styles.dashAlert}
            style={{
              background: 'var(--alert-soft)',
              borderLeft: '3px solid var(--alert)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--alert)', flexShrink: 0 }}>
              {prazosCriticos.length} prazo{prazosCriticos.length > 1 ? 's' : ''} crítico{prazosCriticos.length > 1 ? 's' : ''}
            </span>
            <span className={styles.dashAlertPart} style={{ fontSize: 13, color: 'var(--ink-2)' }}>
              — {tituloPrazo(prazosCriticos[0])} vence em {prazosCriticos[0].diasRestantes} dia{prazosCriticos[0].diasRestantes !== 1 ? 's' : ''}
            </span>
            <Link
              href="/prazos"
              style={{ marginLeft: 'auto', fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 12, color: 'var(--alert)', textDecoration: 'none', flexShrink: 0 }}
            >
              Ver prazos →
            </Link>
          </div>
        )}

        {/* Stat cards */}
        <div
          className={styles.statCards}
          style={{
            display: 'flex',
            border: '1px solid var(--line)',
            background: 'var(--paper)',
          }}
        >
          {[
            {
              label: 'Processos monitorados',
              value: processos.length,
              sub: `${whatsAtivos} com WhatsApp ativo`,
              color: 'var(--ink)',
              href: '/processos',
            },
            {
              label: 'Movimentações hoje',
              value: movsHoje.length,
              sub: `${novasHoje} nova${novasHoje !== 1 ? 's' : ''}`,
              color: novasHoje > 0 ? 'var(--brick)' : 'var(--ink)',
              href: '/movimentacoes',
            },
            {
              label: 'Prazos ativos',
              value: prazos.length,
              sub: `${prazos.filter(p => p.diasRestantes !== null && p.diasRestantes <= 7).length} vencem em ≤ 7 dias`,
              color: 'var(--ink)',
              href: '/prazos',
            },
            {
              label: 'Críticos',
              value: prazosCriticos.length,
              sub: prazosCriticos[0]
                ? `${tituloPrazo(prazosCriticos[0]).split(' ')[0]} · ${prazosCriticos[0].diasRestantes}d`
                : 'nenhum',
              color: prazosCriticos.length > 0 ? 'var(--alert)' : 'var(--quiet)',
              href: '/prazos',
            },
          ].map((card, i) => (
            <Link
              key={i}
              href={card.href}
              className={styles.statCard}
            >
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)', marginBottom: 8 }}>
                {card.label}
              </div>
              <div className={styles.statNum} style={{ color: card.color }}>
                {card.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 10 }}>{card.sub}</div>
            </Link>
          ))}
        </div>

        {/* Grade principal */}
        <div
          className={styles.dashGrid}
          style={{
            display: 'grid',
            alignItems: 'start',
          }}
        >
          {/* Movimentações recentes */}
          <div style={{ border: '1px solid var(--line)', background: 'var(--paper)' }}>
            <div
              className={styles.panelHead}
              style={{
                borderBottom: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--brick)', letterSpacing: '0.05em' }}>
                § MOVIMENTAÇÕES RECENTES
              </span>
              <Link href="/movimentacoes" style={{ fontSize: 11, color: 'var(--ink-3)', textDecoration: 'none', fontWeight: 600 }}>
                Ver todas →
              </Link>
            </div>

            {allMovs.slice(0, 5).map((mov, i) => (
              <div
                key={mov.id}
                className={styles.movRow}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: i < 4 ? '1px solid var(--line-soft)' : 'none',
                  background:
                    mov.state === 'signal'
                      ? 'var(--brick-soft)'
                      : mov.state === 'alert'
                      ? 'var(--alert-soft)'
                      : 'transparent',
                }}
              >
                <StatusDot state={mov.state} />
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', minWidth: 36 }}>
                  {mov.time}
                </div>
                <TribTag label={mov.tribunal} />
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--ink-2)',
                    flex: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {mov.parte}
                </div>
                <span
                  className={styles.movTipo}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--ink-3)',
                    flexShrink: 0,
                  }}
                >
                  {mov.tipo}
                </span>
                {mov.state === 'signal' && <Seal variant="nova" />}
                {mov.state === 'alert' && <Seal variant="erro" />}
              </div>
            ))}
          </div>

          {/* Coluna direita */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Prazos */}
            <div style={{ border: '1px solid var(--line)', background: 'var(--paper)' }}>
              <div
                className={styles.panelHead}
                style={{
                  borderBottom: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--brick)', letterSpacing: '0.05em' }}>
                  § PRAZOS
                </span>
                <Link href="/prazos" style={{ fontSize: 11, color: 'var(--ink-3)', textDecoration: 'none', fontWeight: 600 }}>
                  Ver todos →
                </Link>
              </div>

              {prazosOrdenados.map((pz, i) => {
                const semData = pz.diasRestantes === null;
                const isCrit = pz.diasRestantes !== null && pz.diasRestantes <= 3;
                const isUrg = pz.diasRestantes !== null && pz.diasRestantes <= 7;
                return (
                  <div
                    key={pz.id}
                    className={styles.prazoRow}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      borderBottom: i < prazosOrdenados.length - 1 ? '1px solid var(--line-soft)' : 'none',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--mono)',
                        fontWeight: 700,
                        fontSize: 18,
                        lineHeight: 1,
                        color: isCrit ? 'var(--alert)' : isUrg ? 'var(--brick)' : 'var(--ink-3)',
                        minWidth: 36,
                        textAlign: 'right',
                      }}
                    >
                      {semData ? '—' : `${pz.diasRestantes}d`}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {pz.parte}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>
                        {pz.tipo} · {pz.vencimento ?? 'sem prazo definido'}
                      </div>
                    </div>
                    <TribTag label={pz.tribunal} />
                  </div>
                );
              })}
            </div>

            {/* Estado da carteira */}
            <div style={{ border: '1px solid var(--line)', background: 'var(--paper)' }}>
              <div className={styles.panelHead} style={{ borderBottom: '1px solid var(--line)' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--brick)', letterSpacing: '0.05em' }}>
                  § CARTEIRA
                </span>
              </div>
              <div className={styles.carteiraBody} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Novidade', count: processosSignal, color: 'var(--brick)' },
                  { label: 'Monitorado', count: processosQuiet, color: 'var(--quiet)' },
                  { label: 'Erro', count: processosAlert, color: 'var(--alert)' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', width: 72 }}>{row.label}</div>
                    <div style={{ flex: 1, height: 6, background: 'var(--paper-2)', position: 'relative' }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          height: '100%',
                          width: `${(row.count / processos.length) * 100}%`,
                          background: row.color,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--mono)',
                        fontWeight: 700,
                        fontSize: 13,
                        color: row.color,
                        width: 16,
                        textAlign: 'right',
                      }}
                    >
                      {row.count}
                    </div>
                  </div>
                ))}
                <div
                  style={{
                    marginTop: 4,
                    paddingTop: 10,
                    borderTop: '1px solid var(--line-soft)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>WhatsApp ativo</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--quiet)' }}>
                    {whatsAtivos}/{processos.length}
                  </span>
                </div>
              </div>
              <Link
                href="/processos"
                style={{
                  display: 'block',
                  padding: '10px 20px',
                  borderTop: '1px solid var(--line-soft)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--ink-3)',
                  textDecoration: 'none',
                }}
              >
                Ver todos os processos →
              </Link>
            </div>
          </div>
        </div>
        </>
        )}
      </div>
    </AppLayout>
  );
}

function DashboardEmptyState({ variant }: { variant: 'no-credentials' | 'syncing' }) {
  if (variant === 'syncing') {
    return (
      <div className={styles.dashEmpty}>
        <div className={styles.dashEmptyIcon}>
          <RefreshCw size={22} />
        </div>
        <div className={styles.dashEmptyTitle}>Sincronizando seus processos</div>
        <p className={styles.dashEmptyDesc}>
          Sua credencial foi cadastrada — o sistema está buscando e centralizando seus processos pela OAB agora.
          Isso pode levar alguns minutos na primeira vez.
        </p>
        <Link
          href="/credenciais"
          style={{ fontSize: 12, fontWeight: 700, color: 'var(--brick)', textDecoration: 'none' }}
        >
          Ver status da credencial →
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.dashEmpty}>
      <div className={styles.dashEmptyIcon}>
        <Scale size={22} />
      </div>
      <div className={styles.dashEmptyTitle}>Vamos monitorar seu primeiro processo</div>
      <p className={styles.dashEmptyDesc}>
        Cadastre o login que você usa no tribunal (PJe, CPE, Projudi…) e a gente cuida do resto:
        descobrimos seus processos pela OAB e avisamos no WhatsApp a cada movimentação.
      </p>
      <Link href="/onboarding" className={styles.dashEmptyCta}>
        <Plus size={14} /> Cadastrar meu primeiro tribunal
      </Link>
    </div>
  );
}
