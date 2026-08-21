'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthField } from '@/components/auth/AuthField';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { avisoGoogle, type AvisoGoogle } from '@/components/auth/google-erros';
import { limparOabNumero, limparOabUf, slugOab } from '@/lib/previa';
import { ROTA_PAINEL } from '@/lib/rotas';
import styles from '@/components/auth/AuthForm.module.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SENHA_MIN = 8;

/* Ordem visual dos campos — e, por isso, a ordem em que o primeiro inválido
   recebe foco no submit. Mexer aqui exige mexer no JSX junto.

   A OAB saiu desta lista: ela não é mais campo deste formulário. Quem digita
   uma OAB antes de ter conta passa por `/oab/<numero>-<uf>`, a única rota que
   resolve OAB — de lá ela volta na URL e chega aqui já respondida. */
const CAMPOS = ['nome', 'email', 'senha'] as const;
type CampoId = (typeof CAMPOS)[number];
type Valores = Record<CampoId, string>;

function erroDoCampo(id: CampoId, v: Valores): string {
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
  /**
   * OAB já resolvida em `/oab/<numero>-<uf>`, recebida pela URL. Não é campo
   * daqui: é uma resposta que veio pronta e que segue para o onboarding.
   */
  oab: { numero: string; uf: string } | null;
  /** Nome do advogado como o DJEN grafa, já formatado. Vira valor inicial editável. */
  nomeSugerido: string | null;
  /** Sem client id/secret configurados o botão do Google nem aparece. */
  googleAtivo: boolean;
  /** `?erro=` deixado pelo callback do Google quando o fluxo não completou. */
  erroGoogle?: string;
}

/**
 * Formulário de criação de conta — nome, e-mail e senha, ou o botão do Google.
 *
 * A OAB **não** é pedida aqui, e nenhuma porta de cadastro a exige. Ela tem uma
 * rota só: `/oab/<numero>-<uf>`, que consulta o diário e mostra os processos
 * antes de qualquer cadastro. A busca da home leva para lá, a busca deste
 * formulário leva para lá, e é de lá que a OAB chega — pela URL — a esta tela e,
 * depois, ao onboarding. Quem cria conta sem OAB (pelo Google, inclusive) é
 * perguntado uma vez no onboarding, que também manda para `/oab`.
 *
 * A regra que isso substitui: antes o botão do Google ficava travado sem OAB
 * preenchida aqui. O efeito era barrar o cadastro mais rápido do produto por um
 * dado que a conta consegue receber depois — e que agora tem um lugar próprio.
 */
export function CadastroForm({ oab, nomeSugerido, googleAtivo, erroGoogle }: CadastroFormProps) {
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
  /* ...e quando a conta que existe é do Google, a saída é o botão dele: mandar
     essa pessoa para o formulário de senha seria mandá-la tentar uma senha que
     ela nunca escolheu. */
  const [contaGoogle, setContaGoogle] = useState(false);
  const [aviso] = useState<AvisoGoogle | null>(() => avisoGoogle(erroGoogle));

  const valores: Valores = { nome, email, senha };
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

  /* A OAB viaja no cookie de estado do fluxo e volta no onboarding. O Google
     responde nome e e-mail; a OAB, não — e ela é o que liga o monitoramento.
     Sem OAB o botão continua valendo: o onboarding pergunta depois. */
  const hrefGoogle = `/api/auth/google/start?${new URLSearchParams({
    origem: '/cadastro',
    ...(oab ? { oab: oab.numero, uf: oab.uf } : {}),
  })}`;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErroServidor('');
    setContaExiste(false);
    setContaGoogle(false);
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
        if (data.code === 'GOOGLE_ACCOUNT') setContaGoogle(true);
        else if (res.status === 409 || JA_EXISTE.test(msg)) setContaExiste(true);
        else setErroServidor(msg);
        return;
      }

      /* `/auth/register` já abriu a sessão. Com OAB, a conta recebe agora o que
         faltava — `POST /scraper/monitorar-oab` grava a OAB e enfileira DJEN e
         consulta pública — e a pessoa vai direto ao painel, que abre em
         "sincronizando". Passar pelo onboarding aqui seria mostrar os mesmos
         processos que ela acabou de ver em `/oab`, um clique antes do painel.

         Se a gravação falhar, o painel recebe essa conta com "falta a sua OAB"
         e o campo para informá-la: o pedido não some, e a conta — que é o que
         acabou de ser criada — não fica presa a um erro de outra requisição. */
      if (oab) {
        await fetch('/api/scraper/monitorar-oab', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oabNumero: oab.numero, oabUf: oab.uf }),
        }).catch(() => {});
      }

      router.push(oab ? ROTA_PAINEL : '/onboarding');
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

      {aviso && (
        <div className={aviso.neutro ? styles.avisoBanner : styles.errorBanner} role="alert">
          {aviso.texto}
        </div>
      )}

      <BlocoOab oab={oab} desabilitado={loading} />

      {googleAtivo && (
        <>
          <GoogleButton label="Criar conta com Google" href={hrefGoogle} disabled={loading} />

          <div className={styles.divider}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerLabel}>ou</span>
            <div className={styles.dividerLine} />
          </div>
        </>
      )}

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
            setContaGoogle(false);
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

        {contaGoogle && (
          <div className={styles.saidaBanner} role="alert">
            <p>
              <strong>{email}</strong> já tem conta aqui, criada com o Google.
            </p>
            {googleAtivo ? (
              <GoogleButton label="Entrar com Google" href={hrefGoogle} />
            ) : (
              <Link href={hrefLogin} className={styles.saidaCta}>
                Ir para o login
              </Link>
            )}
          </div>
        )}

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

