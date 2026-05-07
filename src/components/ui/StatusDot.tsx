import type { StatusType } from '@/types';

interface StatusDotProps {
  state: StatusType;
  size?: number;
}

const stateColor: Record<StatusType, string> = {
  signal: 'var(--brick)',
  quiet:  'var(--quiet)',
  alert:  'var(--alert)',
};

export function StatusDot({ state, size = 6 }: StatusDotProps) {
  return (
    <span
      className={state === 'signal' ? 'dot-signal' : undefined}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: 999,
        background: stateColor[state],
        flexShrink: 0,
      }}
    />
  );
}
