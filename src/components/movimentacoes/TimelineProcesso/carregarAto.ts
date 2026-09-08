'use server';

import { getMovimentacao } from '@/lib/api.server';

/** A busca confere a sessão e o acervo do usuário no backend. */
export async function carregarAto(id: string) {
  if (!id || id.length > 200) return null;
  return getMovimentacao(encodeURIComponent(id));
}
