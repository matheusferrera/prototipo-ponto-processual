'use client';

import { useRouter } from 'next/navigation';
import styles from './Sidebar.module.css';

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <button onClick={handleLogout} className={styles.logoutBtn}>
      Sair
    </button>
  );
}
