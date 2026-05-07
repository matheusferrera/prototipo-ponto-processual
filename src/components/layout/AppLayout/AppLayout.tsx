'use client';

import { useState } from 'react';
import type React from 'react';
import { Sidebar } from '../Sidebar/Sidebar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import styles from './AppLayout.module.css';

interface AppLayoutProps {
  active: React.ComponentProps<typeof Sidebar>['active'];
  children: React.ReactNode;
}

export function AppLayout({ active, children }: AppLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className={styles.root}>
      <Sidebar active={active} />

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" showCloseButton={false} className={`mobile-drawer ${styles.sheetContent}`}>
          <Sidebar active={active} onClose={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className={styles.main}>
        <div className={styles.mobileHeader}>
          <button onClick={() => setDrawerOpen(true)} className={styles.burgerBtn}>
            <span className={styles.burgerLine} />
            <span className={styles.burgerLine} />
            <span className={styles.burgerLine} />
          </button>
          <span className={styles.brand}>
            <span className={styles.brandDot} />
            Ponto
          </span>
        </div>
        {children}
      </main>
    </div>
  );
}
