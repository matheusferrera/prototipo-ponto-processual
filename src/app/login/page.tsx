'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AuthShell, type AuthFeature } from '@/components/auth/AuthShell';
import { AuthField } from '@/components/auth/AuthField';
import styles from '@/components/auth/AuthForm.module.css';

const FEATURES: AuthFeature[] = [
  {
    icon: '§',
    title: 'Monitoramento em tempo real',
    desc: 'Acompanhe todas as movimentações dos seus processos no instante em que ocorrem.',
  },
  {
    icon: '◎',
    title: 'Alertas via WhatsApp',
    desc: 'Receba notificações imediatas diretamente no seu celular, sem precisar abrir o sistema.',
  },
  {
    icon: '▣',
    title: 'Gestão de prazos',
    desc: 'Nunca perca um prazo. Alertas automáticos com dias de antecedência configurável.',
  },
];

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !senha.trim()) {
      setError('Preencha e-mail e senha para continuar.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: senha }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Credenciais inválidas.');
        return;
      }
      const next = new URLSearchParams(window.location.search).get('next') ?? '/';
      router.push(next);
    } catch {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setGoogleLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setGoogleLoading(false);
    setError('Login com Google não disponível ainda.');
  }

  const busy = loading || googleLoading;

  return (
    <AuthShell
      eyebrow="Plataforma jurídica"
      headline={<>Cada movimentação,<br />no momento certo.</>}
      description="Monitore processos judiciais em todos os tribunais e receba alertas instantâneos via WhatsApp."
      features={FEATURES}
    >
      <div className={styles.formHeader}>
        <div className={styles.formEyebrow}>Acesso à plataforma</div>
        <div className={styles.formTitle}>Bem-vindo de volta</div>
      </div>

      <button type="button" className={styles.btnOutline} onClick={handleGoogle} disabled={busy}>
        {googleLoading ? (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>Autenticando…</span>
        ) : (
          <>
            <GoogleIcon />
            Entrar com Google
          </>
        )}
      </button>

      <div className={styles.divider}>
        <div className={styles.dividerLine} />
        <span className={styles.dividerLabel}>ou</span>
        <div className={styles.dividerLine} />
      </div>

      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        <AuthField
          id="email"
          label="E-mail profissional"
          type="email"
          autoComplete="email"
          value={email}
          onChange={v => { setEmail(v); setError(''); }}
          placeholder="voce@escritorio.com.br"
          disabled={busy}
          error={!!error && !email.trim()}
        />

        <AuthField
          id="senha"
          label="Senha"
          type={showSenha ? 'text' : 'password'}
          autoComplete="current-password"
          value={senha}
          onChange={v => { setSenha(v); setError(''); }}
          placeholder="••••••••"
          disabled={busy}
          error={!!error && !senha.trim()}
          toggle={{ visible: showSenha, onToggle: () => setShowSenha(v => !v) }}
          labelRight={
            <button type="button" onClick={() => {}} className={styles.labelLink}>
              Esqueceu a senha?
            </button>
          }
        />

        {error && <div className={styles.errorBanner}>{error}</div>}

        <button type="submit" className={styles.btnPrimary} disabled={busy}>
          {loading ? 'Entrando…' : 'Entrar com e-mail'}
        </button>
      </form>

      <div className={styles.footer}>
        <div className={styles.footerLine}>
          Ainda não tem conta?{' '}
          <button type="button" onClick={() => router.push('/cadastro')} className={styles.btnLink}>
            Criar conta
          </button>
        </div>
        <div className={styles.footerLine}>
          Problemas de acesso?{' '}
          <button type="button" className={styles.footerSupport}>
            Fale com o suporte
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
