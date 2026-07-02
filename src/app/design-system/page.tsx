import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Check, ExternalLink, FileText, Menu, Search, SlidersHorizontal } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { StatusDot } from '@/components/ui/StatusDot/StatusDot';
import { Seal } from '@/components/ui/Seal/Seal';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import type { StatusType } from '@/types';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Design System — Ponto Processual',
  description: 'Guia visual, responsivo e componentizado do Ponto Processual.',
};

const colors = [
  { name: 'Paper', token: '--paper', value: '#f8faf8', usage: 'fundo principal' },
  { name: 'Paper 2', token: '--paper-2', value: '#eef2ef', usage: 'linhas ativas e header secundário' },
  { name: 'Paper 3', token: '--paper-3', value: '#e2ebe4', usage: 'press, fundo estrutural' },
  { name: 'Ink', token: '--ink', value: '#141a15', usage: 'texto principal' },
  { name: 'Ink 3', token: '--ink-3', value: '#6b7a6e', usage: 'metadados e labels' },
  { name: 'Line', token: '--line', value: '#cdd7cf', usage: 'bordas visíveis' },
  { name: 'Brick', token: '--brick', value: '#166534', usage: 'novidade e ação primária' },
  { name: 'Signal', token: '--signal', value: '#d97706', usage: 'atenção sem erro' },
  { name: 'Alert', token: '--alert', value: '#991b1b', usage: 'falha e risco' },
];

const typography = [
  { role: 'Hero', spec: '44px / 800 / 1.05', sample: 'Carlos Ribeiro vs. União' },
  { role: 'Título', spec: '28px / 700 / 1.2', sample: 'Processos' },
  { role: 'Item', spec: '16px / 800 / 1.35', sample: 'Intimação enviada à parte autora' },
  { role: 'Corpo', spec: '14px / 400 / 1.5', sample: 'Prazo de 15 dias para manifestação.' },
  { role: 'Label', spec: '10px / 700 / uppercase', sample: 'Última mov.' },
  { role: 'CNJ', spec: 'JetBrains Mono / 12-22px', sample: '0021345-67.2024.4.01.3400' },
];

const spacing = [
  { name: 'xs', px: 4 },
  { name: 'sm', px: 8 },
  { name: 'md', px: 16 },
  { name: 'lg', px: 24 },
  { name: 'xl', px: 32 },
  { name: '2xl', px: 48 },
  { name: 'page', px: 64 },
];

const rules = [
  ['Trust & Authority', 'Interface de trabalho jurídico. Pouca decoração, contraste alto e hierarquia por tipo, linha e espaço.'],
  ['Mobile-first real', 'Abaixo de 768px: header do AppLayout, cards no lugar de tabela larga, timeline em coluna única e alvos de toque de 44px.'],
  ['Cor não trabalha sozinha', 'Status deve combinar cor, texto e estrutura: barra lateral, selo, dot ou label.'],
  ['Bordas retas', 'Cards, botões e controles seguem raio 0. Bordas de 8px só entram se um componente externo exigir.'],
];

const mobileRules = [
  'Header mobile sticky vem do AppLayout com título, breadcrumb e ações injetadas.',
  'Listas densas viram cards empilhados; não use scroll horizontal como padrão em tela principal.',
  'Detalhes de processo priorizam CNJ, parte, status e ações antes da timeline.',
  'Botões, links de ação, filtros e paginação precisam de min-height/min-width 44px.',
  'Use env(safe-area-inset-bottom) em fim de páginas longas e barras fixas.',
  'Evite hover-only. Todo estado interativo precisa funcionar por toque e teclado.',
];

function Section({ no, title, sub, children }: { no: string; title: string; sub?: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionKicker}>
        <span>§ {no}</span>
        <span>capítulo</span>
      </div>
      <h2>{title}</h2>
      {sub && <p className={styles.sectionSub}>{sub}</p>}
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <div className={styles.label}>{children}</div>;
}

function Panel({ children, edge = false }: { children: ReactNode; edge?: boolean }) {
  return <div className={`${styles.panel}${edge ? ` ${styles.panelEdge}` : ''}`}>{children}</div>;
}

