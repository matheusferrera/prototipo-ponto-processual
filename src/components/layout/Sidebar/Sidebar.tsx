'use client';

import Link from 'next/link';
import styles from './Sidebar.module.css';
import { LogoutButton } from './LogoutButton';
import { useUsuarioAtual } from '@/components/layout/useUsuarioAtual';
import { formatarOab, iniciaisDe } from '@/lib/usuario';
import { ROTA_LANDING, ROTA_PAINEL } from '@/lib/rotas';

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
        {/* A marca é o caminho de volta para a raiz — em qualquer tela, em
            qualquer lugar do produto. Quem já tem sessão é devolvido ao painel
            pelo middleware, então o mesmo clique serve para os dois estados. */}
        <Link href={ROTA_LANDING} className={styles.brandLink}>
          <span className={styles.brandDot} />
          Ponto
        </Link>
        {onClose && (
          <button onClick={onClose} className={styles.closeBtn}>✕</button>
        )}
      </div>

      <NavItem label="Dashboard" href={ROTA_PAINEL} active={active === 'Dashboard'} />

      <div className={styles.spacer} />

      <SectionLabel>Carteira</SectionLabel>
      {navMain.map(item => (
        <NavItem key={item.label} label={item.label} href={item.href} badge={item.badge} active={active === item.label} />
      ))}

      <div className={styles.spacer} />

      <SectionLabel>Monitoramento</SectionLabel>
      <NavItem label="Status dos Tribunais" href="/status" badge="LIVE" active={active === 'Status'} />

      <div className={styles.spacer} />

      <SectionLabel>Conta</SectionLabel>
      <NavItem label="Credenciais" href="/credenciais" active={active === 'Credenciais'} />

      <div className={styles.spacer} />

      <SectionLabel>Produto</SectionLabel>
      <NavItem label="Design System" href="/design-system" active={active === 'Design System'} />

      <div className={styles.grow} />

      <div className={styles.divider} />

      <UsuarioRodape />
    </aside>
  );
}

/**
 * Rodapé do menu: quem está logado.
 *
 * A segunda linha é a OAB — e, quando ela não existe, o e-mail. Inventar uma
 * OAB de exemplo ali (era "DF/12.345") faz a pessoa confiar num dado que não é
 * dela; o e-mail é verdadeiro e serve ao mesmo propósito, que é confirmar em
 * qual conta ela está.
 */
function UsuarioRodape() {
  const { usuario, carregando } = useUsuarioAtual();

  if (carregando || !usuario) {
    return (
      <div className={styles.user} aria-busy={carregando}>
        <div className={styles.avatar} data-vazio="" />
        <div className={styles.userInfo}>
          <span className={styles.userName} data-esqueleto="" />
          <span className={styles.userOAB} data-esqueleto="" />
        </div>
        <LogoutButton />
      </div>
    );
  }

  return (
    <div className={styles.user}>
      {usuario.avatarUrl ? (
        /* Foto da conta Google: domínio externo, e `next/image` exigiria
           configurar `remotePatterns` para um avatar de 28px que não ganha nada
           com otimização. */
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.avatar} src={usuario.avatarUrl} alt="" width={28} height={28} />
      ) : (
        <div className={styles.avatar}>{iniciaisDe(usuario.name)}</div>
      )}
      <div className={styles.userInfo}>
        <span className={styles.userName} title={usuario.name}>{usuario.name}</span>
        <span className={styles.userOAB} title={usuario.email}>
          {usuario.oab ? formatarOab(usuario.oab) : usuario.email}
        </span>
      </div>
      <LogoutButton />
    </div>
  );
}
