'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AuthShell, type AuthFeature } from '@/components/auth/AuthShell';
import { AuthField } from '@/components/auth/AuthField';
import styles from '@/components/auth/AuthForm.module.css';

const FEATURES: AuthFeature[] = [
  { icon: '§', title: 'Todos os tribunais', desc: 'TRF1, TRF3, TJDFT e mais em uma única plataforma.' },
  { icon: '◎', title: 'Alertas imediatos', desc: 'Notificações no WhatsApp no momento da movimentação.' },
  { icon: '▣', title: 'Controle de prazos', desc: 'Calendário automático com antecedência configurável.' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fieldError(id: 'nome' | 'email' | 'senha' | 'confirma', values: { nome: string; email: string; senha: string; confirma: string }): string {
  switch (id) {
    case 'nome':
      return values.nome.trim() ? '' : 'Informe seu nome completo.';
    case 'email':
      if (!values.email.trim()) return 'Informe seu e-mail.';
      return EMAIL_RE.test(values.email.trim()) ? '' : 'Informe um e-mail válido.';
    case 'senha':
      return values.senha.length >= 6 ? '' : 'A senha deve ter ao menos 6 caracteres.';
    case 'confirma':
      if (!values.confirma) return 'Confirme a senha.';
      return values.confirma === values.senha ? '' : 'As senhas não coincidem.';
  }
}

export default function CadastroPage() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirma, setShowConfirma] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);

  const values = { nome, email, senha, confirma };
  const errors = {
    nome: fieldError('nome', values),
    email: fieldError('email', values),
    senha: fieldError('senha', values),
    confirma: fieldError('confirma', values),
  };

  function markTouched(id: string) {
    setTouched(t => ({ ...t, [id]: true }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError('');
    setTouched({ nome: true, email: true, senha: true, confirma: true });

    const firstInvalid = (['nome', 'email', 'senha', 'confirma'] as const).find(id => errors[id]);
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
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
        setServerError(data.error ?? 'Erro ao criar conta.');
        return;
      }
      setSuccess(true);
      // Onboarding cuida do primeiro tribunal — login primeiro, pois /auth/register não autentica.
      setTimeout(() => router.push('/login?next=/onboarding'), 1800);
    } catch {
      setServerError('Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Plataforma jurídica"
      headline={<>Comece a monitorar<br />seus processos hoje.</>}
      description="Crie sua conta e receba alertas instantâneos de movimentações judiciais diretamente no WhatsApp."
      features={FEATURES}
    >
      <div className={styles.formHeader}>
        <div className={styles.formEyebrow}>Criar conta</div>
        <div className={styles.formTitle}>Comece gratuitamente</div>
      </div>

      {success ? (
        <div className={styles.successBanner}>
          Conta criada com sucesso!
          <span className={styles.successBannerSub}>Redirecionando para o login…</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          <AuthField
            id="nome"
            label="Nome completo"
            type="text"
            autoComplete="name"
            value={nome}
            onChange={setNome}
            onBlur={() => markTouched('nome')}
            placeholder="João da Silva"
            disabled={loading}
            error={touched.nome ? errors.nome : ''}
          />
          <AuthField
            id="email"
            label="E-mail profissional"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            onBlur={() => markTouched('email')}
            placeholder="voce@escritorio.com.br"
            disabled={loading}
            error={touched.email ? errors.email : ''}
          />
          <AuthField
            id="senha"
            label="Senha"
            type={showSenha ? 'text' : 'password'}
            autoComplete="new-password"
            value={senha}
            onChange={setSenha}
            onBlur={() => markTouched('senha')}
            placeholder="Mínimo 6 caracteres"
            disabled={loading}
            error={touched.senha ? errors.senha : ''}
            toggle={{ visible: showSenha, onToggle: () => setShowSenha(v => !v) }}
          />
          <AuthField
            id="confirma"
            label="Confirmar senha"
            type={showConfirma ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirma}
            onChange={setConfirma}
            onBlur={() => markTouched('confirma')}
            placeholder="Repita a senha"
            disabled={loading}
            error={touched.confirma ? errors.confirma : ''}
            toggle={{ visible: showConfirma, onToggle: () => setShowConfirma(v => !v) }}
          />

          {serverError && <div className={styles.errorBanner}>{serverError}</div>}

          <button type="submit" className={styles.btnPrimary} disabled={loading}>
            {loading ? 'Criando conta…' : 'Criar conta'}
          </button>

          <p className={styles.footerNote}>
            Ao criar sua conta você também cria seu escritório no Ponto Processual (plano de teste,
            sem custo) — dá para convidar colegas depois, em Configurações.
          </p>
        </form>
      )}

      <div className={styles.footer}>
        <div className={styles.footerLine}>
          Já tem uma conta?{' '}
          <button type="button" onClick={() => router.push('/login')} className={styles.btnLink}>
            Entrar
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
