import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { Seal } from '@/components/ui/Seal/Seal';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { StatusDot } from '@/components/ui/StatusDot/StatusDot';
import { movimentacoes, processos } from '@/lib/mock-data';
import { getAbsoluteUrl } from '@/lib/site-url';
import type { Movimentacao } from '@/types';
import styles from './page.module.css';

interface Props {
  params: Promise<{ id: string }>;
}

function findMovimentacao(id: string): Movimentacao | undefined {
  return movimentacoes.flatMap(g => g.items).find(m => m.id === id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const movimentacao = findMovimentacao(id);

  if (!movimentacao) {
    return { title: 'Movimentação não encontrada' };
  }

  const description = `${movimentacao.tipo} · ${movimentacao.tribunal} · CNJ ${movimentacao.cnj}`;
  const imageUrl = getAbsoluteUrl('/opengraph-image');

  return {
    title: `${movimentacao.tipo} — ${movimentacao.parte}`,
    description,
    openGraph: {
      title: `${movimentacao.tipo} — ${movimentacao.parte}`,
      description,
      type: 'article',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: 'Ponto Processual — Monitoramento de Processos Judiciais',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${movimentacao.tipo} — ${movimentacao.parte}`,
      description,
      images: [imageUrl],
    },
  };
}

export default async function MovimentacaoDetailPage({ params }: Props) {
  const { id } = await params;
  const movimentacao = findMovimentacao(id);
  if (!movimentacao) notFound();

  const processo = processos.find(p => p.cnj === movimentacao.cnj);
  const whatsSent = movimentacao.whats.sent;

  return (
    <AppLayout active="Movimentações">
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
        <Link href="/movimentacoes" style={{ fontSize: 11, color: 'var(--ink-3)', textDecoration: 'none' }}>← Movimentações</Link>
        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>/</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>{movimentacao.id.toUpperCase()}</span>
        <div style={{ flex: 1 }} />
        <button style={{ fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 12, padding: '6px 10px', border: '1px solid var(--ink)', background: 'var(--paper)', color: 'var(--ink)', borderRadius: 0, cursor: 'pointer' }}>
          Abrir no tribunal ↗
        </button>
        <button style={{ fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 12, padding: '6px 10px', border: '1px solid var(--ink)', background: 'var(--ink)', color: 'var(--paper)', borderRadius: 0, cursor: 'pointer' }}>
          Reenviar WhatsApp
        </button>
      </div>

      {/* Hero da movimentação */}
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
          <TribTag label={movimentacao.tribunal} />
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>·</span>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{movimentacao.tipo}</span>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>·</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <StatusDot state={movimentacao.state} />
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{movimentacao.state === 'signal' ? 'nova movimentação' : movimentacao.state === 'alert' ? 'atenção necessária' : 'sincronizada'}</span>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 600 }}>{movimentacao.cnj}</div>
        <div className={styles.title} style={{ fontWeight: 800, fontSize: 44, lineHeight: 1.05, letterSpacing: '-0.03em', marginTop: 6 }}>{movimentacao.parte}</div>
        <div className={styles.infoRow} style={{ display: 'flex', gap: 32, marginTop: 18 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>Horário</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{movimentacao.time}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>Processo</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{processo ? processo.materia : 'Não vinculado'}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>WhatsApp</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, color: whatsSent ? 'var(--ink)' : 'var(--alert)' }}>
              {whatsSent ? `enviado às ${movimentacao.whats.time}` : movimentacao.whats.reason}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>Status</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{movimentacao.state === 'signal' ? 'Nova' : movimentacao.state === 'alert' ? 'Erro' : 'Registrada'}</div>
          </div>
        </div>
      </div>

      {/* Detalhe + sidebar */}
      <div className={styles.main} style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div className={styles.timeline} style={{ flex: 1, padding: '32px 48px', overflow: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--brick)', letterSpacing: '0.05em' }}>§ DETALHE</span>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{movimentacao.tipo}</span>
          </div>

          <div
            style={{
              padding: 24,
              background: movimentacao.state === 'signal' ? 'var(--brick-soft)' : 'var(--paper)',
              border: '1px solid var(--line)',
              borderLeft: `3px solid ${movimentacao.state === 'alert' ? 'var(--alert)' : movimentacao.state === 'signal' ? 'var(--brick)' : 'var(--line)'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '0.05em' }}>§ {movimentacao.id.toUpperCase()}</span>
              {movimentacao.state === 'signal' && <Seal variant="nova" />}
              {movimentacao.state === 'alert' && <Seal variant="erro" />}
            </div>
            <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em' }}>{movimentacao.tipo}</div>
            <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 8 }}>{movimentacao.detail}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
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
              {processo && (
                <Link
                  href={`/processos/${processo.id}`}
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
                    textDecoration: 'none',
                  }}
                >
                  Ver processo →
                </Link>
              )}
            </div>
          </div>
        </div>

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
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)', marginBottom: 12 }}>§ Envio WhatsApp</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                background: whatsSent ? 'var(--quiet)' : 'var(--ink-4)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--paper)',
                fontSize: 9,
                fontWeight: 700,
              }}
            >
              W
            </span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{whatsSent ? 'Enviado' : 'Não enviado'}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
            {whatsSent ? `às ${movimentacao.whats.time} · entregue ✓✓` : movimentacao.whats.reason}
          </div>

          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)', marginTop: 28, marginBottom: 12 }}>§ Processo</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{movimentacao.parte}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{movimentacao.cnj}</div>
          {processo && (
            <>
              <div style={{ height: 1, background: 'var(--line-soft)', margin: '10px 0' }} />
              <div style={{ fontSize: 13, fontWeight: 600 }}>{processo.materia} · {processo.grau}º grau</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>última movimentação em {processo.ultimaMov}</div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
