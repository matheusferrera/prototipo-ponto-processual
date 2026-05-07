'use client';

import { useRef, useState } from 'react';
import styles from './PageInfo.module.css';

export type PageInfoContent = {
  title: string;
  variant: 'compact' | 'bars' | 'status';
  items: {
    label: string;
    value: string;
    tone?: 'signal' | 'alert';
    percent?: number;
  }[];
}[];

type PageInfoSection = PageInfoContent[number];
type PageInfoItem = PageInfoSection['items'][number];
type PageInfoVariant = PageInfoSection['variant'];

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
    case 'compact': return <PageInfoCards items={section.items} variant="compact" />;
    case 'status':  return <PageInfoCards items={section.items} variant="status" />;
  }
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

function PageInfoCards({ items, variant }: { items: PageInfoItem[]; variant: Extract<PageInfoVariant, 'compact' | 'status'> }) {
  const isCompact = variant === 'compact';
  return (
    <div className={styles.cardGrid}>
      {items.map(item => (
        <div
          className={`${styles.card} ${getCardBgClass(item.tone, styles)}`}
          key={item.label}
        >
          <div className={`${styles.label} ${isCompact ? styles.labelCompact : styles.labelStatus}`}>
            {item.label}
          </div>
          <div className={`${styles.value} ${isCompact ? styles.valueCompact : styles.valueStatus} ${getColorClass(item.tone, styles)}`}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function getCardBgClass(tone: PageInfoItem['tone'], s: typeof styles) {
  if (tone === 'signal') return s.cardSignal;
  if (tone === 'alert')  return s.cardAlert;
  return s.cardDefault;
}

function getColorClass(tone: PageInfoItem['tone'], s: typeof styles) {
  if (tone === 'signal') return s.colorSignal;
  if (tone === 'alert')  return s.colorAlert;
  return s.colorInk;
}