/**
 * A OAB nesta tela: confirmação de quem já passou por `/oab`, convite para quem
 * não passou — e, nos dois casos, uma busca que **navega** para `/oab/<slug>`.
 *
 * Não é um campo de formulário disfarçado: nada aqui é enviado junto do
 * cadastro. Digitar uma OAB é sair desta página para ver os processos dela, e
 * voltar por um link que já traz a OAB. É o que mantém uma rota só resolvendo
 * OAB — e o que impede a resposta "12345/SP" de virar, sem que ninguém veja
 * nada, uma busca que falha três telas adiante.
 */
function BlocoOab({ oab, desabilitado }: { oab: { numero: string; uf: string } | null; desabilitado?: boolean }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [numero, setNumero] = useState('');
  const [uf, setUf] = useState('');
  const [erro, setErro] = useState('');

  function buscar(e: FormEvent) {
    e.preventDefault();
    if (!numero) {
      setErro('Informe o número da sua OAB.');
      document.getElementById('busca-oab-numero')?.focus();
      return;
    }
    if (uf.length !== 2) {
      setErro('Informe a UF (duas letras).');
      document.getElementById('busca-oab-uf')?.focus();
      return;
    }
    setErro('');
    router.push(`/oab/${slugOab(numero, uf)}`);
  }

  return (
    <div className={styles.oabBloco}>
      <p className={styles.oabBlocoLinha}>
        {oab ? (
          <>
            Vamos começar pelos processos da OAB{' '}
            <strong>
              {oab.numero}/{oab.uf}
            </strong>
            , que você acabou de consultar.
          </>
        ) : (
          <>
            Tem OAB? Dá para <strong>ver seus processos antes</strong> de criar a conta — a consulta
            é em base pública e não pede senha de tribunal.
          </>
        )}
      </p>

      {!aberto ? (
        <button type="button" className={styles.oabBlocoAcao} onClick={() => setAberto(true)}>
          {oab ? 'Não é essa OAB? Consultar outra' : 'Consultar minha OAB'}
        </button>
      ) : (
        <form className={styles.oabBuscaForm} onSubmit={buscar} noValidate>
          <div className={styles.linhaOab}>
            <AuthField
              id="busca-oab-numero"
              label="Nº da OAB"
              type="text"
              autoComplete="off"
              inputMode="numeric"
              maxLength={8}
              value={numero}
              onChange={v => setNumero(limparOabNumero(v))}
              placeholder="12345"
              disabled={desabilitado}
              error={!!erro && !numero}
            />
            <AuthField
              id="busca-oab-uf"
              label="UF"
              type="text"
              autoComplete="off"
              maxLength={2}
              value={uf}
              onChange={v => setUf(limparOabUf(v))}
              placeholder="SP"
              disabled={desabilitado}
              error={!!erro && uf.length !== 2}
            />
          </div>
          {erro && <span className={styles.fieldError}>{erro}</span>}
          <button type="submit" className={styles.btnOutline} disabled={desabilitado}>
            Ver meus processos
          </button>
          <p className={styles.dicaCampo}>
            Isso abre a consulta pública numa página própria. De lá você volta para o cadastro com a
            OAB já respondida — o que estiver digitado aqui embaixo não é enviado ainda.
          </p>
        </form>
      )}
    </div>
  );
}
