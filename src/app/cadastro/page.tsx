'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function CadastroPage() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!nome.trim() || !email.trim() || !senha.trim()) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    if (senha !== confirma) {
      setError('As senhas não coincidem.');
      return;
    }
    if (senha.length < 6) {
      setError('A senha deve ter ao menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nome, email, password: senha }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erro ao criar conta.');
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={styles.page}
      style={{ minHeight: '100vh', display: 'flex', fontFamily: 'var(--ui)' }}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 16, height: 16, background: '#fff', display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', color: '#fff' }}>
            Ponto Processual
          </span>
        </div>

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
            Comece a monitorar<br />seus processos hoje.
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
            Crie sua conta e receba alertas instantâneos de movimentações judiciais diretamente no WhatsApp.
          </div>
        </div>

        <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { icon: '§', title: 'Todos os tribunais', desc: 'TRF1, TRF3, TJDFT e mais em uma única plataforma.' },
            { icon: '◎', title: 'Alertas imediatos', desc: 'Notificações no WhatsApp no momento da movimentação.' },
            { icon: '▣', title: 'Controle de prazos', desc: 'Calendário automático com antecedência configurável.' },
          ].map((f, i) => (
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
              Criar conta
            </div>
            <div
              style={{
                fontWeight: 800,
                fontSize: 26,
                letterSpacing: '-0.03em',
                color: 'var(--ink)',
              }}
            >
              Comece gratuitamente
            </div>
          </div>

          {success ? (
            <div
              style={{
                padding: '20px 16px',
                background: 'var(--brick-soft)',
                borderLeft: '3px solid var(--brick)',
                fontSize: 14,
                color: 'var(--brick)',
                fontWeight: 600,
                lineHeight: 1.5,
              }}
            >
              Conta criada com sucesso!<br />
              <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--ink-2)' }}>
                Redirecionando para o login…
              </span>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <Field
                id="nome"
                label="Nome completo"
                type="text"
                autoComplete="name"
                value={nome}
                onChange={v => { setNome(v); setError(''); }}
                placeholder="João da Silva"
                disabled={loading}
                hasError={!!error && !nome.trim()}
              />
              <Field
                id="email"
                label="E-mail profissional"
                type="email"
                autoComplete="email"
                value={email}
                onChange={v => { setEmail(v); setError(''); }}
                placeholder="voce@escritorio.com.br"
                disabled={loading}
                hasError={!!error && !email.trim()}
              />
              <Field
                id="senha"
                label="Senha"
                type="password"
                autoComplete="new-password"
                value={senha}
                onChange={v => { setSenha(v); setError(''); }}
                placeholder="Mínimo 6 caracteres"
                disabled={loading}
                hasError={!!error && (!senha.trim() || senha !== confirma)}
              />
              <Field
                id="confirma"
                label="Confirmar senha"
                type="password"
                autoComplete="new-password"
                value={confirma}
                onChange={v => { setConfirma(v); setError(''); }}
                placeholder="Repita a senha"
                disabled={loading}
                hasError={!!error && senha !== confirma}
              />

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
                disabled={loading}
                style={{
                  fontFamily: 'var(--ui)',
                  fontWeight: 700,
                  fontSize: 14,
                  color: '#fff',
                  background: loading ? 'var(--ink-3)' : 'var(--brick)',
                  border: 'none',
                  padding: '11px 24px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.01em',
                  width: '100%',
                  marginTop: 4,
                  transition: 'background 0.1s',
                }}
              >
                {loading ? 'Criando conta…' : 'Criar conta'}
              </button>
            </form>
          )}

          <div
            style={{
              marginTop: 32,
              paddingTop: 20,
              borderTop: '1px solid var(--line-soft)',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              Já tem uma conta?{' '}
              <button
                type="button"
                onClick={() => router.push('/login')}
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
                Entrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  type,
  autoComplete,
  value,
  onChange,
  placeholder,
  disabled,
  hasError,
}: {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled: boolean;
  hasError: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        htmlFor={id}
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--ink-2)',
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          fontFamily: 'var(--ui)',
          fontSize: 14,
          color: 'var(--ink)',
          background: 'var(--paper)',
          border: `1px solid ${hasError ? 'var(--alert)' : 'var(--line)'}`,
          padding: '10px 12px',
          outline: 'none',
          width: '100%',
          opacity: disabled ? 0.6 : 1,
        }}
      />
    </div>
  );
}
