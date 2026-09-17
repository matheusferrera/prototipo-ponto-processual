'use client';

import { useState } from 'react';
import Link from 'next/link';
import type React from 'react';
import { Sidebar } from '../Sidebar/Sidebar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { BarraInferior, type ContadoresDaBarra } from '@/components/layout/BarraInferior/BarraInferior';
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
  /**
   * Contadores para a barra inferior do celular. Opcional: quem não tem o dado
   * não passa, e a barra não mostra número nenhum — ver `BarraInferior`.
   */
  contadores?: ContadoresDaBarra;
}

export function AppLayout({ active, children, mobileTitle, mobileBreadcrumb, mobileActions, contadores }: AppLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className={styles.root}>
      <Sidebar active={active} contadores={contadores} />

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" showCloseButton={false} className={`mobile-drawer ${styles.sheetContent}`}>
          <Sidebar active={active} contadores={contadores} onClose={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className={styles.main}>
        {/* O HAMBÚRGUER SAIU DAQUI. A navegação do celular é a barra de baixo
            (`BarraInferior`), e a gaveta virou o "Mais" dela — o que devolve a
            este header os 44px que o botão ocupava e leva a navegação para a
            faixa que o polegar alcança. */}
        <div className={styles.mobileHeader} data-mobile-header>
          {mobileTitle ? (
            <div className={styles.mobileHeading}>
              <span className={styles.mobileTitle}>{mobileTitle}</span>
              {mobileBreadcrumb && <span className={styles.mobileBreadcrumb}>{mobileBreadcrumb}</span>}
            </div>
          ) : (
            <Link href="/" className={styles.brand}>
              <span className={styles.brandDot} />
              Ponto
            </Link>
          )}
          {mobileActions}
        </div>
        {children}

        <BarraInferior
          active={active}
          contadores={contadores}
          onAbrirMais={() => setDrawerOpen(true)}
        />
      </main>
    </div>
  );
}
