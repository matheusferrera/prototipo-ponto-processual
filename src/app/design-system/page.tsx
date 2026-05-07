import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { StatusDot } from '@/components/ui/StatusDot/StatusDot';
import { Seal } from '@/components/ui/Seal/Seal';
import { TribTag } from '@/components/ui/TribTag/TribTag';

export const metadata: Metadata = {
  title: 'Design System — Ponto Processual',
  description: 'Guia visual e vocabulário de componentes do Ponto Processual v3.',
};

/* ─── Primitivos locais ──────────────────────────────────────────────────── */

function Swatch({ name, value, varName, dark }: { name: string; value: string; varName: string; dark?: boolean }) {
  return (
    <div style={{ flex: 1, minWidth: 120 }}>
      <div style={{ height: 80, background: value, border: '1px solid var(--line)' }} />
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{varName}</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>{value}</div>
      </div>
    </div>
  );
}

function DSSection({ no, title, sub, children }: { no: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section style={{ padding: '48px 64px', borderBottom: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--brick)', letterSpacing: '0.05em' }}>§ {no}</span>
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>capítulo</span>
      </div>
      <div style={{ fontWeight: 800, fontSize: 44, lineHeight: 1.05, letterSpacing: '-0.03em', marginTop: 4 }}>{title}</div>
      {sub && <p style={{ marginTop: 10, maxWidth: 720, color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.55 }}>{sub}</p>}
      <div style={{ marginTop: 32 }}>{children}</div>
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.14em', color: 'var(--ink-3)', marginBottom: 14 }}>
      {children}
    </div>
  );
}

function EdCard({ children, brickEdge }: { children: React.ReactNode; brickEdge?: boolean }) {
  return (
    <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderLeft: brickEdge ? '3px solid var(--brick)' : undefined, padding: 20 }}>
      {children}
    </div>
  );
}

