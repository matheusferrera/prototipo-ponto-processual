'use client';

import { useState } from 'react';
import type React from 'react';
import { Sidebar } from '../Sidebar/Sidebar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import styles from './AppLayout.module.css';

interface AppLayoutProps {
  active: React.ComponentProps<typeof Sidebar>['active'];
  children: React.ReactNode;
  /** Título exibido no header mobile (substitui a marca "Ponto"). */
  mobileTitle?: string;
  /** Breadcrumb exibido abaixo do título no header mobile. */
  mobileBreadcrumb?: string;
  /** Controles (busca/filtro/ordenação/abas) injetados na barra do menu no mobile. */
  mobileActions?: React.ReactNode;
}

export function AppLayout({ active, children, mobileTitle, mobileBreadcrumb, mobileActions }: AppLayoutProps) {
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
        <div className={styles.mobileHeader} data-mobile-header>
          <button onClick={() => setDrawerOpen(true)} className={styles.burgerBtn} aria-label="Abrir menu">
            <span className={styles.burgerLine} />
            <span className={styles.burgerLine} />
            <span className={styles.burgerLine} />
          </button>
          {mobileTitle ? (
            <div className={styles.mobileHeading}>
              <span className={styles.mobileTitle}>{mobileTitle}</span>
              {mobileBreadcrumb && <span className={styles.mobileBreadcrumb}>{mobileBreadcrumb}</span>}
            </div>
          ) : (
            <span className={styles.brand}>
              <span className={styles.brandDot} />
              Ponto
            </span>
          )}
          {mobileActions}
        </div>
        {children}
      </main>
    </div>
  );
}
