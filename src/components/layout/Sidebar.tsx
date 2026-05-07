import Link from 'next/link';

export interface SidebarProps {
  active: 'Dashboard' | 'Processos' | 'Movimentações' | 'Prazos' | 'WhatsApp' | 'E-mail' | 'Credenciais' | 'Configurações' | 'Design System';
  onClose?: () => void;
}

const navMain = [
  { label: 'Processos',     href: '/processos',     badge: null },
  { label: 'Movimentações', href: '/movimentacoes',  badge: '03' },
  { label: 'Prazos',        href: '/prazos',         badge: '02' },
] as const;

const navNoti = [
  { label: 'WhatsApp', href: '/configuracoes/whatsapp' },
  { label: 'E-mail',   href: '/configuracoes/email' },
] as const;

const navConta = [
  { label: 'Credenciais',   href: '/credenciais' },
  { label: 'Configurações', href: '/configuracoes' },
] as const;

function NavItem({ label, href, badge, active }: { label: string; href: string; badge?: string | null; active: boolean }) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 8px',
        marginLeft: -8,
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        color: active ? 'var(--ink)' : 'var(--ink-3)',
        textDecoration: 'none',
        borderLeft: active ? '2px solid var(--brick)' : '2px solid transparent',
        paddingLeft: active ? 10 : 10,
        background: active ? 'var(--paper-2)' : 'transparent',
        transition: 'color 0.1s',
      }}
    >
      {label}
      {badge && (
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 10, color: active ? 'var(--brick)' : 'var(--ink-4)', fontWeight: 700 }}>
          {badge}
        </span>
      )}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)', marginBottom: 8 }}>
      {children}
    </div>
  );
}

export function Sidebar({ active, onClose }: SidebarProps) {
  return (
    <aside
      className="sidebar"
      style={{
        width: onClose ? '100%' : 220,
        padding: '24px 20px',
        borderRight: onClose ? 'none' : '1px solid var(--line)',
        background: 'var(--paper)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        flexShrink: 0,
        height: '100%',
      }}
    >
      {/* Brand */}
      <div style={{ fontFamily: 'var(--ui)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', color: 'var(--ink)', paddingBottom: 28, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 14, height: 14, background: 'var(--brick)', display: 'inline-block', flexShrink: 0 }} />
        Ponto
        {onClose && (
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1,
              color: 'var(--ink-3)',
              padding: '0 2px',
            }}
          >
            ✕
          </button>
        )}
      </div>

      <NavItem label="Dashboard" href="/" active={active === 'Dashboard'} />

      <div style={{ height: 24 }} />

      <SectionLabel>Carteira</SectionLabel>
      {navMain.map(item => (
        <NavItem key={item.label} label={item.label} href={item.href} badge={item.badge} active={active === item.label} />
      ))}

      <div style={{ height: 24 }} />

      <SectionLabel>Notificações</SectionLabel>
      {navNoti.map(item => (
        <NavItem key={item.label} label={item.label} href={item.href} active={active === item.label} />
      ))}

      <div style={{ height: 24 }} />

      <SectionLabel>Conta</SectionLabel>
      {navConta.map(item => (
        <NavItem key={item.label} label={item.label} href={item.href} active={active === item.label} />
      ))}

      <div style={{ height: 24 }} />

      <SectionLabel>Produto</SectionLabel>
      <NavItem label="Design System" href="/design-system" active={active === 'Design System'} />

      <div style={{ flex: 1 }} />

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--line-soft)', margin: '12px 0' }} />

      {/* User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, background: 'var(--paper-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>
          JM
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>João M.</span>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>DF/12.345</span>
        </div>
      </div>
    </aside>
  );
}
