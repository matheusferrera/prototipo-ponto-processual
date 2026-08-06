'use client';

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import styles from '@/components/filters/FilterPanel.module.css';

const WIDE_PANEL_QUERY = '(min-width: 1100px)';

export function ResponsiveFilterPanel({
  open,
  onOpenChange,
  panelHostId,
  panelId,
  title,
  returnFocusRef,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panelHostId: string;
  panelId: string;
  title: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const [isWide, setIsWide] = useState(false);
  const [panelHost, setPanelHost] = useState<HTMLElement | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    const media = window.matchMedia(WIDE_PANEL_QUERY);
    const update = () => setIsWide(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPanelHost(document.getElementById(panelHostId));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [panelHostId]);

  useEffect(() => {
    if (open) {
      const frame = window.requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(`#${panelId} [data-filter-panel-title]`)?.focus();
      });
      wasOpen.current = true;
      return () => window.cancelAnimationFrame(frame);
    }

    if (wasOpen.current) returnFocusRef?.current?.focus();
    wasOpen.current = false;
  }, [isWide, open, panelHost, panelId, returnFocusRef]);

  if (isWide && panelHost) {
    return open
      ? createPortal(
        <div id={panelId} className={styles.sidePanelSurface} role="complementary" aria-label={title}>
          {children}
        </div>,
        panelHost,
      )
      : null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent id={panelId} side="right" showCloseButton={false} className={styles.sidePanelSheet}>
        <SheetTitle className="sr-only">{title}</SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  );
}
