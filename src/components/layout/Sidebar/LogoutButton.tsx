'use client';

import { useRouter } from 'next/navigation';
import styles from './Sidebar.module.css';
import { esquecerUsuarioAtual } from '@/components/layout/useUsuarioAtual';

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    // Sem isto, quem entra em seguida com outra conta veria o nome do anterior
    // no menu até recarregar a página inteira.
    esquecerUsuarioAtual();
    router.push('/login');
  }

  return (
    <button onClick={handleLogout} className={styles.logoutBtn}>
      Sair
    </button>
  );
}
