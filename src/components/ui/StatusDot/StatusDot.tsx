import type { StatusType } from '@/types';
import styles from './StatusDot.module.css';

interface StatusDotProps {
  state: StatusType;
  size?: number;
}

export function StatusDot({ state, size = 6 }: StatusDotProps) {
  return (
    <span
      className={[styles.dot, styles[state]].join(' ')}
      style={{ width: size, height: size }}
    />
  );
}
