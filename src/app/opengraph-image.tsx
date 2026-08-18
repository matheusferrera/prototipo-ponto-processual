import { ImageResponse } from 'next/og';

export const alt = 'Ponto Processual — Fique à frente de cada prazo';
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
          justifyContent: 'center',
          background: 'linear-gradient(160deg, #14532d, #166534 70%)',
          padding: '80px 96px',
          fontFamily: 'serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Efeito Hero Rays via SVG puro para garantir suporte no satori/resvg */}
        <svg
          width="1200"
          height="630"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            opacity: 0.8,
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <rect
              key={i}
              x={600 + i * 50}
              y={-100 + i * 50}
              width={180}
              height={1400}
              fill="#f8faf8"
              opacity={0.03 + i * 0.02}
              transform="skewY(-31)"
            />
          ))}
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', maxWidth: 840 }}>
          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
            <div style={{ width: 14, height: 14, background: '#dcf0e3', marginRight: 18, display: 'flex' }} />
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: 22,
                fontWeight: 700,
                color: '#dcf0e3',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              Processo certo. Prazo certo. Sempre.
            </span>
          </div>

          {/* Headline */}
          <div
            style={{
              fontSize: 76,
              fontWeight: 400,
              color: '#ffffff',
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
              marginBottom: 36,
              fontFamily: 'serif',
            }}
          >
            Fique à frente de cada prazo
          </div>

          {/* Lead / Subtitle */}
          <div
            style={{
              fontSize: 32,
              lineHeight: 1.5,
              color: '#eef2ef',
              fontFamily: 'sans-serif',
              maxWidth: 780,
            }}
          >
            Acompanhamos seus processos em todos os tribunais, decodificamos cada movimentação e avisamos você no WhatsApp — antes que vire prejuízo.
          </div>
        </div>

        {/* Brand at bottom right */}
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            right: 96,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div style={{ width: 22, height: 22, background: '#166534', border: '2px solid #dcf0e3', marginRight: 14, display: 'flex' }} />
          <span style={{ fontSize: 28, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em', fontFamily: 'sans-serif' }}>
            Ponto Processual
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
