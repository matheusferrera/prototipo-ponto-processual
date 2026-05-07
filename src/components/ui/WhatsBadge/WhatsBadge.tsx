import styles from './WhatsBadge.module.css';

interface WhatsBadgeProps {
  active?: boolean;
  count?: number;
}

export function WhatsBadge({ active = true, count }: WhatsBadgeProps) {
  return (
    <div className={`${styles.badge} ${active ? styles.badgeActive : styles.badgeInactive}`}>
      <span className={`${styles.icon} ${active ? styles.iconActive : styles.iconInactive}`}>
        W
      </span>
      <span className={`${styles.label} ${active ? styles.labelActive : styles.labelInactive}`}>
        {active ? 'WhatsApp ativo' : 'WhatsApp pausado'}
      </span>
      {count != null && (
        <span className={styles.count}>· {count} envios hoje</span>
      )}
    </div>
  );
}