function Swatch({ name, token, value, usage }: { name: string; token: string; value: string; usage: string }) {
  return (
    <div className={styles.swatch}>
      <div className={styles.swatchColor} style={{ background: value }} />
      <div className={styles.swatchMeta}>
        <strong>{name}</strong>
        <code>{token}</code>
        <span>{value}</span>
        <p>{usage}</p>
      </div>
    </div>
  );
}

function ButtonSample({
  variant = 'secondary',
  children,
}: {
  variant?: 'primary' | 'secondary' | 'quiet';
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`${styles.buttonSample} ${styles[`buttonSample${variant[0].toUpperCase()}${variant.slice(1)}`]}`}
    >
      {children}
    </button>
  );
}

function ProcessCard({ state }: { state: StatusType }) {
  return (
    <a className={`${styles.processCard} ${state === 'signal' ? styles.processCardSignal : ''}`} href="/processos">
      <span className={`${styles.processEdge} ${state === 'signal' ? styles.processEdgeSignal : state === 'alert' ? styles.processEdgeAlert : ''}`} />
      <div className={styles.processGrid}>
        <StatusDot state={state} />
        <TribTag label="TRF1" />
        <div className={styles.processCopy}>
          <code>0021345-67.2024.4.01.3400</code>
          <strong>Carlos Ribeiro vs. União</strong>
          <span>Trabalhista · última mov. 05/05</span>
        </div>
        {state === 'signal' ? <Seal variant="nova" /> : <span className={styles.muted}>Monitorado</span>}
      </div>
    </a>
  );
}

