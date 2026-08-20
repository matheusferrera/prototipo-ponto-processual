'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthField } from '@/components/auth/AuthField';
import styles from '@/components/auth/AuthForm.module.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SENHA_MIN = 8;

type CampoId = 'nome' | 'email' | 'senha';

function erroDoCampo(id: CampoId, v: { nome: string; email: string; senha: string }): string {
  switch (id) {
    case 'nome':
      return v.nome.trim() ? '' : 'Informe seu nome completo.';
    case 'email':
      if (!v.email.trim()) return 'Informe seu e-mail.';
      return EMAIL_RE.test(v.email.trim()) ? '' : 'Informe um e-mail válido.';
    case 'senha':
      return v.senha.length >= SENHA_MIN ? '' : `A senha deve ter ao menos ${SENHA_MIN} caracteres.`;
  }
}

/** Mensagens do backend que significam "essa conta já existe". */
const JA_EXISTE = /j[áa]\s*(existe|cadastrad)|dispon[íi]vel|em uso|already/i;

interface CadastroFormProps {
  /** OAB vinda da busca pública — repassada ao onboarding para não perguntar de novo. */
  oab: { numero: string; uf: string } | null;
  /** Nome do advogado como o DJEN grafa, já formatado. Vira valor inicial editável. */
  nomeSugerido: string | null;
}

export function CadastroForm({ oab, nomeSugerido }: CadastroFormProps) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeSugerido ?? '');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [tocado, setTocado] = useState<Partial<Record<CampoId, boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [erroServidor, setErroServidor] = useState('');
  /* Conta existente não é erro de preenchimento: vira uma saída para o login,
     não um texto vermelho que deixa a pessoa sem próximo passo. */
  const [contaExiste, setContaExiste] = useState(false);

  const valores = { nome, email, senha };
  const erros = {
    nome: erroDoCampo('nome', valores),
    email: erroDoCampo('email', valores),
    senha: erroDoCampo('senha', valores),
  };

  const repasseOab = oab ? `?${new URLSearchParams({ oab: oab.numero, uf: oab.uf })}` : '';
  const hrefLogin = `/login?${new URLSearchParams({
    email,
    ...(oab ? { next: `/onboarding${repasseOab}` } : {}),
  })}`;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErroServidor('');
    setContaExiste(false);
    setTocado({ nome: true, email: true, senha: true });

    const primeiroInvalido = (['nome', 'email', 'senha'] as const).find(id => erros[id]);
    if (primeiroInvalido) {
      document.getElementById(primeiroInvalido)?.focus();
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
        const msg: string = data.error ?? 'Erro ao criar conta.';
        if (res.status === 409 || JA_EXISTE.test(msg)) setContaExiste(true);
        else setErroServidor(msg);
        return;
      }

      // `/auth/register` já faz login; a OAB segue na URL para o onboarding.
      router.push(`/onboarding${repasseOab}`);
      return;
    } catch {
      setErroServidor('Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className={styles.formHeader}>
        <div className={styles.formEyebrow}>Criar conta</div>
        <div className={styles.formTitle}>
          {nomeSugerido ? `Vamos lá, ${nomeSugerido.split(' ')[0]}` : 'Comece gratuitamente'}
        </div>
      </div>

      <ol className={styles.passos} aria-label="Etapas do cadastro">
        <li className={styles.passo} data-atual>
          <span className={styles.passoNum}>1</span> Criar a conta
        </li>
        <li className={styles.passo}>
          <span className={styles.passoNum}>2</span> Conectar um tribunal
        </li>
      </ol>

      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        <AuthField
          id="nome"
          label="Nome completo"
          type="text"
          autoComplete="name"
          value={nome}
          onChange={setNome}
          onBlur={() => setTocado(t => ({ ...t, nome: true }))}
          placeholder="João da Silva"
          disabled={loading}
          error={tocado.nome ? erros.nome : ''}
        />
        {nomeSugerido && nome === nomeSugerido && (
          <p className={styles.dicaCampo}>
            Preenchemos com o nome que o diário associa a esta OAB. Ajuste se preferir.
          </p>
        )}

        <AuthField
          id="email"
          label="E-mail profissional"
          type="email"
          autoComplete="email"
          value={email}
          onChange={v => {
            setEmail(v);
            setContaExiste(false);
          }}
          onBlur={() => setTocado(t => ({ ...t, email: true }))}
          placeholder="voce@escritorio.com.br"
          disabled={loading}
          error={tocado.email ? erros.email : ''}
        />

        {/* Sem "confirmar senha": o olho de mostrar/ocultar já deixa conferir, e
            gerenciador de senha preenche os dois campos igual — o segundo campo
            não pega erro nenhum e custa uma desistência. */}
        <AuthField
          id="senha"
          label="Senha"
          type={showSenha ? 'text' : 'password'}
          autoComplete="new-password"
          value={senha}
          onChange={setSenha}
          onBlur={() => setTocado(t => ({ ...t, senha: true }))}
          placeholder={`Mínimo ${SENHA_MIN} caracteres`}
          disabled={loading}
          error={tocado.senha ? erros.senha : ''}
          toggle={{ visible: showSenha, onToggle: () => setShowSenha(v => !v) }}
        />

        {contaExiste && (
          <div className={styles.saidaBanner} role="alert">
            <p>
              Já existe uma conta com <strong>{email}</strong>.
            </p>
            <Link href={hrefLogin} className={styles.saidaCta}>
              Entrar nessa conta
            </Link>
          </div>
        )}

        {erroServidor && (
          <div className={styles.errorBanner} role="alert">
            {erroServidor}
          </div>
        )}

        <button type="submit" className={styles.btnPrimary} disabled={loading}>
          {loading ? 'Criando conta…' : 'Criar conta'}
        </button>

        <p className={styles.footerNote}>
          Ao criar sua conta você também cria seu escritório no Ponto Processual (plano de teste,
          sem custo) — dá para convidar colegas depois, em Configurações.
        </p>
      </form>

      <div className={styles.footer}>
        <div className={styles.footerLine}>
          Já tem uma conta?{' '}
          <Link href={hrefLogin} className={styles.btnLink}>
            Entrar
          </Link>
        </div>
      </div>
    </>
  );
}
