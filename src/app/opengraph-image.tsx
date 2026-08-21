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

// Malha de quadros — versão estática do FrameGrid, encostada na direita: a
// primeira coluna começa depois do bloco de texto e as últimas saem pela
// borda. O satori não tem `mask-image`, então o recorte que no site é feito
// por máscara aqui vira opacidade calculada célula a célula: a mesma elipse
// (centro em 83%/36%, núcleo sólido até 30% do raio, transparente a 88%)
// cruzada com a mesma rampa vertical do pé. Sem isso a malha terminaria em
// quatro arestas duras e leria como papel de parede.
const G_COLS = 7;
const G_ROWS = 5;
const G_CELL = 150;
const G_GAP = 16;
const G_RING = 20;
const G_HAIR = 0.1;   // opacidade do fio de 1px — igual ao --fg-hair do CSS
const G_GLOW = 0.09;  // opacidade do anel grosso — igual ao --fg-glow
const G_STEP = G_CELL + G_GAP;
const G_CX = size.width * 0.83;
const G_CY = size.height * 0.36;
const G_LEFT = G_CX - (G_COLS * G_STEP - G_GAP) / 2;
const G_TOP = G_CY - (G_ROWS * G_STEP - G_GAP) / 2;

// Mesmo hash do FrameGrid.tsx: fases descorrelacionadas entre vizinhos, para
// as células acesas ficarem espalhadas em vez de marcharem em fileira.
const hash01 = (n: number) => {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Quanto a célula `i` está acesa, na fase escolhida para o banner. */
const litOf = (i: number) => {
  const FASE = 0.22;
  const rate = 1 + (hash01(i * 3 + 3) - 0.5) * 1.6 * 0.6;
  const w1 = (FASE * 1.8 * rate + hash01(i * 3 + 1)) * Math.PI * 2;
  const w2 = (FASE * 1.8 * rate * 0.618 + hash01(i * 3 + 2)) * Math.PI * 2;
  return Math.pow(clamp01(0.5 + 0.3 * Math.sin(w1) + 0.3 * Math.sin(w2)), 3);
};

/** A máscara do CSS reproduzida como número: elipse × rampa do pé. */
const maskAt = (x: number, y: number) => {
  const r = Math.hypot((x - G_CX) / (size.width * 0.56), (y - G_CY) / (size.height * 1.04));
  const elipse = r <= 0.3 ? 1 : clamp01(1 - (r - 0.3) / (0.88 - 0.3));
  const rampa = clamp01(1 - (y / size.height - 0.58) / (0.96 - 0.58));
  return elipse * rampa;
};

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
        {/* Malha via SVG puro para garantir suporte no satori/resvg. O anel
            grosso é um rect com stroke da espessura do anel, encolhido de
            meia espessura: o stroke do SVG é centrado no traço, então sem o
            encolhimento ele vazaria metade para fora do quadro em vez de
            ficar por dentro, como faz um `border` no CSS. */}
        <svg width={size.width} height={size.height} style={{ position: 'absolute', top: 0, left: 0 }}>
          {Array.from({ length: G_COLS * G_ROWS }).map((_, i) => {
            const x = G_LEFT + (i % G_COLS) * G_STEP;
            const y = G_TOP + Math.floor(i / G_COLS) * G_STEP;
            const m = maskAt(x + G_CELL / 2, y + G_CELL / 2);
            if (m <= 0.01) return null;
            const lit = litOf(i);
            return (
              <g key={i}>
                <rect
                  x={x + 0.5}
                  y={y + 0.5}
                  width={G_CELL - 1}
                  height={G_CELL - 1}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={1}
                  opacity={G_HAIR * m}
                />
                {lit > 0.02 && (
                  <rect
                    x={x + G_RING / 2}
                    y={y + G_RING / 2}
                    width={G_CELL - G_RING}
                    height={G_CELL - G_RING}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={G_RING}
                    opacity={G_GLOW * m * lit}
                  />
                )}
              </g>
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
