import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { Seal } from '@/components/ui/Seal/Seal';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { StatusDot } from '@/components/ui/StatusDot/StatusDot';
import { getMovimentacao, grauLabel } from '@/lib/api.server';
import { getAbsoluteUrl } from '@/lib/site-url';
import styles from './page.module.css';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const mov = await getMovimentacao(id);

  if (!mov) return { title: 'Movimentação não encontrada' };

  const proc = mov.processData;
  const tribunal = proc?.tribunal.replace(/G[12]$/, '') ?? '—';
  const partes = proc?.summary?.partes?.split(';')[0].trim() ?? '—';
  const description = proc ? `${tribunal} · CNJ ${proc.numero}` : 'Movimentação';
  const imageUrl = getAbsoluteUrl('/opengraph-image');

  return {
    title: `Movimentação — ${partes}`,
    description,
    openGraph: {
      title: `Movimentação — ${partes}`,
      description,
      type: 'article',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: 'Ponto Processual — Movimentação' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Movimentação — ${partes}`,
      description,
      images: [imageUrl],
    },
  };
}

export default async function MovimentacaoDetailPage({ params }: Props) {
  const { id } = await params;
  const mov = await getMovimentacao(id);
  if (!mov) notFound();

  const proc = mov.processData;
  const tribunal = proc?.tribunal.replace(/G[12]$/, '') ?? '—';
  const cnj = proc?.numero ?? '—';
  const partes = proc?.summary?.partes?.split(';')[0].trim() ?? '—';
  const vara = proc?.summary?.vara ?? '—';
  const grau = grauLabel(proc?.grau);
  const distribuicao = proc?.summary?.distribuicao ?? '—';

  const detectedAt = new Date(mov.detectedAt);
  const isNew = Date.now() - detectedAt.getTime() < 1000 * 60 * 60 * 48;
  const state = isNew ? 'signal' : 'quiet';

  const timeStr = `${String(detectedAt.getHours()).padStart(2, '0')}:${String(detectedAt.getMinutes()).padStart(2, '0')}`;
  const dateStr = detectedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const statusLabel = isNew ? 'nova movimentação' : 'registrada';

  return (
    <AppLayout active="Movimentações">
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {/* Breadcrumb */}
        <div
          className={styles.breadcrumb}
          style={{ borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}
        >
          <Link href="/movimentacoes" style={{ fontSize: 11, color: 'var(--ink-3)', textDecoration: 'none' }}>← Movimentações</Link>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>/</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>{mov.id}</span>
          <div style={{ flex: 1 }} />
          {mov.link && (
            <a
              href={mov.link}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.pillBtn}
              style={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 12, border: '1px solid var(--ink)', background: 'var(--paper)', color: 'var(--ink)', borderRadius: 0, cursor: 'pointer', textDecoration: 'none' }}
            >
              Abrir documento ↗
            </a>
          )}
          {proc?.summary?.link && (
            <a
              href={proc.summary.link}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.pillBtn}
              style={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 12, border: '1px solid var(--ink)', background: 'var(--ink)', color: 'var(--paper)', borderRadius: 0, cursor: 'pointer', textDecoration: 'none' }}
            >
              Abrir no tribunal ↗
            </a>
          )}
        </div>

        {/* Hero */}
        <div
          className={styles.hero}
          style={{ background: 'var(--paper)', borderBottom: '1px solid var(--line)', flexShrink: 0 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <TribTag label={tribunal} />
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>·</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>{mov.data}</span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>·</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <StatusDot state={state} />
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{statusLabel}</span>
            </div>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 600 }}>{cnj}</div>
          <div
            className={styles.title}
            style={{ fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em', marginTop: 6 }}
          >
            {partes}
          </div>
          <div className={styles.infoRow} style={{ display: 'flex', marginTop: 18 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>Detectada em</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{dateStr} às {timeStr}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>Vara</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{vara}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>Grau</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{grau}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>Distribuição</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{distribuicao}</div>
            </div>
          </div>
        </div>

        {/* Detalhe + sidebar */}
        <div className={styles.main} style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div className={styles.timeline} style={{ flex: 1, overflow: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--brick)', letterSpacing: '0.05em' }}>§ DETALHE DA MOVIMENTAÇÃO</span>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{mov.data}</span>
            </div>

            <div
              style={{
                padding: 24,
                background: isNew ? 'var(--brick-soft)' : 'var(--paper)',
                border: '1px solid var(--line)',
                borderLeft: `3px solid ${isNew ? 'var(--brick)' : 'var(--line)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '0.05em' }}>
                  § {mov.id}
                </span>
                {isNew && <Seal variant="nova" />}
              </div>
              <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.65, marginTop: 4 }}>{mov.descricao}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
                {mov.link && (
                  <a
                    href={mov.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.pillBtn}
                    style={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 12, border: '1px solid var(--ink)', background: 'var(--ink)', color: 'var(--paper)', borderRadius: 0, textDecoration: 'none' }}
                  >
                    Baixar documento ↗
                  </a>
                )}
                <Link
                  href={`/processos/${encodeURIComponent(cnj)}`}
                  className={styles.pillBtn}
                  style={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 12, border: '1px solid var(--ink)', background: 'var(--paper)', color: 'var(--ink)', borderRadius: 0, textDecoration: 'none' }}
                >
                  Ver processo →
                </Link>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div
            className={styles.sidebar}
            style={{ background: 'var(--paper-2)', overflow: 'auto' }}
          >
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)', marginBottom: 12 }}>§ Processo</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{partes}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{cnj}</div>
            <div style={{ height: 1, background: 'var(--line-soft)', margin: '10px 0' }} />
            <div style={{ fontSize: 13, fontWeight: 600 }}>{vara}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{grau} grau · distribuído em {distribuicao}</div>

            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)', marginTop: 28, marginBottom: 12 }}>§ Monitoramento</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StatusDot state={proc?.monitored ? 'quiet' : 'alert'} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{proc?.monitored ? 'Monitorado' : 'Não monitorado'}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
              Sync: <span style={{ fontWeight: 600, color: proc?.syncStatus === 'success' ? 'var(--quiet)' : 'var(--alert)' }}>{proc?.syncStatus ?? '—'}</span>
            </div>

            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)', marginTop: 28, marginBottom: 12 }}>§ Detecção</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{dateStr}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>às {timeStr}</div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
