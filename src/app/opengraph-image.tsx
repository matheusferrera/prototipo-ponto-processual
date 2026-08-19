import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'Ponto Processual — Fique à frente de cada prazo';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// As mesmas fontes do site (Fraunces nos headlines, Manrope na UI, JetBrains
// Mono no eyebrow). O satori não enxerga o next/font: as instâncias estáticas
// ficam em `assets/` e são registradas na própria resposta. Só o que aparece
// aqui é carregado — um arquivo por família/peso usado no banner.
const font = (file: string) => readFileSync(join(process.cwd(), 'assets', file));

const FONTS = [
  { name: 'Fraunces', data: font('Fraunces-Light.ttf'), weight: 300 as const, style: 'normal' as const },
  { name: 'Manrope', data: font('Manrope-Regular.ttf'), weight: 400 as const, style: 'normal' as const },
  { name: 'Manrope', data: font('Manrope-ExtraBold.ttf'), weight: 800 as const, style: 'normal' as const },
  { name: 'JetBrains Mono', data: font('JetBrainsMono-Bold.ttf'), weight: 700 as const, style: 'normal' as const },
];

// Leque de faixas diagonais — versão estática do HeroRays, encostada na
// direita: a primeira faixa começa depois da coluna de texto e a última sai
// pela borda.
//
// O skewY(-31) do SVG sobe cada coluna em tan(31°)·x, então o `y` do rect não
// é o topo que se vê. `RAY_TOP` descreve onde o canto superior esquerdo deve
// cair no quadro (mesmo escalonamento do `top` no HeroRays.module.css) e o `y`
// desfaz o levantamento do skew — é isso que mantém o corte diagonal do topo
// dentro da imagem, que é o que faz o desenho ler como leque em vez de listras.
const RAYS = 9;
const RAY_X0 = 700;
const RAY_STEP = 58;
const RAY_WIDTH = 210;
const RAY_HEIGHT = 1100;
const RAY_TOP = -189; // canto superior da 1ª faixa (-30% de 630, como no site)
const RAY_TOP_STEP = 50; // cada camada desce um degrau (+8% no site)
const SKEW_LIFT = Math.tan((31 * Math.PI) / 180);

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
          fontFamily: 'Manrope',
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
          {Array.from({ length: RAYS }).map((_, i) => {
            const x = RAY_X0 + i * RAY_STEP;
            return (
              <rect
                key={i}
                x={x}
                y={RAY_TOP + i * RAY_TOP_STEP + x * SKEW_LIFT}
                width={RAY_WIDTH}
                height={RAY_HEIGHT}
                fill="#f8faf8"
                opacity={0.03 + i * 0.02}
                transform="skewY(-31)"
              />
            );
          })}
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', maxWidth: 840 }}>
          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
            <div style={{ width: 14, height: 14, background: '#dcf0e3', marginRight: 18, display: 'flex' }} />
            <span
              style={{
                fontFamily: 'JetBrains Mono',
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

          {/* Headline — espelha `.h1` da landing: Fraunces 300, tracking -0.01em */}
          <div
            style={{
              fontSize: 76,
              fontWeight: 300,
              color: '#ffffff',
              lineHeight: 1.08,
              letterSpacing: '-0.01em',
              marginBottom: 36,
              fontFamily: 'Fraunces',
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
              fontFamily: 'Manrope',
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
          <span style={{ fontSize: 28, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em', fontFamily: 'Manrope' }}>
            Ponto Processual
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: FONTS,
    }
  );
}
