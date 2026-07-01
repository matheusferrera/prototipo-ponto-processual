import { ImageResponse } from 'next/og';
import { getProcesso } from '@/lib/api.server';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const stateColor: Record<string, string> = {
  signal: '#166534',
  alert: '#9f1239',
  quiet: '#374151',
};

const stateLabel: Record<string, string> = {
  signal: 'NOVA MOVIMENTAÇÃO',
  alert: 'ATENÇÃO',
  quiet: 'SEM NOVIDADES',
};

interface Props {
  params: Promise<{ numero: string }>;
}

export default async function Image({ params }: Props) {
  const { numero } = await params;
  const processo = await getProcesso(numero).catch(() => null);

  const title = processo?.parte ?? 'Processo não encontrado';
  const cnj = processo?.cnj ?? '—';
  const tribunal = processo?.tribunal ?? '—';
  const materia = processo?.materia ?? '—';
  const state = processo?.state ?? 'quiet';
  const color = stateColor[state] ?? '#374151';
  const badge = stateLabel[state] ?? '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#faf9f7',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Barra lateral colorida pelo estado */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 8,
            background: color,
            display: 'flex',
          }}
        />

        {/* Topo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '40px 96px 0 96px',
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#9ca3af',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              display: 'flex',
            }}
          >
            PONTO PROCESSUAL
          </span>
          {badge && (
            <div
              style={{
                display: 'flex',
                padding: '6px 14px',
                background: color,
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.1em',
              }}
            >
              {badge}
            </div>
          )}
        </div>

        {/* Tribunal + CNJ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '48px 96px 0 96px',
          }}
        >
          <div
            style={{
              display: 'flex',
              padding: '4px 10px',
              border: '1.5px solid #d1d5db',
              fontSize: 13,
              fontWeight: 700,
              color: '#374151',
              letterSpacing: '0.08em',
            }}
          >
            {tribunal}
          </div>
          <span style={{ fontSize: 13, color: '#9ca3af', display: 'flex' }}>·</span>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 18,
              fontWeight: 600,
              color: '#6b7280',
              display: 'flex',
            }}
          >
            {cnj}
          </span>
        </div>

        {/* Nome da parte */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: '#111827',
            lineHeight: 1.0,
            letterSpacing: '-0.03em',
            padding: '20px 96px 0 96px',
            display: 'flex',
            flexWrap: 'wrap',
          }}
        >
          {title}
        </div>

        {/* Rodapé com matéria */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 32,
            padding: '0 96px 48px 96px',
            borderTop: '1px solid #e5e7eb',
            paddingTop: 28,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.14em', textTransform: 'uppercase', display: 'flex' }}>
              Matéria
            </span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#111827', display: 'flex' }}>
              {materia}
            </span>
          </div>
          <div style={{ width: 1, height: 32, background: '#e5e7eb', display: 'flex' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.14em', textTransform: 'uppercase', display: 'flex' }}>
              Alertas WhatsApp
            </span>
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: processo?.whatsEnabled ? '#166534' : '#9ca3af',
                display: 'flex',
              }}
            >
              {processo?.whatsEnabled ? 'Ativados' : 'Desativados'}
            </span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
