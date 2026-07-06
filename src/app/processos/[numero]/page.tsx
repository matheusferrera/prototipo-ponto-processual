import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Check, Download, ExternalLink } from 'lucide-react';
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
    <article className={`${styles.timelineItem}${isLast ? ` ${styles.timelineItemLast}` : ''}`}>
      <div className={styles.timelineDate}>
        <div className={isNew ? styles.timelineDateNew : undefined}>{e.date}</div>
        {e.time && <div className={styles.timelineTime}>{e.time}</div>}
      </div>

      <div className={styles.timelineRail} aria-hidden="true">
        <div className={`${styles.timelineMarker}${isNew ? ` ${styles.timelineMarkerNew}` : ''}`} />
        {!isLast && <div className={styles.timelineLine} />}
      </div>

      <div className={styles.timelineContent}>
        <div className={styles.timelineMeta}>
          <span className={styles.timelineCode}>
            § {e.n}
          </span>
          {e.label && <Seal variant="nova" />}
        </div>
        <h2 className={styles.timelineTitle}>{e.title}</h2>
        {e.body && (
          <div className={styles.timelineBody}>
            <p>{e.body}</p>
            <div className={styles.inlineActions}>
              <button type="button" className={`${styles.actionButton} ${styles.actionButtonPrimary}`}>
                <Check aria-hidden="true" size={16} strokeWidth={2} />
                Marcar como visto
              </button>
              <button type="button" className={styles.actionButton}>
                <ExternalLink aria-hidden="true" size={16} strokeWidth={2} />
                Abrir no tribunal
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
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
    <AppLayout
      active="Processos"
      mobileTitle="Processo"
      mobileBreadcrumb={`Processos / ${processo.cnj.slice(0, 14)}...`}
      mobileActions={processo.link ? (
        <a
          href={processo.link}
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.mobileHeaderAction} ${styles.mobileHeaderActionPrimary}`}
          aria-label="Abrir processo no PJE"
          title="Ver no PJE"
        >
          <ExternalLink aria-hidden="true" size={18} strokeWidth={2} />
        </a>
      ) : undefined}
    >
      <div className={styles.pageShell}>
        <nav
          className={styles.breadcrumb}
          aria-label="Navegação do processo"
        >
          <Link href="/processos" className={styles.backLink}>
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={2} />
            Carteira
          </Link>
          <span className={styles.breadcrumbDivider}>/</span>
          <span className={styles.breadcrumbCurrent}>{processo.cnj}</span>
          <div className={styles.breadcrumbSpacer} />
          <button type="button" className={styles.actionButton}>
            <Download aria-hidden="true" size={16} strokeWidth={2} />
            Exportar PDF
          </button>
          {processo.link ? (
            <a
              href={processo.link}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
            >
              <ExternalLink aria-hidden="true" size={16} strokeWidth={2} />
              Ver no PJE
            </a>
          ) : (
            <span
              title="Link do PJE indisponível"
              className={`${styles.actionButton} ${styles.actionButtonDisabled}`}
              aria-disabled="true"
            >
              <ExternalLink aria-hidden="true" size={16} strokeWidth={2} />
              Ver no PJE
            </span>
          )}
        </nav>

        <section className={styles.hero} aria-labelledby="processo-title">
          <div className={styles.heroMeta}>
            <TribTag label={processo.tribunal} />
            <span className={styles.metaSeparator}>·</span>
            <span className={styles.heroMetaText}>{processo.materia}</span>
            <span className={styles.metaSeparator}>·</span>
            <div className={styles.statusPill}>
              <StatusDot state={syncState} />
              <span>{syncLabel}</span>
            </div>
          </div>
          <div className={styles.cnj}>{processo.cnj}</div>
          <h1 id="processo-title" className={styles.title}>
            {processo.parte}
          </h1>
          <dl className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <dt>Órgão julgador</dt>
              <dd>{processo.orgaoJulgador}</dd>
            </div>
            <div className={styles.infoItem}>
              <dt>Grau</dt>
              <dd>{processo.grau}</dd>
            </div>
            <div className={styles.infoItem}>
              <dt>Última mov.</dt>
              <dd>{processo.ultimaMov}</dd>
            </div>
            <div className={styles.infoItem}>
              <dt>Alertas WhatsApp</dt>
              <dd className={processo.whatsEnabled ? styles.infoEmphasis : styles.infoMuted}>
                {processo.whatsEnabled ? 'Ativos' : 'Desativados'}
              </dd>
            </div>
          </dl>
        </section>

        <PageInfo pageInfoContent={pageInfoContent} />

        <section className={styles.timeline} aria-labelledby="movimentacoes-title">
          <div className={styles.sectionHeader}>
            <h2 id="movimentacoes-title">§ MOVIMENTAÇÕES</h2>
            <div className={styles.sectionRule} />
            <span>do mais recente ao mais antigo</span>
          </div>
          {timeline.length === 0 ? (
            <div className={styles.emptyState}>
              § Nenhuma movimentação registrada.
            </div>
          ) : (
            timeline.map((e, i) => <TimelineItem key={e.id} e={e} isLast={i === timeline.length - 1} />)
          )}
        </section>
      </div>
    </AppLayout>
  );
}
