import type { Metadata } from 'next';
import { AuthShell, type AuthFeature } from '@/components/auth/AuthShell';
import { googleAtivo } from '@/lib/google-oauth.server';
import { destinoSeguro } from '@/lib/utils';
import { ROTA_PAINEL } from '@/lib/rotas';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Entrar',
  description: 'Acesse sua conta do Ponto Processual.',
};

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

/**
 * Server Component — mesma divisão do /cadastro: a página lê a URL e o ambiente,
 * o formulário cuida do estado. É o que permite decidir **no servidor** se o
 * botão do Google existe: sem client id/secret ele some, em vez de aparecer e
 * falhar no clique.
 *
 * Os params vêm de `searchParams` (e não de `window`) para que servidor e
 * cliente pintem o mesmo primeiro quadro:
 * - `email` — `/cadastro` o repassa quando a conta já existe;
 * - `next` — para onde voltar depois de entrar (saneado aqui, ver `destinoSeguro`);
 * - `erro` — deixado pelo callback do Google quando o fluxo não completou.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string; erro?: string }>;
}) {
  const sp = await searchParams;

  return (
    <AuthShell
      eyebrow="Plataforma jurídica"
      headline={<>Cada movimentação,<br />no momento certo.</>}
      description="Monitore processos judiciais em todos os tribunais e receba alertas instantâneos via WhatsApp."
      features={FEATURES}
    >
      <LoginForm
        emailInicial={sp.email ?? ''}
        next={destinoSeguro(sp.next, ROTA_PAINEL)}
        erroGoogle={sp.erro}
        googleAtivo={googleAtivo()}
      />
    </AuthShell>
  );
}
