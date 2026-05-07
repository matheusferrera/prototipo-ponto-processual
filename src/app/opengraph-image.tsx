import { ImageResponse } from 'next/og';

export const alt = 'Ponto Processual — Monitoramento de Processos Judiciais';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#faf9f7',
          padding: '72px 96px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Barra lateral verde */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 8,
            background: '#166534',
            display: 'flex',
          }}
        />

        {/* Label do produto */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              background: '#166534',
              display: 'flex',
            }}
          />
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#166534',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              display: 'flex',
            }}
          >
            PONTO PROCESSUAL
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 68,
            fontWeight: 800,
            color: '#111827',
            lineHeight: 1.0,
            letterSpacing: '-0.03em',
            maxWidth: 860,
            display: 'flex',
            flexWrap: 'wrap',
          }}
        >
          Monitoramento judicial com alertas via WhatsApp.
        </div>

        {/* Rodapé */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: '#166534',
                display: 'flex',
              }}
            />
            <span style={{ fontSize: 16, color: '#6b7280', display: 'flex' }}>
              Processos em tempo real
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: '#166534',
                display: 'flex',
              }}
            />
            <span style={{ fontSize: 16, color: '#6b7280', display: 'flex' }}>
              Alertas automáticos
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: '#166534',
                display: 'flex',
              }}
            />
            <span style={{ fontSize: 16, color: '#6b7280', display: 'flex' }}>
              TRF · TJDFT · TRT
            </span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
