import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { PageInfo } from '@/components/layout/PageInfo/PageInfo';
import type { PageInfoContent } from '@/components/layout/PageInfo/PageInfo';
import { Seal } from '@/components/ui/Seal/Seal';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { StatusDot } from '@/components/ui/StatusDot/StatusDot';
import { getProcesso, getProcessoMovements } from '@/lib/api.server';
import { getAbsoluteUrl } from '@/lib/site-url';
import type { TimelineEvent } from '@/types';
import styles from './page.module.css';

interface Props {
  params: Promise<{ numero: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { numero } = await params;
  const processo = await getProcesso(decodeURIComponent(numero));

  if (!processo) {
    return { title: 'Processo não encontrado' };
  }

  const description = `${processo.materia} · ${processo.tribunal} · CNJ ${processo.cnj}`;
  const imageUrl = getAbsoluteUrl(`/processos/${numero}/opengraph-image`);

  return {
    title: processo.parte,
    description,
    openGraph: {
      title: processo.parte,
      description,
      type: 'article',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: `${processo.parte} — ${processo.cnj}` }],
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
      <div style={{ width: 90, flexShrink: 0, textAlign: 'right', paddingRight: 16, paddingTop: 2 }}>
        <div style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 14, color: isNew ? 'var(--brick)' : 'var(--ink)' }}>
          {e.date}
        </div>
        {e.time && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{e.time}</div>}
      </div>

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
        {!isLast && <div style={{ width: 1, flex: 1, background: 'var(--line)', marginTop: 6 }} />}
      </div>

      <div style={{ flex: 1, paddingLeft: 16, paddingBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '0.05em' }}>
            § {e.n}
          </span>
          {e.label && <Seal variant="nova" />}
        </div>
        <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>{e.title}</div>
        {e.body && (
          <div style={{ marginTop: 12, padding: 16, background: 'var(--brick-soft)', borderLeft: '3px solid var(--brick)' }}>
            <div style={{ fontSize: 13 }}>{e.body}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button style={{ fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 12, padding: '6px 10px', border: '1px solid var(--ink)', background: 'var(--ink)', color: 'var(--paper)', borderRadius: 0, cursor: 'pointer' }}>
                Marcar como visto
              </button>
              <button style={{ fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 12, padding: '6px 10px', border: '1px solid var(--ink)', background: 'var(--paper)', color: 'var(--ink)', borderRadius: 0, cursor: 'pointer' }}>
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
  const { numero } = await params;
  const decodedNumero = decodeURIComponent(numero);
  const processo = await getProcesso(decodedNumero);
  if (!processo) notFound();
  const timeline = await getProcessoMovements(processo.id);

  const syncLabel = processo.state === 'alert' ? 'Erro de sincronização' : 'Monitorado';
  const syncState = processo.state === 'alert' ? 'alert' : 'quiet';

  const novidades = timeline.filter(e => e.state === 'signal').length;
  const oldest = timeline.at(-1);
  let diasProcesso = '—';
  if (oldest?.rawDate) {
    const brMatch = oldest.rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    const parsed = brMatch
      ? new Date(+brMatch[3], +brMatch[2] - 1, +brMatch[1])
      : new Date(oldest.rawDate);
    if (!isNaN(parsed.getTime())) {
      const diff = Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24));
      diasProcesso = String(diff);
    }
  }

  const pageInfoContent: PageInfoContent = [
    {
      title: 'Movimentações',
      variant: 'compact',
      items: [
        { label: 'Total', value: String(timeline.length).padStart(2, '0') },
        { label: 'Novidades', value: String(novidades).padStart(2, '0'), tone: novidades > 0 ? 'signal' : undefined },
        { label: 'Dias de processo', value: diasProcesso },
      ],
    },
    {
      title: 'Processo',
      variant: 'compact',
      items: [
        { label: 'Grau', value: processo.grau },
        { label: 'Última mov.', value: processo.ultimaMov },
        { label: 'WhatsApp', value: processo.whatsEnabled ? 'Ativos' : 'Off', tone: processo.whatsEnabled ? undefined : 'alert' },
      ],
    },
  ];

  return (
    <AppLayout active="Processos">
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
      {/* Breadcrumb */}
      <div
        className={styles.breadcrumb}
        style={{ padding: '14px 32px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}
      >
        <Link href="/processos" style={{ fontSize: 11, color: 'var(--ink-3)', textDecoration: 'none' }}>← Carteira</Link>
        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>/</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>{processo.cnj.slice(0, 14)}…</span>
        <div style={{ flex: 1 }} />
        <button style={{ fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 12, padding: '6px 10px', border: '1px solid var(--ink)', background: 'var(--paper)', color: 'var(--ink)', borderRadius: 0, cursor: 'pointer' }}>
          Exportar PDF
        </button>
        {processo.link ? (
          <a
            href={processo.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 12, padding: '6px 10px', border: '1px solid var(--ink)', background: 'var(--ink)', color: 'var(--paper)', borderRadius: 0, cursor: 'pointer', textDecoration: 'none' }}
          >
            Ver no PJE ↗
          </a>
        ) : (
          <span
            title="Link do PJE indisponível"
            style={{ fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 12, padding: '6px 10px', border: '1px solid var(--line)', background: 'var(--paper-2)', color: 'var(--ink-3)', borderRadius: 0, cursor: 'not-allowed' }}
          >
            Ver no PJE ↗
          </span>
        )}
      </div>

      {/* Hero do processo */}
      <div className={styles.hero} style={{ padding: '40px 48px', background: 'var(--paper)', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <TribTag label={processo.tribunal} />
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>·</span>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{processo.materia}</span>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>·</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <StatusDot state={syncState} />
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{syncLabel}</span>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 600 }}>{processo.cnj}</div>
        <div className={styles.title} style={{ fontWeight: 800, fontSize: 44, lineHeight: 1.05, letterSpacing: '-0.03em', marginTop: 6 }}>
          {processo.parte}
        </div>
        <div className={styles.infoRow} style={{ display: 'flex', gap: 32, marginTop: 18 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>Vara</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{processo.materia}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>Grau</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{processo.grau}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>Última mov.</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{processo.ultimaMov}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>Alertas WhatsApp</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, color: processo.whatsEnabled ? 'var(--brick)' : 'var(--ink-3)' }}>
              {processo.whatsEnabled ? 'Ativos' : 'Desativados'}
            </div>
          </div>
        </div>
      </div>

      <PageInfo pageInfoContent={pageInfoContent} />

      {/* Timeline */}
      <div className={styles.timeline} style={{ padding: '32px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--brick)', letterSpacing: '0.05em' }}>§ MOVIMENTAÇÕES</span>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>do mais recente ao mais antigo</span>
        </div>
        {timeline.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>
            § Nenhuma movimentação registrada.
          </div>
        ) : (
          timeline.map((e, i) => <TimelineItem key={e.id} e={e} isLast={i === timeline.length - 1} />)
        )}
      </div>
      </div>
    </AppLayout>
  );
}
