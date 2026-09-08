'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { CalendarDays, FolderClosed, LayoutGrid, Activity, ChevronDown, X, type LucideIcon } from 'lucide-react';
import styles from './Sidebar.module.css';
import { LogoutButton } from './LogoutButton';
import { useUsuarioAtual } from '@/components/layout/useUsuarioAtual';
import { formatarOab, iniciaisDe } from '@/lib/usuario';
import { ROTA_PAINEL } from '@/lib/rotas';

export interface SidebarProps {
  active: 'Dashboard' | 'Processos' | 'Movimentações' | 'Prazos' | 'Status' | 'WhatsApp' | 'E-mail' | 'Credenciais' | 'Configurações' | 'Design System';
  onClose?: () => void;
}

const navMain = [
  { label: 'Dashboard', href: ROTA_PAINEL, icon: LayoutGrid },
  { label: 'Processos', href: '/processos', icon: FolderClosed },
  { label: 'Movimentações', href: '/movimentacoes', icon: Activity },
  { label: 'Prazos', href: '/prazos', icon: CalendarDays },
  { label: 'WhatsApp', href: '/whatsapp', icon: WhatsAppIcon },
] as const;

function NavItem({ label, href, icon: Icon, active, onNavigate }: {
  label: string;
  href: string;
  icon: LucideIcon | typeof WhatsAppIcon;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`${styles.navItem}${active ? ` ${styles.navItemActive}` : ''}`}
    >
      <Icon size={17} strokeWidth={1.5} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}

export function Sidebar({ active, onClose }: SidebarProps) {
  return (
    <aside aria-label="Menu lateral" className={`${styles.aside}${onClose ? ` ${styles.asideDrawer}` : ''}`}>
      <div className={styles.accountHeader}>
        <UsuarioMenu />
        {onClose && <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Fechar menu"><X size={20} aria-hidden="true" /></button>}
      </div>

      <nav className={styles.navigation} aria-label="Navegação principal">
        {navMain.map(item => (
          <NavItem key={item.label} {...item} active={active === item.label} onNavigate={onClose} />
        ))}
      </nav>

    </aside>
  );
}

function WhatsAppIcon({ size = 17, strokeWidth = 1.5 }: { size?: number; strokeWidth?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.5L3 20.5l1.3-4.8A8.5 8.5 0 1 1 20.5 11.7Z" /><path d="m8 7 1.5 2.5-1 1a8 8 0 0 0 4 4l1-1L16 15c-.5 1.5-1.5 2-3 1.5-3.5-1.2-5.5-3.5-6.5-7C6.2 8.3 6.8 7.4 8 7Z" /></svg>;
}

function UsuarioMenu() {
  const { usuario, carregando } = useUsuarioAtual();
  const menu = useRef<HTMLDetailsElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [fotoFalhou, setFotoFalhou] = useState(false);
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false;
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape' && menu.current?.open) {
        menu.current.open = false;
        menu.current.querySelector('summary')?.focus();
      }
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, []);
  return <>
    <details ref={menu} className={styles.account}>
      <summary className={styles.user} aria-busy={carregando}>
        {usuario?.avatarUrl && !fotoFalhou ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.avatar} src={usuario.avatarUrl} alt="" width={28} height={28} onError={() => setFotoFalhou(true)} />
        ) : <span className={styles.avatar} aria-hidden="true">{usuario ? iniciaisDe(usuario.name) : '—'}</span>}
        <span className={styles.userName} title={usuario?.name}>{carregando ? 'Carregando…' : usuario?.name || 'Minha conta'}</span>
        <ChevronDown size={12} className={styles.chevron} aria-hidden="true" />
      </summary>
      <div className={styles.accountOptions}>
        {usuario && <p className={styles.email}>{usuario.email}</p>}
        {usuario ? <button type="button" onClick={() => { if (menu.current) menu.current.open = false; dialog.current?.showModal(); }}>Minha conta</button> : <p className={styles.email}>Não foi possível carregar os dados da conta.</p>}
        <LogoutButton />
      </div>
    </details>
    <dialog ref={dialog} className={styles.accountDialog} aria-label="Minha conta" onClose={() => menu.current?.querySelector('summary')?.focus()}>
      <h2>Minha conta</h2>
      <dl><dt>Nome</dt><dd>{usuario?.name}</dd><dt>E-mail</dt><dd>{usuario?.email}</dd>{usuario?.oab && <><dt>OAB</dt><dd>{formatarOab(usuario.oab)}</dd></>}</dl>
      <button type="button" className={styles.logoutBtn} onClick={() => dialog.current?.close()}>Fechar</button>
    </dialog>
  </>;
}
