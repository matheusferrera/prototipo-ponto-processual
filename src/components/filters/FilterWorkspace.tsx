import type { ReactNode } from 'react';
import styles from '@/components/filters/FilterPanel.module.css';

export function FilterWorkspace({ panelHostId, children }: { panelHostId: string; children: ReactNode }) {
  return (
    <div className={styles.filterWorkspace}>
      <div className={styles.filterWorkspaceMain}>{children}</div>
      <div id={panelHostId} className={styles.sidePanelHost} />
    </div>
  );
}
