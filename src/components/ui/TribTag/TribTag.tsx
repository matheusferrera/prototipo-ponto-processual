import styles from './TribTag.module.css';

interface TribTagProps {
  label: string;
  active?: boolean;
}

export function TribTag({ label, active }: TribTagProps) {
  return (
    <span className={`${styles.tag}${active ? ` ${styles.active}` : ''}`}>
      {label}
    </span>
  );
}
