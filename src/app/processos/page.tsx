import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProcessoRow, COLS } from '@/components/processos/ProcessoRow';
import { TribTag } from '@/components/ui/TribTag';
import { StatusDot } from '@/components/ui/StatusDot';
import { processos } from '@/lib/mock-data';

export const metadata: Metadata = {
  title: 'Processos — Ponto Processual',
  description: 'Carteira de processos monitorados.',
};

const tribunaisFiltro = ['TODOS', 'TRF1', 'TJDFT', 'TRF3'];

export default function ProcessosPage() {
  return (
    <AppLayout active="Processos">
      <PageHeader eyebrow="142 processos · 3 tribunais" title="Processos">
        <div
          className="topbar-search"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            border: '1px solid var(--line)',
            background: 'var(--paper)',
            padding: '10px 14px',
            fontSize: 13,
            color: 'var(--ink-2)',
            borderRadius: 0,
            width: 280,
          }}
        >
          <span style={{ color: 'var(--ink-3)' }}>⌕</span>
          <span style={{ color: 'var(--ink-3)' }}>buscar nº CNJ ou parte…</span>
        </div>
        <button
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontFamily: 'var(--ui)',
            fontWeight: 600,
            fontSize: 12,
            padding: '6px 10px',
            border: '1px solid var(--ink)',
            background: 'var(--ink)',
            color: 'var(--paper)',
            borderRadius: 0,
            cursor: 'pointer',
          }}
        >
          + Adicionar
        </button>
      </PageHeader>

      {/* Barra de status e filtros */}
      <div
        className="filter-bar"
        style={{
          padding: '14px 32px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          background: 'var(--paper-2)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusDot state="signal" />
          <span style={{ fontSize: 13, fontWeight: 600 }}>3 com novidade</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusDot state="alert" />
          <span style={{ fontSize: 13, fontWeight: 600 }}>1 com erro</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusDot state="quiet" />
          <span style={{ fontSize: 13 }}>138 monitorados</span>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Tribunal:</span>
        {tribunaisFiltro.map((t, i) => <TribTag key={t} label={t} active={i === 0} />)}
      </div>

      {/* Tabela */}
      <div style={{ overflow: 'auto', flex: 1 }}>
        <div style={{ minWidth: 860 }}>
          {/* Header */}
          <div
            style={{
              padding: '10px 32px',
              borderBottom: '1px solid var(--line)',
              display: 'grid',
              gridTemplateColumns: COLS,
              gap: 16,
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--ink-3)',
            }}
          >
            <div />
            <div>Tribunal</div>
            <div>Nº CNJ</div>
            <div>Parte</div>
            <div>Matéria</div>
            <div>Grau</div>
            <div>Última</div>
            <div>Status</div>
            <div>WhatsApp</div>
          </div>

          {processos.map(p => <ProcessoRow key={p.id} p={p} />)}
        </div>
      </div>

      {/* Paginação */}
      <div
        className="px-page"
        style={{
          padding: '14px 32px',
          borderTop: '1px solid var(--line)',
          background: 'var(--paper-2)',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>1–7 de 142</span>
        <div style={{ flex: 1 }} />
        <button style={{ fontSize: 12, padding: '6px 10px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-3)' }}>←</button>
        <span style={{ fontSize: 11, color: 'var(--ink-3)', margin: '0 12px' }}>1 / 21</span>
        <button style={{ fontSize: 12, padding: '6px 10px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-3)' }}>→</button>
      </div>
    </AppLayout>
  );
}