function TimelineExample() {
  return (
    <div className={styles.timelineExample}>
      <div className={styles.timelineDate}>
        <strong>05 mai</strong>
        <span>09:12</span>
      </div>
      <div className={styles.timelineRail} aria-hidden="true">
        <span />
      </div>
      <div className={styles.timelineContent}>
        <div className={styles.timelineMeta}>
          <code>§ 01</code>
          <Seal variant="nova" />
        </div>
        <h3>Intimação enviada à parte autora</h3>
        <div className={styles.timelineBody}>
          <p>Prazo de 15 dias para manifestação. O destaque usa brick-soft e borda esquerda.</p>
          <div className={styles.timelineActions}>
            <ButtonSample variant="primary">
              <Check aria-hidden="true" size={16} />
              Marcar como visto
            </ButtonSample>
            <ButtonSample>
              <ExternalLink aria-hidden="true" size={16} />
              Abrir no tribunal
            </ButtonSample>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <AppLayout
      active="Design System"
      mobileTitle="Design System"
      mobileBreadcrumb="Produto / Sistema visual"
    >
      <main className={styles.pageShell}>
        <header className={styles.cover}>
          <div className={styles.coverMark}>
            <span />
            <p>Ponto Processual · Sistema de Design v5.0</p>
          </div>
          <div className={styles.coverGrid}>
            <div>
              <h1>Interface jurídica operacional.</h1>
              <p>
                O design system atual consolida a experiência aplicada nas páginas de Processos,
                Detalhe do processo, Movimentações e Prazos: navegação persistente, conteúdo denso
                e mobile sem tabela quebrada.
              </p>
            </div>
            <dl className={styles.coverFacts}>
              <div>
                <dt>Estilo</dt>
                <dd>Trust & Authority</dd>
              </div>
              <div>
                <dt>Layout</dt>
                <dd>AppLayout adaptativo</dd>
              </div>
              <div>
                <dt>Mobile</dt>
                <dd>375 / 768 / 1024</dd>
              </div>
              <div>
                <dt>Atualizado</dt>
                <dd>02.07.2026</dd>
              </div>
            </dl>
          </div>
        </header>

        <Section no="01" title="Princípios" sub="Decisões de alto nível para qualquer tela nova.">
          <div className={styles.ruleGrid}>
            {rules.map(([title, description], index) => (
              <Panel key={title} edge={index === 1}>
                <code className={styles.ruleNumber}>§ 01.{String(index + 1).padStart(2, '0')}</code>
                <h3>{title}</h3>
                <p>{description}</p>
              </Panel>
            ))}
          </div>
        </Section>

        <Section no="02" title="Tokens" sub="A paleta real está em globals.css e deve ser consumida via CSS custom properties.">
          <Label>Cores</Label>
          <div className={styles.swatchGrid}>
            {colors.map(color => <Swatch key={color.token} {...color} />)}
          </div>

          <div className={styles.twoCol}>
            <Panel>
              <Label>Tipografia</Label>
              <div className={styles.typeList}>
                {typography.map(item => (
                  <div key={item.role} className={styles.typeRow}>
                    <span>{item.role}</span>
                    <strong>{item.sample}</strong>
                    <code>{item.spec}</code>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel>
              <Label>Espaçamento</Label>
              <div className={styles.spacingList}>
                {spacing.map(item => (
                  <div key={item.name} className={styles.spacingRow}>
                    <span className={styles.spacingBlock} style={{ width: item.px, height: item.px }} />
                    <code>{item.name}</code>
                    <span>{item.px}px</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </Section>

        <Section no="03" title="Componentes" sub="Peças canônicas usadas nas páginas novas.">
          <div className={styles.componentGrid}>
            <Panel>
              <Label>Controles</Label>
              <div className={styles.controlStack}>
                <div className={styles.controlRow}>
                  <ButtonSample variant="primary">
                    <Search aria-hidden="true" size={16} />
                    Pesquisar
                  </ButtonSample>
                  <ButtonSample>
                    <SlidersHorizontal aria-hidden="true" size={16} />
                    Filtros
                  </ButtonSample>
                  <ButtonSample variant="quiet">
                    <Menu aria-hidden="true" size={16} />
                    Menu
                  </ButtonSample>
                </div>
                <p>
                  Botões e links de ação usam Lucide, foco visível, transição curta e alvo mínimo
                  de 44px no mobile.
                </p>
              </div>
            </Panel>

            <Panel>
              <Label>Status</Label>
              <div className={styles.statusGrid}>
                {[
                  ['signal', 'Novidade'],
                  ['quiet', 'Monitorado'],
                  ['alert', 'Erro'],
                ].map(([state, label]) => (
                  <div key={state} className={styles.statusItem}>
                    <StatusDot state={state as StatusType} />
                    <span>{label}</span>
                  </div>
                ))}
                <Seal variant="nova" />
                <Seal variant="outline" />
                <Seal variant="erro" />
                <TribTag label="TRF1" />
                <TribTag label="TJDFT" active />
              </div>
            </Panel>

            <Panel edge>
              <Label>Lista de processos</Label>
              <div className={styles.listPreview}>
                <ProcessCard state="signal" />
                <ProcessCard state="quiet" />
              </div>
            </Panel>

            <Panel edge>
              <Label>Timeline de detalhe</Label>
              <TimelineExample />
            </Panel>
          </div>
        </Section>

        <Section no="04" title="Padrões de tela" sub="Layouts que devem ser reutilizados antes de criar uma estrutura nova.">
          <div className={styles.patternGrid}>
            <Panel>
              <FileText aria-hidden="true" className={styles.patternIcon} />
              <h3>Lista operacional</h3>
              <p>
                Desktop usa linhas densas com header compacto. Mobile troca para cards com CNJ,
                tribunal, parte e status em coluna.
              </p>
            </Panel>
            <Panel>
              <FileText aria-hidden="true" className={styles.patternIcon} />
              <h3>Detalhe do processo</h3>
              <p>
                Hero do processo, PageInfo e timeline. No mobile o breadcrumb desktop some e o
                AppLayout assume contexto e ação primária.
              </p>
            </Panel>
            <Panel>
              <FileText aria-hidden="true" className={styles.patternIcon} />
              <h3>Bottom sheet de filtro</h3>
              <p>
                Filtros e ordenação abrem como painel inferior no mobile, com scrim, handle e botão
                de fechar de 44px.
              </p>
            </Panel>
          </div>
        </Section>

        <Section no="05" title="Mobile" sub="Regras obrigatórias para telas abaixo de 768px.">
          <ul className={styles.mobileList}>
            {mobileRules.map(rule => (
              <li key={rule}>
                <Check aria-hidden="true" size={16} />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </Section>

        <footer className={styles.footer}>
          <span />
          <p>Ponto Processual · Design System v5.0 · documentação viva da UI atual.</p>
        </footer>
      </main>
    </AppLayout>
  );
}
