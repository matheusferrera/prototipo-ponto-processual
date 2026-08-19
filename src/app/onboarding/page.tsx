import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getScraperSecrets, getTribunaisStatus } from '@/lib/api.server';
import { agruparPorSistema } from '@/lib/credenciais';
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

  // Vem da busca por OAB da landing; sanitizado aqui porque a URL é do usuário.
  const numero = (oab ?? '').replace(/\D/g, '').slice(0, 8);
  const ufSigla = (uf ?? '').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2);
  const oabInicial = numero && ufSigla.length === 2 ? { numero, uf: ufSigla } : undefined;

  return <OnboardingFlow sistemas={sistemas} oabInicial={oabInicial} />;
}
