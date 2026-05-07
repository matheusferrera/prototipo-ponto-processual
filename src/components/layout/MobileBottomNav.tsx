import Link from 'next/link';
import type { SidebarProps } from './Sidebar';

const navItems = [
  { label: 'Dashboard',     href: '/',              short: 'Início'  },
  { label: 'Processos',     href: '/processos',     short: null      },
  { label: 'Movimentações', href: '/movimentacoes', short: 'Movim.' },
  { label: 'Prazos',        href: '/prazos',        short: null      },
] as const;

export function MobileBottomNav({ active }: { active: SidebarProps['active'] }) {
  return (
    <nav
      className="mobile-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        background: 'var(--paper)',
        borderTop: '1px solid var(--line)',
        display: 'none',
        alignItems: 'stretch',
        zIndex: 100,
      }}
    >
      {navItems.map(item => {
        const isActive = active === item.label;
        return (
          <Link
            key={item.label}
            href={item.href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              textDecoration: 'none',
              color: isActive ? 'var(--brick)' : 'var(--ink-3)',
              borderTop: isActive ? '2px solid var(--brick)' : '2px solid transparent',
              fontFamily: 'var(--ui)',
              fontSize: 10,
              fontWeight: isActive ? 700 : 500,
            }}
          >
            {item.short ?? item.label}
          </Link>
        );
      })}
    </nav>
  );
}
