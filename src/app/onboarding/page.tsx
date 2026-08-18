import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getScraperSecrets, getTribunaisStatus } from '@/lib/api.server';
import { agruparPorSistema } from '@/lib/credenciais';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';

export const metadata: Metadata = {
  title: 'Bem-vindo — Ponto Processual',
  description: 'Cadastre seu primeiro tribunal para começar a monitorar seus processos.',
};

export default async function OnboardingPage() {
  const [secrets, { tribunals }] = await Promise.all([
    getScraperSecrets(),
    getTribunaisStatus(),
  ]);

  // Já tem credencial cadastrada — onboarding não tem mais o que fazer aqui.
  if (secrets.length > 0) {
    redirect('/');
  }

  const sistemas = agruparPorSistema(tribunals);

  return <OnboardingFlow sistemas={sistemas} />;
}
