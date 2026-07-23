'use client';

import { useRef, useState } from 'react';
import styles from './PageInfo.module.css';

export type PageInfoItem = {
  label: string;
  value: string;
  tone?: 'signal' | 'alert' | 'positive';
  percent?: number;
};

/** Uma fatia da distribuição (variant 'summary'): rótulo, percentual e cor. */
export type PageInfoSegment = {
  label: string;
  percent: number;
  /** cor CSS da fatia/legenda (ex.: 'var(--brick)') */
  color?: string;
};

export type PageInfoSection =
  | { title: string; variant: 'compact' | 'bars'; items: PageInfoItem[] }
  | { title: string; variant: 'summary'; stats: PageInfoItem[]; segments: PageInfoSegment[] };

export type PageInfoContent = PageInfoSection[];

interface PageInfoProps {
  pageInfoContent: PageInfoContent;
}

export function PageInfo({ pageInfoContent }: PageInfoProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const hasMultipleSections = pageInfoContent.length > 1;

  function scrollToSection(index: number) {
    const track = trackRef.current;
    if (!track || pageInfoContent.length === 0) return;
    const nextIndex = (index + pageInfoContent.length) % pageInfoContent.length;
    const nextSection = track.children.item(nextIndex) as HTMLElement | null;
    setActiveIndex(nextIndex);
    track.scrollTo({ left: nextSection?.offsetLeft ?? nextIndex * track.clientWidth, behavior: 'smooth' });
  }

  function handleTrackScroll() {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const nextIndex = Math.round(track.scrollLeft / track.clientWidth);
    if (nextIndex !== activeIndex) {
      setActiveIndex(Math.min(Math.max(nextIndex, 0), pageInfoContent.length - 1));
    }
  }

  return (
    <div className={`px-page ${styles.root}`}>
      <div className={styles.carousel}>
        <div
          ref={trackRef}
          className={styles.track}
          role="region"
          aria-label="Resumo da página"
          onScroll={handleTrackScroll}
        >
          {pageInfoContent.map((section, index) => (
            <PageInfoSectionCard key={section.title} section={section} active={index === activeIndex} />
          ))}
        </div>

        {hasMultipleSections && (
          <div className={styles.controls}>
            <button
              type="button"
              className={styles.navBtn}
              aria-label="Mostrar informação anterior"
              onClick={() => scrollToSection(activeIndex - 1)}
            >←</button>

            <div className={styles.dots} aria-label="Selecionar informação">
              {pageInfoContent.map((section, index) => (
                <button
                  key={section.title}
                  type="button"
                  className={`${styles.dot} ${index === activeIndex ? styles.dotActive : styles.dotInactive}`}
                  aria-label={`Mostrar ${section.title}`}
                  aria-current={index === activeIndex ? 'page' : undefined}
                  onClick={() => scrollToSection(index)}
                />
              ))}
            </div>

            <button
              type="button"
              className={styles.navBtn}
              aria-label="Mostrar próxima informação"
              onClick={() => scrollToSection(activeIndex + 1)}
            >→</button>
          </div>
        )}
      </div>
    </div>
  );
}

function PageInfoSectionCard({ section, active }: { section: PageInfoSection; active: boolean }) {
  return (
    <section
      className={`${styles.section} ${section.variant === 'compact' ? styles.sectionCompact : ''}`}
      aria-label={section.title}
      aria-hidden={!active}
    >
      <div className={styles.sectionTitle}>{section.title}</div>
      <PageInfoSectionContent section={section} />
    </section>
  );
}

function PageInfoSectionContent({ section }: { section: PageInfoSection }) {
  switch (section.variant) {
    case 'bars':    return <PageInfoBars items={section.items} />;
    case 'compact': return <PageInfoCards items={section.items} />;
    case 'summary': return <PageInfoSummary stats={section.stats} segments={section.segments} />;
  }
}

function PageInfoSummary({ stats, segments }: { stats: PageInfoItem[]; segments: PageInfoSegment[] }) {
  const chartLabel = segments.length
    ? `Distribuição por tribunal: ${segments.map(s => `${s.label} ${s.percent}%`).join(', ')}`
    : undefined;

  return (
    <div className={styles.summary}>
      <div className={styles.summaryStats}>
        {stats.map(item => (
          <div className={styles.summaryStat} key={item.label}>
            <span className={styles.summaryStatLabel}>{item.label}</span>
            <strong className={`${styles.summaryStatValue} ${getColorClass(item.tone, styles)}`}>
              {item.value}
            </strong>
          </div>
        ))}
      </div>

      <div className={styles.summaryChart} role="group" aria-label={chartLabel}>
        {segments.length > 0 ? (
          <>
            <div className={styles.stackBar} aria-hidden="true">
              {segments.map(seg => (
                <span
                  key={seg.label}
                  className={styles.stackSeg}
                  style={{ width: `${seg.percent}%`, background: seg.color ?? 'var(--ink-3)' }}
                />
              ))}
            </div>
            <div className={styles.legend}>
              {segments.map(seg => (
                <span className={styles.legendItem} key={seg.label}>
                  <span
                    className={styles.legendSwatch}
                    style={{ background: seg.color ?? 'var(--ink-3)' }}
                    aria-hidden="true"
                  />
                  <span className={styles.legendLabel}>{seg.label}</span>
                  <span className={styles.legendPercent}>{seg.percent}%</span>
                </span>
              ))}
            </div>
          </>
        ) : (
          <span className={styles.summaryEmpty}>Sem processos na carteira</span>
        )}
      </div>
    </div>
  );
}

function PageInfoBars({ items }: { items: PageInfoItem[] }) {
  return (
    <div className={styles.bars}>
      {items.map(item => (
        <div className={styles.barRow} key={item.label}>
          <div className={styles.barMeta}>
            <span className={styles.barLabel}>{item.label}</span>
            <div className={styles.barRight}>
              <strong className={styles.barValue}>{item.value}</strong>
              {item.percent !== undefined && (
                <span className={styles.barPercent}>{item.percent}%</span>
              )}
            </div>
          </div>
          <div className={styles.barTrack} aria-hidden="true">
            <div className={styles.barFill} style={{ width: `${item.percent ?? 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function PageInfoCards({ items }: { items: PageInfoItem[] }) {
  return (
    <div className={styles.cardGrid}>
      {items.map(item => (
        <div
          className={`${styles.card} ${styles.cardDefault}`}
          key={item.label}
        >
          <div className={`${styles.label} ${styles.labelCompact}`}>
            {item.label}
          </div>
          <div className={`${styles.value} ${styles.valueCompact} ${getColorClass(item.tone, styles)}`}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function getColorClass(tone: PageInfoItem['tone'], s: typeof styles) {
  if (tone === 'signal') return s.colorSignal;
  if (tone === 'alert')  return s.colorAlert;
  return s.colorInk;
}
