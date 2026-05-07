'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

const FEATURES = [
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
    await new Promise(r => setTimeout(r, 700));
    router.push('/');
  }

  async function handleGoogle() {
    setError('');
    setGoogleLoading(true);
    await new Promise(r => setTimeout(r, 800));
    router.push('/');
  }

  const busy = loading || googleLoading;

  return (
    <div
      className={styles.page}
      style={{
        minHeight: '100vh',
        display: 'flex',
        fontFamily: 'var(--ui)',
      }}
    >
      {/* ── Painel esquerdo — branding ── */}
      <div
        className={styles.left}
        style={{
          width: '45%',
          background: 'var(--brick)',
          display: 'flex',
          flexDirection: 'column',
          padding: '48px 52px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Marca */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 16,
              height: 16,
              background: '#fff',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontWeight: 800,
              fontSize: 17,
              letterSpacing: '-0.02em',
              color: '#fff',
            }}
          >
            Ponto Processual
          </span>
        </div>

        {/* Tagline */}
        <div style={{ marginTop: 'auto', paddingBottom: 8 }}>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.55)',
              marginBottom: 14,
            }}
          >
            Plataforma jurídica
          </div>
          <div
            style={{
              fontWeight: 800,
              fontSize: 32,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              color: '#fff',
              maxWidth: 340,
            }}
          >
            Cada movimentação,<br />no momento certo.
          </div>
          <div
            style={{
              marginTop: 16,
              fontSize: 14,
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.7)',
              maxWidth: 320,
            }}
          >
            Monitore processos judiciais em todos os tribunais e receba alertas instantâneos via WhatsApp.
          </div>
        </div>

        {/* Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 40 }}>
          {FEATURES.map((f, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 14,
                padding: '16px 0',
                borderTop: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.45)',
                  flexShrink: 0,
                  marginTop: 1,
                  width: 18,
                }}
              >
                {f.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', marginBottom: 3 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Ornamento geométrico */}
        <div
          style={{
            position: 'absolute',
            bottom: -60,
            right: -60,
            width: 200,
            height: 200,
            border: '40px solid rgba(255,255,255,0.05)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 80,
            right: -90,
            width: 200,
            height: 200,
            border: '1px solid rgba(255,255,255,0.08)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* ── Painel direito — formulário ── */}
      <div
        className={styles.right}
        style={{
          flex: 1,
          background: 'var(--paper-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 40px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Cabeçalho do form */}
          <div style={{ marginBottom: 32 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'var(--ink-3)',
                marginBottom: 6,
              }}
            >
              Acesso à plataforma
            </div>
            <div
              style={{
                fontWeight: 800,
                fontSize: 26,
                letterSpacing: '-0.03em',
                color: 'var(--ink)',
              }}
            >
              Bem-vindo de volta
            </div>
          </div>

          {/* Botão Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            style={{
              fontFamily: 'var(--ui)',
              fontWeight: 600,
              fontSize: 13,
              color: 'var(--ink)',
              background: 'var(--paper)',
              border: '1px solid var(--line)',
              padding: '10px 16px',
              cursor: busy ? 'not-allowed' : 'pointer',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              opacity: busy ? 0.6 : 1,
              transition: 'border-color 0.1s',
            }}
          >
            {googleLoading ? (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>Autenticando…</span>
            ) : (
              <>
                <GoogleIcon />
                Entrar com Google
              </>
            )}
          </button>

          {/* Divisor */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              margin: '24px 0',
            }}
          >
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--ink-4)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              ou
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>

          {/* Formulário e-mail/senha */}
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                htmlFor="email"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--ink-2)',
                }}
              >
                E-mail profissional
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="voce@escritorio.com.br"
                disabled={busy}
                style={{
                  fontFamily: 'var(--ui)',
                  fontSize: 14,
                  color: 'var(--ink)',
                  background: 'var(--paper)',
                  border: `1px solid ${error && !email.trim() ? 'var(--alert)' : 'var(--line)'}`,
                  padding: '10px 12px',
                  outline: 'none',
                  width: '100%',
                  opacity: busy ? 0.6 : 1,
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label
                  htmlFor="senha"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--ink-2)',
                  }}
                >
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => {}}
                  style={{
                    fontFamily: 'var(--ui)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--brick)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    letterSpacing: '0.02em',
                  }}
                >
                  Esqueceu a senha?
                </button>
              </div>
              <input
                id="senha"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={e => { setSenha(e.target.value); setError(''); }}
                placeholder="••••••••"
                disabled={busy}
                style={{
                  fontFamily: 'var(--ui)',
                  fontSize: 14,
                  color: 'var(--ink)',
                  background: 'var(--paper)',
                  border: `1px solid ${error && !senha.trim() ? 'var(--alert)' : 'var(--line)'}`,
                  padding: '10px 12px',
                  outline: 'none',
                  width: '100%',
                  opacity: busy ? 0.6 : 1,
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--alert)',
                  background: 'var(--alert-soft)',
                  borderLeft: '3px solid var(--alert)',
                  padding: '9px 12px',
                  fontWeight: 500,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              style={{
                fontFamily: 'var(--ui)',
                fontWeight: 700,
                fontSize: 14,
                color: '#fff',
                background: busy ? 'var(--ink-3)' : 'var(--brick)',
                border: 'none',
                padding: '11px 24px',
                cursor: busy ? 'not-allowed' : 'pointer',
                letterSpacing: '0.01em',
                width: '100%',
                marginTop: 4,
                transition: 'background 0.1s',
              }}
            >
              {loading ? 'Entrando…' : 'Entrar com e-mail'}
            </button>
          </form>

          {/* Rodapé */}
          <div
            style={{
              marginTop: 32,
              paddingTop: 20,
              borderTop: '1px solid var(--line-soft)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              Ainda não tem conta?{' '}
              <button
                type="button"
                style={{
                  fontFamily: 'var(--ui)',
                  fontWeight: 700,
                  fontSize: 12,
                  color: 'var(--brick)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Solicitar acesso
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>
              Problemas de acesso?{' '}
              <button
                type="button"
                style={{
                  fontFamily: 'var(--ui)',
                  fontWeight: 600,
                  fontSize: 11,
                  color: 'var(--ink-3)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Fale com o suporte
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
