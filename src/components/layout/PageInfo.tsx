'use client';

import { useRef, useState } from 'react';

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
    track.scrollTo({
      left: nextSection?.offsetLeft ?? nextIndex * track.clientWidth,
      behavior: 'smooth',
    });
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
    <div
      className="px-page page-info"
      style={{
        padding: '12px 32px 10px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--paper-2)',
        flexShrink: 0,
      }}
    >
      <div
        className="page-info-carousel"
        style={{
          display: 'grid',
          gap: 6,
        }}
      >
        <div
          ref={trackRef}
          className="page-info-track"
          role="region"
          aria-label="Resumo da página"
          onScroll={handleTrackScroll}
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            scrollBehavior: 'smooth',
            scrollbarWidth: 'none',
          }}
        >
          {pageInfoContent.map((section, index) => (
            <PageInfoSectionCard key={section.title} section={section} active={index === activeIndex} />
          ))}
        </div>

        {hasMultipleSections && (
          <div
            className="page-info-controls"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <button
              type="button"
              className="page-info-nav page-info-nav--prev"
              aria-label="Mostrar informação anterior"
              onClick={() => scrollToSection(activeIndex - 1)}
              style={navButtonStyle}
            >
              ←
            </button>
            <div
              className="page-info-dots"
              aria-label="Selecionar informação"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {pageInfoContent.map((section, index) => (
                <button
                  key={section.title}
                  type="button"
                  className={`page-info-dot${index === activeIndex ? ' page-info-dot--active' : ''}`}
                  aria-label={`Mostrar ${section.title}`}
                  aria-current={index === activeIndex ? 'page' : undefined}
                  onClick={() => scrollToSection(index)}
                  style={{
                    width: index === activeIndex ? 18 : 7,
                    height: 7,
                    padding: 0,
                    border: 0,
                    background: index === activeIndex ? 'var(--brick)' : 'var(--line)',
                    cursor: 'pointer',
                    transition: 'width 180ms ease, background 180ms ease',
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              className="page-info-nav page-info-nav--next"
              aria-label="Mostrar próxima informação"
              onClick={() => scrollToSection(activeIndex + 1)}
              style={navButtonStyle}
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const navButtonStyle = {
  width: 32,
  height: 28,
  border: '1px solid var(--line)',
  background: 'var(--paper)',
  color: 'var(--ink)',
  fontFamily: 'var(--ui)',
  fontSize: 16,
  fontWeight: 700,
  lineHeight: 1,
  cursor: 'pointer',
  touchAction: 'manipulation',
} as const;

function PageInfoSectionCard({ section, active }: { section: PageInfoSection; active: boolean }) {
  return (
    <section
      className={`page-info-section page-info-section--${section.variant}`}
      aria-label={section.title}
      aria-hidden={!active}
      style={{
        flex: '0 0 100%',
        width: '100%',
        padding: '8px 10px',
        background: 'var(--paper)',
        border: '1px solid var(--line-soft)',
        minHeight: 104,
        display: 'flex',
        flexDirection: 'column',
        scrollSnapAlign: 'start',
      }}
    >
      <div
        className="page-info-section-title"
        style={{
          marginBottom: 6,
          fontSize: 10,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--ink-2)',
        }}
      >
        {section.title}
      </div>
      <PageInfoSectionContent section={section} />
    </section>
  );
}

function PageInfoSectionContent({ section }: { section: PageInfoSection }) {
  switch (section.variant) {
    case 'bars':
      return <PageInfoBars items={section.items} />;
    case 'compact':
    case 'status':
      return <PageInfoCards items={section.items} variant={section.variant} />;
  }
}

function PageInfoBars({ items }: { items: PageInfoItem[] }) {
  return (
    <div className="page-info-bars" style={{ display: 'grid', gridTemplateRows: 'repeat(3, minmax(0, 1fr))', gap: 6, flex: 1 }}>
      {items.map(item => (
        <div className="page-info-bar-row" key={item.label} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
          <div className="page-info-bar-meta" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6, minWidth: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink-3)' }}>{item.label}</span>
            <strong style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink)' }}>{item.value}</strong>
          </div>
          <div
            className="page-info-bar-track"
            aria-hidden="true"
            style={{ width: '100%', height: 8, marginTop: 3, background: 'var(--paper-3)', border: '1px solid var(--line-soft)', overflow: 'hidden' }}
          >
            <div className="page-info-bar-fill" style={{ width: `${item.percent ?? 0}%`, height: '100%', background: 'var(--brick)', minWidth: 8 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function PageInfoCards({ items, variant }: { items: PageInfoItem[]; variant: Extract<PageInfoVariant, 'compact' | 'status'> }) {
  const isCompact = variant === 'compact';

  return (
    <div className="page-info-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, flex: 1 }}>
      {items.map(item => (
        <div className="page-info-card" key={item.label} style={{ minWidth: 0 }}>
          <div
            className="page-info-label"
            style={{
              minHeight: isCompact ? 18 : 22,
              fontSize: isCompact ? 9 : 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              lineHeight: 1.35,
              color: 'var(--ink-3)',
            }}
          >
            {item.label}
          </div>
          <div
            className="page-info-value"
            style={{
              marginTop: isCompact ? 1 : 4,
              fontSize: isCompact ? 22 : 24,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: 0,
              color: getValueColor(item.tone),
            }}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function getValueColor(tone: PageInfoItem['tone']) {
  if (tone === 'signal') return 'var(--brick)';
  if (tone === 'alert') return 'var(--alert)';
  return 'var(--ink)';
}
