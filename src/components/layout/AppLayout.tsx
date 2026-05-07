'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import type React from 'react';

interface AppLayoutProps {
  active: React.ComponentProps<typeof Sidebar>['active'];
  children: React.ReactNode;
}

export function AppLayout({ active, children }: AppLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--paper)' }}>
      <Sidebar active={active} />

      {drawerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(20, 26, 21, 0.45)',
            zIndex: 200,
            display: 'flex',
          }}
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="mobile-drawer"
            style={{ width: 260, height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            <Sidebar active={active} onClose={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <div
          className="mobile-header"
          style={{
            alignItems: 'center',
            gap: 12,
            padding: '0 16px',
            height: 52,
            borderBottom: '1px solid var(--line)',
            background: 'var(--paper)',
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setDrawerOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 6,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              marginLeft: -6,
            }}
          >
            <span style={{ display: 'block', width: 18, height: 2, background: 'var(--ink)' }} />
            <span style={{ display: 'block', width: 18, height: 2, background: 'var(--ink)' }} />
            <span style={{ display: 'block', width: 18, height: 2, background: 'var(--ink)' }} />
          </button>
          <span style={{ fontFamily: 'var(--ui)', fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, background: 'var(--brick)', display: 'inline-block', flexShrink: 0 }} />
            Ponto
          </span>
        </div>
        {children}
      </main>
    </div>
  );
}
