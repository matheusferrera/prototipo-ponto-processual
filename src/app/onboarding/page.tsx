import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ROTA_PAINEL } from '@/lib/rotas';
import { getTribunaisStatus, getUsuarioAtual } from '@/lib/api.server';
import { agruparPorSistema } from '@/lib/credenciais';
import { normalizarOab } from '@/lib/previa';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';

export const metadata: Metadata = {
  title: 'Bem-vindo — Ponto Processual',
  description: 'Informe sua OAB e a plataforma encontra seus processos nas bases públicas.',
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ oab?: string; uf?: string }>;
}) {
  const { oab, uf } = await searchParams;
  const [usuario, { tribunals }] = await Promise.all([
    getUsuarioAtual(),
    getTribunaisStatus(),
  ]);

  /* A OAB foi resolvida em `/oab/<numero>-<uf>` e chega pela URL. Sanitizada de
     novo aqui porque a barra de endereço é do usuário, não nossa. Quando falta,
     o fluxo pergunta — uma vez, na primeira tela — e a resposta volta a passar
     por `/oab`. */
  const oabInicial = normalizarOab(oab, uf) ?? undefined;

  /* Já monitora uma OAB — o onboarding não tem mais o que fazer aqui: esta tela
     existe para a única pergunta que ele faz, e ela já está respondida.

     O porteiro era `getScraperSecrets()` — ter CREDENCIAL de tribunal —, e isso
     deixou de descrever a conta pronta em 11/09/2026, quando a credencial saiu
     do onboarding: a conta que nasce só com OAB não tem secret nenhum, então
     toda visita caía na pergunta que ela já tinha respondido no cadastro.

     Com OAB na URL, tem: é alguém que acabou de consultar em `/oab` e clicou
     para monitorar aquela OAB. Devolver essa pessoa ao painel faria o clique
     não fazer nada, que é o beco em que a rota única de OAB não pode terminar. */
  if (usuario.oab && !oabInicial) {
    redirect(ROTA_PAINEL);
  }

  const sistemas = agruparPorSistema(tribunals);

  return <OnboardingFlow sistemas={sistemas} oabInicial={oabInicial} />;
}
