'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthField } from '@/components/auth/AuthField';
import { limparOabNumero, limparOabUf, normalizarOab } from '@/lib/previa';
import styles from '@/components/auth/AuthForm.module.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SENHA_MIN = 8;

/* Ordem visual dos campos — e, por isso, a ordem em que o primeiro inválido
   recebe foco no submit. Mexer aqui exige mexer no JSX junto. */
const CAMPOS = ['nome', 'oabNumero', 'oabUf', 'email', 'senha'] as const;
type CampoId = (typeof CAMPOS)[number];
type Valores = Record<CampoId, string>;

function erroDoCampo(id: CampoId, v: Valores): string {
  switch (id) {
    case 'nome':
      return v.nome.trim() ? '' : 'Informe seu nome completo.';
    case 'oabNumero':
      return v.oabNumero ? '' : 'Informe o número da sua OAB.';
    case 'oabUf':
      /* Curto de propósito: a mensagem cai numa coluna de 88px, e qualquer
         frase maior quebra em três linhas e empurra o resto do formulário. */
      return v.oabUf.length === 2 ? '' : 'Falta a UF.';
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
  /**
   * OAB vinda da busca pública, quando o visitante chegou por ela. É valor
   * inicial de um campo deste formulário, não um dado de passagem: a pergunta
   * "qual é a sua OAB" acontece aqui e em nenhum outro lugar do cadastro.
   */
  oab: { numero: string; uf: string } | null;
  /** Nome do advogado como o DJEN grafa, já formatado. Vira valor inicial editável. */
  nomeSugerido: string | null;
}

/**
 * Formulário de criação de conta — e o único lugar do fluxo que pergunta a OAB.
 *
 * Antes a OAB era pedida no hero da landing e **de novo** no onboarding, logo
 * depois do cadastro: quem tinha acabado de ver os próprios processos na tela
 * era recebido com "informe sua OAB", como se nada tivesse acontecido. Agora
 * ela é um campo daqui — preenchido quando veio da busca, digitado quando a
 * pessoa entrou direto por "Criar conta" — e o onboarding só recebe a resposta.
 */
export function CadastroForm({ oab, nomeSugerido }: CadastroFormProps) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeSugerido ?? '');
  const [oabNumero, setOabNumero] = useState(oab?.numero ?? '');
  const [oabUf, setOabUf] = useState(oab?.uf ?? '');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [tocado, setTocado] = useState<Partial<Record<CampoId, boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [erroServidor, setErroServidor] = useState('');
  /* Conta existente não é erro de preenchimento: vira uma saída para o login,
     não um texto vermelho que deixa a pessoa sem próximo passo. */
  const [contaExiste, setContaExiste] = useState(false);

  const valores: Valores = { nome, oabNumero, oabUf, email, senha };
  const erros = {
    nome: erroDoCampo('nome', valores),
    oabNumero: erroDoCampo('oabNumero', valores),
    oabUf: erroDoCampo('oabUf', valores),
    email: erroDoCampo('email', valores),
    senha: erroDoCampo('senha', valores),
  };

  /* A OAB que segue para o onboarding vem do estado do formulário, não do prop:
     o campo é editável, e é o valor final que vale. */
  const oabFinal = normalizarOab(oabNumero, oabUf);
  const repasseOab = oabFinal
    ? `?${new URLSearchParams({ oab: oabFinal.numero, uf: oabFinal.uf })}`
    : '';
  const hrefLogin = `/login?${new URLSearchParams({
    email,
    ...(oabFinal ? { next: `/onboarding${repasseOab}` } : {}),
  })}`;

  /* Veio da busca e não foi mexido — o rodapé do campo confirma a origem em vez
     de repetir a instrução genérica. */
  const oabIntacta = !!oab && oabNumero === oab.numero && oabUf === oab.uf;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErroServidor('');
    setContaExiste(false);
    setTocado(Object.fromEntries(CAMPOS.map(c => [c, true])));

    const primeiroInvalido = CAMPOS.find(id => erros[id]);
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

      /* `/auth/register` já faz login. A OAB vai na URL porque a conta ainda não
         a tem: quem a grava é `POST /scraper/monitorar-oab`, que o onboarding
         dispara assim que a busca volta com resultado. */
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

        {/* A OAB fica junto do nome, não no fim: é identidade profissional, e
            quem veio da busca reencontra aqui o dado que o trouxe — o formulário
            continua a conversa em vez de recomeçá-la. */}
        <div className={styles.linhaOab}>
          <AuthField
            id="oabNumero"
            label="Nº da OAB"
            type="text"
            autoComplete="off"
            inputMode="numeric"
            maxLength={8}
            value={oabNumero}
            onChange={v => setOabNumero(limparOabNumero(v))}
            onBlur={() => setTocado(t => ({ ...t, oabNumero: true }))}
            placeholder="12345"
            disabled={loading}
            error={tocado.oabNumero ? erros.oabNumero : ''}
          />
          <AuthField
            id="oabUf"
            label="UF"
            type="text"
            autoComplete="off"
            maxLength={2}
            value={oabUf}
            onChange={v => setOabUf(limparOabUf(v))}
            onBlur={() => setTocado(t => ({ ...t, oabUf: true }))}
            placeholder="SP"
            disabled={loading}
            error={tocado.oabUf ? erros.oabUf : ''}
          />
        </div>
        <p className={styles.dicaCampo}>
          {oabIntacta
            ? 'É a OAB que você acabou de consultar — ajuste se não for essa.'
            : 'É por ela que localizamos seus processos nos diários oficiais.'}
        </p>

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
