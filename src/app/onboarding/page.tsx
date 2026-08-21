import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ROTA_PAINEL } from '@/lib/rotas';
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

  /* A OAB foi resolvida em `/oab/<numero>-<uf>` e chega pela URL. Sanitizada de
     novo aqui porque a barra de endereço é do usuário, não nossa. Quando falta,
     o fluxo pergunta — uma vez, na primeira tela — e a resposta volta a passar
     por `/oab`. */
  const oabInicial = normalizarOab(oab, uf) ?? undefined;

  /* Já tem credencial cadastrada — o onboarding não tem mais o que fazer aqui.
     Com OAB na URL, tem: é alguém que acabou de consultar em `/oab` e clicou
     para monitorar aquela OAB. Devolver essa pessoa ao painel faria o clique
     não fazer nada, que é o beco em que a rota única de OAB não pode terminar. */
  if (secrets.length > 0 && !oabInicial) {
    redirect(ROTA_PAINEL);
  }

  const sistemas = agruparPorSistema(tribunals);

  return <OnboardingFlow sistemas={sistemas} oabInicial={oabInicial} />;
}
