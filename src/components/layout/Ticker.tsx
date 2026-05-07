import { tickerItems } from '@/lib/mock-data';

export function Ticker() {
  const items = [...tickerItems, ...tickerItems];

  return (
    <div
      style={{
        overflow: 'hidden',
        borderTop: '1px solid var(--line)',
        borderBottom: '1px solid var(--line)',
        padding: '8px 0',
        background: 'var(--paper-2)',
        flexShrink: 0,
      }}
    >
      <div
        className="ticker-inner"
        style={{
          display: 'flex',
          gap: 32,
          fontFamily: 'var(--mono)',
          fontSize: 12,
          whiteSpace: 'nowrap',
        }}
      >
        {items.map((item, i) => (
          <span
            key={`${item.key}-${i}`}
            style={{ color: item.alert ? 'var(--alert)' : 'var(--ink-2)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {item.signal ? (
              <span
                className="dot-signal"
                style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--brick)', display: 'inline-block' }}
              />
            ) : (
              <span>●</span>
            )}
            {item.text}
          </span>
        ))}
      </div>
    </div>
  );
}
