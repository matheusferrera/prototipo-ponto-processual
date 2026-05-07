import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Ticker } from '@/components/layout/Ticker';
import { MovItem } from '@/components/movimentacoes/MovItem';
import { TribTag } from '@/components/ui/TribTag';
import { WhatsBadge } from '@/components/ui/WhatsBadge';
import { ToggleSw } from '@/components/ui/ToggleSw';
import { movimentacoes } from '@/lib/mock-data';

export const metadata: Metadata = {
  title: 'Movimentações — Ponto Processual',
  description: 'Feed geral de movimentações de todos os processos monitorados.',
};

const tiposFiltro = ['TODAS', 'INTIMAÇÕES', 'SENTENÇAS', 'DESPACHOS', 'AUDIÊNCIAS', 'JUNTADAS'];
const tribunaisFiltro = ['TODOS', 'TRF1', 'TJDFT', 'TRF3'];

export default function MovimentacoesPage() {
  return (
    <AppLayout active="Movimentações">
      {/* Topbar */}
      <div
        className="px-page topbar-inner"
        style={{
          padding: '18px 32px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: 'var(--paper)',
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>
            Quarta · 06 maio 2026
          </div>
          <div style={{ fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em', marginTop: 2 }}>Movimentações</div>
        </div>
        <WhatsBadge active count={4} />
        <button
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontFamily: 'var(--ui)',
            fontWeight: 600,
            fontSize: 12,
            padding: '6px 10px',
            border: '1px solid var(--ink)',
            background: 'var(--paper)',
            color: 'var(--ink)',
            borderRadius: 0,
            cursor: 'pointer',
          }}
        >
          ⟳ Sincronizar
        </button>
      </div>

      {/* Ticker */}
      <Ticker />

      {/* Métricas + toggle */}
      <div
        className="px-page"
        style={{
          padding: '24px 32px 20px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--paper-2)',
          flexShrink: 0,
        }}
      >
        <div className="mov-metrics" style={{ display: 'flex', alignItems: 'flex-end', gap: 32 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>Novas hoje</div>
            <div style={{ fontWeight: 800, fontSize: 48, lineHeight: 1, letterSpacing: '-0.04em', color: 'var(--brick)', marginTop: 4 }}>03</div>
          </div>
          <div className="mov-divider" style={{ width: 1, height: 50, background: 'var(--line)' }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>Últimos 7 dias</div>
            <div style={{ fontWeight: 700, fontSize: 26, letterSpacing: '-0.02em', marginTop: 4 }}>27</div>
          </div>
          <div className="mov-divider" style={{ width: 1, height: 50, background: 'var(--line)' }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>WhatsApp · enviados hoje</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 26, letterSpacing: '-0.02em', color: 'var(--quiet)' }}>04</span>
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>de 04 · 100%</span>
            </div>
          </div>
          <div className="mov-divider" style={{ width: 1, height: 50, background: 'var(--line)' }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>Falhas</div>
            <div style={{ fontWeight: 700, fontSize: 26, letterSpacing: '-0.02em', color: 'var(--alert)', marginTop: 4 }}>01</div>
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Auto-envio WhatsApp</span>
              <ToggleSw defaultOn />
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>para todos os processos com novidade</div>
            <button style={{ fontSize: 12, color: 'var(--ink-3)', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}>
              Configurar mensagem ↗
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div
        className="filter-bar"
        style={{
          padding: '12px 32px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
          background: 'var(--paper)',
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--ink-3)', marginRight: 6 }}>Tipo:</span>
        {tiposFiltro.map((t, i) => <TribTag key={t} label={t} active={i === 0} />)}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Tribunal:</span>
        {tribunaisFiltro.map((t, i) => <TribTag key={t} label={t} active={i === 0} />)}
      </div>

      {/* Feed */}
      <div className="px-page" style={{ padding: '20px 32px', overflow: 'auto', flex: 1 }}>
        {movimentacoes.map((g, gi) => (
          <div key={gi} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: gi === 0 ? 'var(--brick)' : 'var(--ink-3)',
                  letterSpacing: '0.05em',
                }}
              >
                § {g.date} — {g.day}
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                {g.items.length} {g.items.length === 1 ? 'movimentação' : 'movimentações'}
              </span>
            </div>
            {g.items.map(m => <MovItem key={m.id} m={m} />)}
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