function Btn({ variant, sm, children }: { variant?: 'primary' | 'brick' | 'ghost'; sm?: boolean; children: React.ReactNode }) {
  const bg = variant === 'primary' ? 'var(--ink)' : variant === 'brick' ? 'var(--brick)' : 'transparent';
  const color = variant === 'primary' || variant === 'brick' ? 'var(--paper)' : 'var(--ink)';
  const border = variant === 'ghost' ? 'transparent' : `1px solid ${variant === 'brick' ? 'var(--brick)' : 'var(--ink)'}`;
  return (
    <button
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--ui)',
        fontWeight: 600,
        fontSize: sm ? 12 : 13,
        padding: sm ? '6px 10px' : '9px 16px',
        border,
        background: bg,
        color,
        borderRadius: 0,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

/* ─── Dados ──────────────────────────────────────────────────────────────── */

const swatchesPaper = [
  { name: 'Paper', value: '#fdfbf6', varName: '--paper' },
  { name: 'Paper 2', value: '#f6f1e6', varName: '--paper-2' },
  { name: 'Paper 3', value: '#ebe4d3', varName: '--paper-3' },
  { name: 'Line', value: '#d8cfb8', varName: '--line' },
  { name: 'Line soft', value: '#ebe4d3', varName: '--line-soft' },
];
const swatchesInk = [
  { name: 'Ink', value: '#1a1612', varName: '--ink', dark: true },
  { name: 'Ink 2', value: '#4a4338', varName: '--ink-2', dark: true },
  { name: 'Ink 3', value: '#7a7264', varName: '--ink-3' },
  { name: 'Ink 4', value: '#a89f8d', varName: '--ink-4' },
];
const swatchesSinal = [
  { name: 'Verde-floresta · NOVA', value: '#166534', varName: '--brick', dark: true },
  { name: 'Verde soft', value: '#dcf0e3', varName: '--brick-soft' },
  { name: 'Quiet · OK', value: '#6b7e5e', varName: '--quiet', dark: true },
  { name: 'Quiet soft', value: '#e8eee0', varName: '--quiet-soft' },
  { name: 'Alert', value: '#991b1b', varName: '--alert', dark: true },
  { name: 'Alert soft', value: '#fae5e5', varName: '--alert-soft' },
];

const typoScale = [
  { role: 'Hero', sample: <span style={{ fontWeight: 800, fontSize: 44, letterSpacing: '-0.03em', lineHeight: 1.05 }}>Carlos Ribeiro</span>, spec: '800 · 44px · -0.03em' },
  { role: 'H1', sample: <span style={{ fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em' }}>Estação de monitoramento</span>, spec: '700 · 28px · -0.02em' },
  { role: 'H2', sample: <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em' }}>Intimação enviada à parte autora</span>, spec: '700 · 18px · -0.01em' },
  { role: 'H3', sample: <span style={{ fontWeight: 600, fontSize: 14 }}>Sentença lavrada</span>, spec: '600 · 14px' },
  { role: 'Body', sample: <span style={{ fontSize: 14, lineHeight: 1.55 }}>Intimação para apresentação de contestação no prazo de 15 dias.</span>, spec: '400 · 14px · 1.55' },
  { role: 'Small', sample: <span style={{ fontSize: 13 }}>3 tribunais ativos · última varredura há 12 min</span>, spec: '400 · 13px' },
  { role: 'Caption', sample: <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>DF/12.345 · sócio</span>, spec: '400 · 11px · ink-3' },
  { role: 'Label', sample: <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>Movimentações novas hoje</span>, spec: '600 · 10px · 0.14em · uppercase' },
  { role: 'CNJ', sample: <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 500 }}>0021345-67.2024.4.01.3400</span>, spec: 'mono · 500 · 12px' },
  { role: 'CNJ Hero', sample: <span style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 600 }}>0021345-67.2024.4.01.3400</span>, spec: 'mono · 600 · 22px' },
  { role: 'Hora', sample: <span style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>09:12</span>, spec: 'mono · 600 · 22px · -0.02em' },
  { role: 'Número', sample: <span style={{ fontWeight: 800, fontSize: 64, lineHeight: 0.9, letterSpacing: '-0.04em', color: 'var(--brick)' }}>03</span>, spec: '800 · 64px · -0.04em · brick' },
  { role: 'Sec-num', sample: <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--brick)', letterSpacing: '0.05em' }}>§ 03 — TIPOGRAFIA</span>, spec: 'mono · 600 · 11px · brick' },
];

const spacingScale = [2, 3, 4, 6, 8, 10, 12, 16];

const principios = [
  ['Calma editorial', 'Espaço em branco generoso. Linhas retas, sem cantos arredondados. Hierarquia tipográfica forte. Densidade só onde a tarefa exige.'],
  ['Seriedade sem rigidez', 'Para advogados, não para engenheiros. Sem terminal-vibe. Sem gradientes. Sem emojis. Tudo se refere a um documento físico.'],
  ['Atenção é cara', 'O laranja-tijolo é raro e significa "isto é novo, olhe agora". Quando tudo é destaque, nada é. Use com parcimônia.'],
];

const glossario = [
  ['Movimentação', 'qualquer ato processual capturado do tribunal'],
  ['Carteira', 'conjunto de processos sob monitoramento do escritório'],
  ['Sincronização', 'varredura automática nos sistemas dos tribunais'],
  ['Auto-envio', 'disparo automático de WhatsApp ao detectar movimentação'],
  ['Tribunal', 'TRF1, TJDFT, TRF3 — cada fonte tem sua placa mono'],
  ['Prazo', 'data com obrigação processual; mostrado em dias quando ≤ 30'],
];

/* ─── Página ─────────────────────────────────────────────────────────────── */

export default function DesignSystemPage() {
  return (
    <AppLayout active="Design System">
      <div style={{ flex: 1, overflow: 'auto' }}>

        {/* CAPA */}
        <header style={{ padding: '64px 64px 48px', background: 'var(--paper)', borderBottom: '1px solid var(--ink)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 16, height: 16, background: 'var(--brick)', display: 'inline-block' }} />
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>
              Ponto Processual · Sistema de Design v4.0
            </span>
          </div>
          <h1 style={{ fontSize: 72, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.04em', margin: '28px 0 0' }}>
            Estação de<br />monitoramento.
          </h1>
          <p style={{ marginTop: 24, maxWidth: 640, color: 'var(--ink-2)', fontSize: 15, lineHeight: 1.6 }}>
            Um guia para construir o Ponto Processual com calma editorial e seriedade jurídica. Linhas retas, paleta creme + tijolo, tipografia humanista e a metáfora de uma estação que monitora movimentações em tempo real.
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 40, marginTop: 40 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>Versão</div>
              <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em', marginTop: 4 }}>4.0</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>Atualizado</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>07.05.2026</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>Autoria</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>Equipe de produto</div>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>Sumário</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.8 }}>
                01 Princípios · 02 Cor · 03 Tipo · 04 Espaço<br />
                05 Componentes · 06 Padrões · 07 Voz · 08 Dashboard
              </div>
            </div>
          </div>
        </header>

        {/* §01 PRINCÍPIOS */}
        <DSSection no="01" title="Princípios" sub="Quatro decisões que governam tudo abaixo. Em caso de dúvida, volte aqui.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
            {principios.map(([t, d], i) => (
              <EdCard key={i}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--brick)', letterSpacing: '0.05em' }}>
                  § 01.{String(i + 1).padStart(2, '0')}
                </div>
                <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em', marginTop: 8 }}>{t}</div>
                <p style={{ fontSize: 14, lineHeight: 1.55, marginTop: 8, color: 'var(--ink-2)' }}>{d}</p>
              </EdCard>
            ))}
          </div>
        </DSSection>

        {/* §02 COR */}
        <DSSection no="02" title="Cor" sub="Paleta funcional, não decorativa. Cada cor existe para um trabalho específico.">
          <Label>Papel — superfícies</Label>
          <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
            {swatchesPaper.map(s => <Swatch key={s.varName} {...s} />)}
          </div>

          <Label>Tinta — texto e estrutura</Label>
          <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
            {swatchesInk.map(s => <Swatch key={s.varName} {...s} />)}
          </div>

          <Label>Sinal — usar com economia</Label>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
            {swatchesSinal.map(s => <Swatch key={s.varName} {...s} />)}
          </div>

          <div style={{ background: 'var(--paper-2)', padding: 24, border: '1px solid var(--line)' }}>
            <Label>Regra de uso</Label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                {[
                  'Brick só para "NOVA" e CTAs primários em hover',
                  'Brick soft como fundo de movimentação destacada',
                  'Quiet para confirmação silenciosa (sincronizado, enviado)',
                ].map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: i > 0 ? 6 : 0 }}>
                    <span style={{ color: 'var(--quiet)', flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 13 }}><b>{t.split(' ')[0]}</b> {t.slice(t.indexOf(' ') + 1)}</span>
                  </div>
                ))}
              </div>
              <div>
                {[
                  'Brick para botões secundários ou ícones decorativos',
                  'Mais de 1 elemento brick por viewport',
                  'Gradientes, sombras coloridas, glow effects',
                ].map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: i > 0 ? 6 : 0 }}>
                    <span style={{ color: 'var(--alert)', flexShrink: 0 }}>✗</span>
                    <span style={{ fontSize: 13 }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DSSection>

        {/* §03 TIPOGRAFIA */}
        <DSSection no="03" title="Tipografia" sub="Manrope para UI, JetBrains Mono para nº CNJ, hora e tudo que é dado bruto. Sem terceira família.">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '100px 1fr 220px',
              columnGap: 32,
              rowGap: 28,
              alignItems: 'baseline',
              borderTop: '1px solid var(--line)',
              paddingTop: 24,
            }}
          >
            {typoScale.map(({ role, sample, spec }, i) => (
              <>
                <div key={`r-${i}`} style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)', paddingTop: 6 }}>{role}</div>
                <div key={`s-${i}`} style={{ overflow: 'hidden' }}>{sample}</div>
                <div key={`p-${i}`} style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', paddingTop: 6 }}>{spec}</div>
              </>
            ))}
          </div>
        </DSSection>

        {/* §04 ESPAÇO + GRADE */}
        <DSSection no="04" title="Espaço e grade" sub="Escala em múltiplos de 4px. Densidade controlada por gap, nunca por margens manuais.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 16, marginBottom: 28 }}>
            {spacingScale.map(n => {
              const px = n * 4;
              return (
                <div key={n}>
                  <div style={{ height: px, background: 'var(--brick)', width: px }} />
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, marginTop: 8, color: 'var(--ink-3)' }}>gap-{n} · {px}px</div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 32 }}>
            <Label>Layouts canônicos</Label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Desktop */}
              <EdCard>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>desktop · 1200×720</div>
                <div style={{ marginTop: 12, height: 200, border: '1px solid var(--line)', display: 'flex' }}>
                  <div style={{ width: 60, background: 'var(--paper-2)', borderRight: '1px solid var(--line)' }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ height: 28, borderBottom: '1px solid var(--line)' }} />
                    <div style={{ height: 22, borderBottom: '1px solid var(--line)', background: 'var(--paper-2)' }} />
                    <div style={{ flex: 1 }} />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 10 }}>Sidebar 220 · topbar 60 · ticker 32 · canvas variável</div>
              </EdCard>
              {/* Mobile */}
              <EdCard>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>mobile · 360×720</div>
                <div style={{ marginTop: 12, height: 200, border: '1px solid var(--line)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: 32, borderBottom: '1px solid var(--line)' }} />
                  <div style={{ height: 50, borderBottom: '1px solid var(--line)', background: 'var(--paper-2)' }} />
                  <div style={{ flex: 1 }} />
                  <div style={{ height: 36, borderTop: '1px solid var(--line)' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 10 }}>Header 50 · hero block 70 · scroll · tab-bar 40</div>
              </EdCard>
            </div>
          </div>
        </DSSection>

        {/* §05 COMPONENTES */}
        <DSSection no="05" title="Componentes" sub="Vocabulário visual mínimo. Cada peça aqui aparece em pelo menos duas telas.">

          <Label>Selos · status</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 32, alignItems: 'center' }}>
            <Seal variant="nova" />
            <Seal variant="outline" />
            <Seal variant="nova" label="ENVIADO" />
            <Seal variant="erro" />
            <TribTag label="TRF1" />
            <TribTag label="TJDFT" />
            <TribTag label="TODOS" active />
          </div>

          <Label>Indicadores ao vivo</Label>
          <div style={{ display: 'flex', gap: 32, marginBottom: 32 }}>
            {[
              { state: 'signal' as const, label: 'novidade · pulsa' },
              { state: 'quiet' as const, label: 'monitorado' },
              { state: 'alert' as const, label: 'erro' },
            ].map(({ state, label }) => (
              <div key={state} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StatusDot state={state} />
                <span style={{ fontSize: 13 }}>{label}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ink-4)', display: 'inline-block' }} />
              <span style={{ fontSize: 13 }}>neutro</span>
            </div>
          </div>

          <Label>Botões</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
            <Btn variant="primary">Examinar movimentação</Btn>
            <Btn>Sincronizar</Btn>
            <Btn variant="brick">Marcar como visto</Btn>
            <Btn variant="ghost">Cancelar</Btn>
            <Btn variant="primary" sm>Sm primary</Btn>
            <Btn sm>Sm</Btn>
          </div>

          <Label>Card de movimentação</Label>
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderLeft: '3px solid var(--brick)', marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'stretch' }}>
              <div style={{ padding: '20px 24px', borderRight: '1px solid var(--line)', minWidth: 100 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>09:12</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>há 5h</div>
              </div>
              <div style={{ padding: '20px 24px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <TribTag label="TRF1" />
                  <Seal variant="nova" />
                  <span style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 'auto' }}>1ª Vara · Trabalhista</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em' }}>Intimação enviada à parte autora</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12, marginTop: 4, color: 'var(--ink-3)' }}>0021345-67.2024.4.01.3400</div>
              </div>
              <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center' }}>
                <Btn variant="primary" sm>Abrir →</Btn>
              </div>
            </div>
          </div>

          <Label>Cabeçalho de capítulo</Label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--brick)', letterSpacing: '0.05em' }}>§ HOJE — 06.05</span>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>do mais recente ao mais antigo</span>
          </div>

          <Label>Bloco-documento (metadados do processo)</Label>
          <div style={{ borderTop: '1px solid var(--ink)', borderBottom: '1px solid var(--ink)', padding: '18px 0', marginBottom: 32 }}>
            <div style={{ display: 'flex', gap: 40 }}>
              {[
                { label: 'Matéria', value: 'Trabalhista' },
                { label: 'Distribuição', value: '10/04/2024' },
                { label: 'Próximo prazo', value: '12/05 · 6d', brick: true },
                { label: 'Movimentações', value: '05 · 1 nova' },
              ].map(({ label, value, brick }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, color: brick ? 'var(--brick)' : undefined }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          <Label>Input</Label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--line)', background: 'var(--paper)', padding: '10px 14px', width: 320, marginBottom: 8 }}>
            <span style={{ color: 'var(--ink-3)' }}>⌕</span>
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>buscar nº CNJ ou parte…</span>
          </div>
        </DSSection>

        {/* §06 PADRÕES */}
        <DSSection no="06" title="Padrões de tela" sub="Combinações canônicas. Use estes padrões antes de inventar layouts novos.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

            {/* 06.01 */}
            <div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--brick)', letterSpacing: '0.05em' }}>§ 06.01</span>
              <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em', marginTop: 6 }}>Hero numérico + ticker</div>
              <p style={{ fontSize: 13, marginTop: 8, color: 'var(--ink-2)' }}>Topo de tela onde o número é o conteúdo principal. <b>03</b> em num-hero brick, contexto em caption à direita.</p>
              <EdCard>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>Movimentações novas hoje</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
                  <span style={{ fontWeight: 800, fontSize: 64, lineHeight: 0.9, letterSpacing: '-0.04em', color: 'var(--brick)' }}>03</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>desde a última visita às 22h47</span>
                </div>
              </EdCard>
            </div>

            {/* 06.02 */}
            <div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--brick)', letterSpacing: '0.05em' }}>§ 06.02</span>
              <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em', marginTop: 6 }}>Lista densa com marcação lateral</div>
              <p style={{ fontSize: 13, marginTop: 8, color: 'var(--ink-2)' }}>Linhas de tabela. Marcação 3px à esquerda + paper-2 nas linhas com novidade.</p>
              <div style={{ marginTop: 12, border: '1px solid var(--line)' }}>
                {[
                  { s: 'signal', trib: 'TRF1', cnj: '0021345-67…', parte: 'Carlos Ribeiro' },
                  { s: 'quiet', trib: 'TJDFT', cnj: '0008871-22…', parte: 'Construtora Lima' },
                ].map((r, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '14px 20px',
                      borderBottom: i === 0 ? '1px solid var(--line-soft)' : 'none',
                      display: 'grid',
                      gridTemplateColumns: '12px 70px 1fr 70px',
                      gap: 12,
                      alignItems: 'center',
                      background: r.s === 'signal' ? 'var(--paper-2)' : 'transparent',
                      position: 'relative',
                    }}
                  >
                    <div style={{ width: 3, height: 28, background: r.s === 'signal' ? 'var(--brick)' : 'transparent', position: 'absolute', left: 0 }} />
                    <StatusDot state={r.s as 'signal' | 'quiet'} />
                    <TribTag label={r.trib} />
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{r.cnj} · {r.parte}</span>
                    {r.s === 'signal' ? <Seal variant="nova" /> : <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>—</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* 06.03 */}
            <div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--brick)', letterSpacing: '0.05em' }}>§ 06.03</span>
              <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em', marginTop: 6 }}>Timeline editorial</div>
              <p style={{ fontSize: 13, marginTop: 8, color: 'var(--ink-2)' }}>Detalhe do processo. Data oversized à esquerda, marco circular, conteúdo à direita. Item novo recebe card brick-soft.</p>
              <EdCard>
                <div style={{ paddingLeft: 24, borderLeft: '1px solid var(--line)', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: -7, top: 4, width: 14, height: 14, borderRadius: 999, background: 'var(--brick)' }} />
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 600, color: 'var(--brick)' }}>05 mai</div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginTop: 4 }}>Intimação enviada à parte autora</div>
                  <div style={{ marginTop: 10, padding: 14, background: 'var(--brick-soft)', borderLeft: '3px solid var(--brick)' }}>
                    <div style={{ fontSize: 13 }}>Prazo de 15 dias para contestação.</div>
                  </div>
                </div>
              </EdCard>
            </div>

            {/* 06.04 */}
            <div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--brick)', letterSpacing: '0.05em' }}>§ 06.04</span>
              <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em', marginTop: 6 }}>Status de envio (WhatsApp)</div>
              <p style={{ fontSize: 13, marginTop: 8, color: 'var(--ink-2)' }}>Sempre acompanha movimentação. Verde quiet quando enviado, neutro quando desativado.</p>
              <EdCard>
                {[
                  { sent: true, label: 'Enviado', detail: 'às 09:13 · entregue ✓✓' },
                  { sent: false, label: 'Não enviado', detail: 'desativado para este processo' },
                ].map(({ sent, label, detail }, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: i > 0 ? 12 : 0 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 999, background: sent ? 'var(--quiet)' : 'var(--ink-4)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--paper)', fontSize: 9, fontWeight: 700 }}>W</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: sent ? 'var(--ink)' : 'var(--ink-3)' }}>{label}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{detail}</span>
                  </div>
                ))}
              </EdCard>
            </div>

            {/* 06.05 */}
            <div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--brick)', letterSpacing: '0.05em' }}>§ 06.05</span>
              <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em', marginTop: 6 }}>Seletor de visualização</div>
              <p style={{ fontSize: 13, marginTop: 8, color: 'var(--ink-2)' }}>Grupo de botões para alternar entre Lista, Kanban e Calendário. Ativo: fundo brick + texto branco. Inativo: paper + ink-2. Border-right removida nos intermediários.</p>
              <EdCard>
                <div style={{ display: 'flex' }}>
                  {['Lista', 'Kanban', 'Calendário'].map((v, i) => (
                    <button
                      key={v}
                      style={{
                        fontFamily: 'var(--ui)',
                        fontWeight: 600,
                        fontSize: 12,
                        padding: '5px 14px',
                        border: '1px solid var(--line)',
                        borderRight: i < 2 ? 'none' : '1px solid var(--line)',
                        background: i === 0 ? 'var(--brick)' : 'var(--paper)',
                        color: i === 0 ? '#fff' : 'var(--ink-2)',
                        borderRadius: 0,
                        cursor: 'pointer',
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 12 }}>
                  Ativo: brick bg · #fff. Inativo: paper · ink-2. Botões intermediários sem border-right.
                </p>
              </EdCard>
            </div>

            {/* 06.06 */}
            <div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--brick)', letterSpacing: '0.05em' }}>§ 06.06</span>
              <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em', marginTop: 6 }}>Card kanban de prazo</div>
              <p style={{ fontSize: 13, marginTop: 8, color: 'var(--ink-2)' }}>Coluna com header colorido e contador. Card: border-top 2px com a cor do estado. Número de dias em destaque no rodapé; data à direita.</p>
              <EdCard>
                <div style={{ maxWidth: 190 }}>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: 'var(--alert-soft)', borderTop: '2px solid var(--alert)', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--alert)', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>Crítico</span>
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--alert)' }}>1</span>
                  </div>
                  <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderTop: '2px solid var(--alert)', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                      <TribTag label="TRF3" />
                      <span style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase' as const }}>Manifestação</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Tech Brasil S.A.</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', marginBottom: 10 }}>0044556-78.2025.4.03.6100</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 22, color: 'var(--alert)', lineHeight: 1 }}>2d</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>08/05</span>
                    </div>
                  </div>
                </div>
              </EdCard>
            </div>

            {/* 06.07 — full width */}
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--brick)', letterSpacing: '0.05em' }}>§ 06.07</span>
              <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em', marginTop: 6 }}>Grade de calendário</div>
              <p style={{ fontSize: 13, marginTop: 8, color: 'var(--ink-2)' }}>Grid 7 colunas, gap 1px com fundo line-soft. Cabeçalho de dias em paper-2. Hoje: box brick. Eventos: chip com border-left 2px + bg soft.</p>
              <EdCard>
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 1 }}>
                    {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
                      <div key={d} style={{ padding: '6px', textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', background: 'var(--paper-2)' }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'var(--line-soft)' }}>
                    {([null,null,null,null,1,2,3,4,5,6,7,8,9,10] as (number|null)[]).map((day, i) => (
                      <div key={i} style={{ background: day ? 'var(--paper)' : 'var(--paper-2)', minHeight: 72, padding: '6px 8px' }}>
                        {day && (
                          <>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: day === 7 ? 'var(--paper)' : 'var(--ink-3)', marginBottom: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, background: day === 7 ? 'var(--brick)' : 'transparent' }}>
                              {day}
                            </div>
                            {day === 8 && (
                              <div style={{ background: 'var(--alert-soft)', borderLeft: '2px solid var(--alert)', padding: '3px 5px', fontSize: 10, lineHeight: 1.3 }}>
                                <div style={{ fontWeight: 700, color: 'var(--alert)' }}>Manifestação</div>
                                <div style={{ color: 'var(--ink-3)' }}>Tech Brasil</div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </EdCard>
            </div>

          </div>
        </DSSection>

        {/* §07 VOZ */}
        <DSSection no="07" title="Voz e copy" sub="Como o produto fala. Tom: colega advogado experiente — direto, formal, sem floreio.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid var(--line)' }}>
            <div style={{ padding: 24, borderRight: '1px solid var(--line)', background: 'var(--quiet-soft)' }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.14em', color: 'var(--quiet)', marginBottom: 14 }}>Faça</div>
              {[
                ['"3 movimentações novas hoje"', 'direto, fato'],
                ['"Intimação enviada à parte autora"', 'linguagem do tribunal'],
                ['"Sincronizado há 12 min"', 'tempo relativo, conciso'],
                ['"Marcar como visto"', 'verbo de ação'],
              ].map(([ex, desc], i) => (
                <div key={i} style={{ marginTop: i > 0 ? 18 : 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{ex}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{desc}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: 24, background: 'var(--alert-soft)' }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.14em', color: 'var(--alert)', marginBottom: 14 }}>Não faça</div>
              {[
                ['"Você tem 3 novas notificações! 🎉"', 'animado demais, emoji'],
                ['"Documento foi disponibilizado"', 'genérico, voz passiva ruim'],
                ['"Última atualização: 06/05/2026 09:43:21"', 'data absoluta quando relativa basta'],
                ['"OK"', 'botão sem propósito'],
              ].map(([ex, desc], i) => (
                <div key={i} style={{ marginTop: i > 0 ? 18 : 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink-3)' }}>{ex}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 32 }}>
            <Label>Glossário</Label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', border: '1px solid var(--line)' }}>
              {glossario.map(([term, def], i) => (
                <div
                  key={i}
                  style={{
                    padding: 18,
                    borderRight: i % 3 !== 2 ? '1px solid var(--line)' : 'none',
                    borderBottom: i < 3 ? '1px solid var(--line)' : 'none',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{term}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{def}</div>
                </div>
              ))}
            </div>
          </div>
        </DSSection>

        {/* §08 DASHBOARD */}
        <DSSection no="08" title="Dashboard" sub="Padrões da tela de visão geral. Três peças reutilizáveis: stat card, widget de lista compacta e barra de estado de carteira.">

          <Label>Stat card — metric hero</Label>
          <div style={{ display: 'flex', border: '1px solid var(--line)', background: 'var(--paper)', marginBottom: 32 }}>
            {[
              { label: 'Processos monitorados', value: '07', sub: '5 com WhatsApp ativo', color: 'var(--ink)' },
              { label: 'Movimentações hoje',    value: '02', sub: '1 nova',               color: 'var(--brick)' },
              { label: 'Prazos ativos',         value: '04', sub: '2 vencem em ≤ 7 dias', color: 'var(--ink)' },
              { label: 'Críticos',              value: '01', sub: 'Tech Brasil · 2d',      color: 'var(--alert)' },
            ].map((c, i) => (
              <div key={i} style={{ flex: 1, padding: '20px 24px', borderRight: i < 3 ? '1px solid var(--line-soft)' : 'none' }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.14em', color: 'var(--ink-3)', marginBottom: 8 }}>{c.label}</div>
                <div style={{ fontWeight: 800, fontSize: 48, lineHeight: 0.9, letterSpacing: '-0.04em', color: c.color }}>{c.value}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 10 }}>{c.sub}</div>
              </div>
            ))}
          </div>

          <Label>Widget de lista compacta</Label>
          <div style={{ border: '1px solid var(--line)', background: 'var(--paper)', marginBottom: 32, maxWidth: 600 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--brick)', letterSpacing: '0.05em' }}>§ MOVIMENTAÇÕES RECENTES</span>
              <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600 }}>Ver todas →</span>
            </div>
            {[
              { state: 'signal' as const, time: '09:12', trib: 'TRF1', parte: 'Carlos Ribeiro', tipo: 'Intimação' },
              { state: 'signal' as const, time: '08:45', trib: 'TJDFT', parte: 'Maria Souza vs. INSS', tipo: 'Sentença' },
              { state: 'quiet' as const,  time: '17:02', trib: 'TJDFT', parte: 'Pedro H. Vasconcelos', tipo: 'Audiência' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: i < 2 ? '1px solid var(--line-soft)' : 'none', gap: 12, background: row.state === 'signal' ? 'var(--brick-soft)' : 'transparent' }}>
                <StatusDot state={row.state} />
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', minWidth: 36 }}>{row.time}</div>
                <TribTag label={row.trib} />
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.parte}</div>
                <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--ink-3)' }}>{row.tipo}</span>
                {row.state === 'signal' && <Seal variant="nova" />}
              </div>
            ))}
          </div>

          <Label>Barra de estado de carteira</Label>
          <div style={{ border: '1px solid var(--line)', background: 'var(--paper)', maxWidth: 360 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--brick)', letterSpacing: '0.05em' }}>§ CARTEIRA</span>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Novidade', count: 2, total: 7, color: 'var(--brick)' },
                { label: 'Monitorado', count: 4, total: 7, color: 'var(--quiet)' },
                { label: 'Erro', count: 1, total: 7, color: 'var(--alert)' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', width: 72 }}>{row.label}</div>
                  <div style={{ flex: 1, height: 6, background: 'var(--paper-2)', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${(row.count / row.total) * 100}%`, background: row.color }} />
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13, color: row.color, width: 16, textAlign: 'right' as const }}>{row.count}</div>
                </div>
              ))}
              <div style={{ marginTop: 4, paddingTop: 10, borderTop: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>WhatsApp ativo</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--quiet)' }}>5/7</span>
              </div>
            </div>
          </div>

        </DSSection>

        {/* COLOFÃO */}
        <footer style={{ padding: '40px 64px', background: 'var(--ink)', color: 'var(--paper)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 16, height: 16, background: 'var(--brick)', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(253,251,246,0.6)' }}>
              Ponto Processual · Sistema de Design v4.0 · 07.05.2026
            </span>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'rgba(253,251,246,0.6)' }}>fim do documento.</span>
          </div>
        </footer>

      </div>
    </AppLayout>
  );
}
