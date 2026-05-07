import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { Seal } from '@/components/ui/Seal/Seal';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { StatusDot } from '@/components/ui/StatusDot/StatusDot';
import { processos, timelineCarlosRibeiro } from '@/lib/mock-data';
import { getAbsoluteUrl } from '@/lib/site-url';
import type { TimelineEvent } from '@/types';
import styles from './page.module.css';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const processo = processos.find(p => p.id === id);

  if (!processo) {
    return { title: 'Processo não encontrado' };
  }

  const description = `${processo.materia} · ${processo.tribunal} · CNJ ${processo.cnj}`;
  const imageUrl = getAbsoluteUrl(`/processos/${processo.id}/opengraph-image`);

  return {
    title: processo.parte,
    description,
    openGraph: {
      title: processo.parte,
      description,
      type: 'article',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${processo.parte} — ${processo.cnj}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: processo.parte,
      description,
      images: [imageUrl],
    },
  };
}

function TimelineItem({ e, isLast }: { e: TimelineEvent; isLast: boolean }) {
  const isNew = e.state === 'signal';
  return (
    <div style={{ display: 'flex', paddingBottom: isLast ? 0 : 28 }}>
      {/* Coluna de data */}
      <div style={{ width: 90, flexShrink: 0, textAlign: 'right', paddingRight: 16, paddingTop: 2 }}>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontWeight: 600,
            fontSize: 14,
            color: isNew ? 'var(--brick)' : 'var(--ink)',
          }}
        >
          {e.date}
        </div>
        {e.time && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{e.time}</div>}
      </div>

      {/* Coluna do ponto + linha */}
      <div style={{ width: 20, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            flexShrink: 0,
            background: isNew ? 'var(--brick)' : 'var(--paper)',
            border: `2px solid ${isNew ? 'var(--brick)' : 'var(--ink-3)'}`,
            marginTop: 4,
          }}
        />
        {!isLast && (
          <div style={{ width: 1, flex: 1, background: 'var(--line)', marginTop: 6 }} />
        )}
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, paddingLeft: 16, paddingBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '0.05em' }}>
            § {e.n}
          </span>
          {e.label && <Seal variant="nova" />}
        </div>
        <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>{e.title}</div>
        {e.body && (
          <div
            style={{
              marginTop: 12,
              padding: 16,
              background: 'var(--brick-soft)',
              borderLeft: '3px solid var(--brick)',
            }}
          >
            <div style={{ fontSize: 13 }}>{e.body}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button
                style={{
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
                Marcar como visto
              </button>
              <button
                style={{
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
                Abrir no tribunal ↗
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default async function ProcessoDetailPage({ params }: Props) {
  const { id } = await params;
  const processo = processos.find(p => p.id === id);
  if (!processo) notFound();

  const timeline = timelineCarlosRibeiro;

  return (
    <AppLayout active="Processos">
      {/* Breadcrumb */}
      <div
        className={styles.breadcrumb}
        style={{
          padding: '14px 32px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <Link href="/processos" style={{ fontSize: 11, color: 'var(--ink-3)', textDecoration: 'none' }}>← Carteira</Link>
        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>/</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>{processo.cnj.slice(0, 14)}…</span>
        <div style={{ flex: 1 }} />
        <button style={{ fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 12, padding: '6px 10px', border: '1px solid var(--ink)', background: 'var(--paper)', color: 'var(--ink)', borderRadius: 0, cursor: 'pointer' }}>
          Exportar PDF
        </button>
        <button style={{ fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 12, padding: '6px 10px', border: '1px solid var(--ink)', background: 'var(--ink)', color: 'var(--paper)', borderRadius: 0, cursor: 'pointer' }}>
          ⟳ Atualizar
        </button>
      </div>

      {/* Hero do processo */}
      <div
        className={styles.hero}
        style={{
          padding: '40px 48px',
          background: 'var(--paper)',
          borderBottom: '1px solid var(--line)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <TribTag label={processo.tribunal} />
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>·</span>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>1ª Vara do Trabalho · Brasília/DF</span>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>·</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <StatusDot state="quiet" />
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>monitorado · sincronizado há 2h</span>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 600 }}>{processo.cnj}</div>
        <div className={styles.title} style={{ fontWeight: 800, fontSize: 44, lineHeight: 1.05, letterSpacing: '-0.03em', marginTop: 6 }}>{processo.parte}</div>
        <div className={styles.infoRow} style={{ display: 'flex', gap: 32, marginTop: 18 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>Matéria</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{processo.materia}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>Distribuição</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>10/04/2024</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>Próximo prazo</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, color: 'var(--brick)' }}>12/05 · contestação · 6d</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>Movimentações</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>05 · 1 nova</div>
          </div>
        </div>
      </div>

      {/* Timeline + sidebar */}
      <div className={styles.main} style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Timeline */}
        <div className={styles.timeline} style={{ flex: 1, padding: '32px 48px', overflow: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--brick)', letterSpacing: '0.05em' }}>§ MOVIMENTAÇÕES</span>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>do mais recente ao mais antigo</span>
          </div>
          {timeline.map((e, i) => <TimelineItem key={e.id} e={e} isLast={i === timeline.length - 1} />)}
        </div>

        {/* Sidebar de detalhe */}
        <div
          className={styles.sidebar}
          style={{
            width: 320,
            padding: 32,
            borderLeft: '1px solid var(--line)',
            background: 'var(--paper-2)',
            overflow: 'auto',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)', marginBottom: 12 }}>§ Partes</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{processo.parte}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>autor · representado pelo escritório</div>
          <div style={{ height: 1, background: 'var(--line-soft)', margin: '10px 0' }} />
          <div style={{ fontSize: 13, fontWeight: 600 }}>Empresa XYZ Ltda</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>réu</div>

          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)', marginTop: 28, marginBottom: 12 }}>§ Vara</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>1ª Vara do Trabalho</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Juiz: Dr. Alvaro Pereira</div>

          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)', marginTop: 28, marginBottom: 12 }}>§ Sincronização</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusDot state="quiet" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>OK · há 2h</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>Próxima varredura em 1h</div>
          <button
            style={{
              fontFamily: 'var(--ui)',
              fontWeight: 600,
              fontSize: 12,
              padding: '6px 10px',
              border: '1px solid var(--ink)',
              background: 'var(--paper)',
              color: 'var(--ink)',
              borderRadius: 0,
              cursor: 'pointer',
              marginTop: 12,
              width: '100%',
            }}
          >
            Forçar atualização
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
