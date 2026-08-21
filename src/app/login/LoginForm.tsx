'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthField } from '@/components/auth/AuthField';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { avisoGoogle } from '@/components/auth/google-erros';
import styles from '@/components/auth/AuthForm.module.css';

interface LoginFormProps {
  /** `/cadastro` manda `?email=` quando a conta já existe — a pessoa não redigita. */
  emailInicial: string;
  /** Para onde ir depois de entrar, já validado no servidor. */
  next: string;
  /** `?erro=` deixado pelo callback do Google. */
  erroGoogle?: string;
  /** Sem client id/secret configurados o botão nem aparece — ver `googleAtivo`. */
  googleAtivo: boolean;
}

export function LoginForm({ emailInicial, next, erroGoogle, googleAtivo }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(emailInicial);
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  /* Login por senha numa conta que só tem Google: em vez de "credenciais
     inválidas", a tela aponta a porta certa. */
  const [contaGoogle, setContaGoogle] = useState(false);
  const [aviso, setAviso] = useState(() => avisoGoogle(erroGoogle));

  const hrefGoogle = `/api/auth/google/start?${new URLSearchParams({
    origem: '/login',
    ...(next && next !== '/' ? { next } : {}),
  })}`;

  function limparMensagens() {
    setError('');
    setAviso(null);
    setContaGoogle(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    limparMensagens();

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
        if (data.code === 'GOOGLE_ACCOUNT') setContaGoogle(true);
        else setError(data.error ?? 'Credenciais inválidas.');
        return;
      }
      router.push(next);
    } catch {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className={styles.formHeader}>
        <div className={styles.formEyebrow}>Acesso à plataforma</div>
        <div className={styles.formTitle}>Bem-vindo de volta</div>
      </div>

      {aviso && (
        <div className={aviso.neutro ? styles.avisoBanner : styles.errorBanner} role="alert">
          {aviso.texto}
        </div>
      )}

      {googleAtivo && (
        <>
          <GoogleButton label="Entrar com Google" href={hrefGoogle} disabled={loading} />

          <div className={styles.divider}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerLabel}>ou</span>
            <div className={styles.dividerLine} />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        <AuthField
          id="email"
          label="E-mail profissional"
          type="email"
          autoComplete="email"
          value={email}
          onChange={v => { setEmail(v); limparMensagens(); }}
          placeholder="voce@escritorio.com.br"
          disabled={loading}
          error={!!error && !email.trim()}
        />

        <AuthField
          id="senha"
          label="Senha"
          type={showSenha ? 'text' : 'password'}
          autoComplete="current-password"
          value={senha}
          onChange={v => { setSenha(v); limparMensagens(); }}
          placeholder="••••••••"
          disabled={loading}
          error={!!error && !senha.trim()}
          toggle={{ visible: showSenha, onToggle: () => setShowSenha(v => !v) }}
          labelRight={
            <button type="button" onClick={() => {}} className={styles.labelLink}>
              Esqueceu a senha?
            </button>
          }
        />

        {contaGoogle && (
          <div className={styles.saidaBanner} role="alert">
            <p>
              A conta de <strong>{email}</strong> foi criada com o Google — ela não tem senha.
            </p>
            {googleAtivo ? (
              <GoogleButton label="Entrar com Google" href={hrefGoogle} />
            ) : (
              <p>Ative a entrada com o Google ou fale com o suporte.</p>
            )}
          </div>
        )}

        {error && <div className={styles.errorBanner} role="alert">{error}</div>}

        <button type="submit" className={styles.btnPrimary} disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar com e-mail'}
        </button>
      </form>

      <div className={styles.footer}>
        <div className={styles.footerLine}>
          Ainda não tem conta?{' '}
          <Link href="/cadastro" className={styles.btnLink}>
            Criar conta
          </Link>
        </div>
        <div className={styles.footerLine}>
          Problemas de acesso?{' '}
          <button type="button" className={styles.footerSupport}>
            Fale com o suporte
          </button>
        </div>
      </div>
    </>
  );
}
