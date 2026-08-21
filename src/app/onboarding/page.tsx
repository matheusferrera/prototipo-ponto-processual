import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getScraperSecrets, getTribunaisStatus } from '@/lib/api.server';
import { agruparPorSistema } from '@/lib/credenciais';
import { normalizarOab } from '@/lib/previa';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';

export const metadata: Metadata = {
  title: 'Bem-vindo — Ponto Processual',
  description: 'Cadastre seu primeiro tribunal para começar a monitorar seus processos.',
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ oab?: string; uf?: string }>;
}) {
  const { oab, uf } = await searchParams;
  const [secrets, { tribunals }] = await Promise.all([
    getScraperSecrets(),
    getTribunaisStatus(),
  ]);

  // Já tem credencial cadastrada — onboarding não tem mais o que fazer aqui.
  if (secrets.length > 0) {
    redirect('/');
  }

  const sistemas = agruparPorSistema(tribunals);

  /* A OAB foi respondida no /cadastro e chega pela URL. Sanitizada de novo
     aqui porque a barra de endereço é do usuário, não nossa. Quando falta
     (conta antiga, ou volta pelo painel vazio), o fluxo não pergunta: vai
     direto para a conexão do tribunal. */
  const oabInicial = normalizarOab(oab, uf) ?? undefined;

  return <OnboardingFlow sistemas={sistemas} oabInicial={oabInicial} />;
}
