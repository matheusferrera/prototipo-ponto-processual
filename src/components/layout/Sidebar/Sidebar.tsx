import Link from 'next/link';
import styles from './Sidebar.module.css';
import { LogoutButton } from './LogoutButton';

export interface SidebarProps {
  active: 'Dashboard' | 'Processos' | 'Movimentações' | 'Prazos' | 'Status' | 'WhatsApp' | 'E-mail' | 'Credenciais' | 'Configurações' | 'Design System';
  onClose?: () => void;
}

const navMain = [
  { label: 'Processos',     href: '/processos',     badge: null },
  { label: 'Movimentações', href: '/movimentacoes',  badge: '03' },
  { label: 'Prazos',        href: '/prazos',         badge: '02' },
] as const;

function NavItem({ label, href, badge, active }: { label: string; href: string; badge?: string | null; active: boolean }) {
  return (
    <Link
      href={href}
      className={`${styles.navItem}${active ? ` ${styles.navItemActive}` : ''}`}
    >
      {label}
      {badge && (
        <span className={`${styles.navBadge}${active ? ` ${styles.navBadgeActive}` : ''}`}>
          {badge}
        </span>
      )}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className={styles.sectionLabel}>{children}</div>;
}

export function Sidebar({ active, onClose }: SidebarProps) {
  return (
    <aside className={`${styles.aside}${onClose ? ` ${styles.asideDrawer}` : ''}`}>
      <div className={styles.brand}>
        <span className={styles.brandDot} />
        Ponto
        {onClose && (
          <button onClick={onClose} className={styles.closeBtn}>✕</button>
        )}
      </div>

      <NavItem label="Dashboard" href="/" active={active === 'Dashboard'} />

      <div className={styles.spacer} />

      <SectionLabel>Carteira</SectionLabel>
      {navMain.map(item => (
        <NavItem key={item.label} label={item.label} href={item.href} badge={item.badge} active={active === item.label} />
      ))}

      <div className={styles.spacer} />

      <SectionLabel>Monitoramento</SectionLabel>
      <NavItem label="Status dos Tribunais" href="/status" badge="LIVE" active={active === 'Status'} />

      <div className={styles.spacer} />

      <SectionLabel>Produto</SectionLabel>
      <NavItem label="Design System" href="/design-system" active={active === 'Design System'} />

      <div className={styles.grow} />

      <div className={styles.divider} />

      <div className={styles.user}>
        <div className={styles.avatar}>JM</div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>João M.</span>
          <span className={styles.userOAB}>DF/12.345</span>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
