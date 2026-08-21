/**
 * O usuário logado — espelha `UsuarioAtual` do backend
 * (`GET /users/me`, em `src/features/users/users.router.ts`).
 *
 * Só tipos e funções puras: este arquivo é importado por Client Components
 * (o rodapé do menu), então nada de `next/headers` aqui — a busca no servidor
 * vive em `api.server.ts` e a do cliente em `useUsuarioAtual`.
 */

export interface UsuarioAtual {
  id: string;
  name: string;
  email: string;
  role: string;
  /** Foto da conta Google, quando o login veio de lá. */
  avatarUrl: string | null;
  /**
   * A OAB não é campo de usuário no banco: mora nos `ScraperSecret`. `null`
   * significa que a pessoa nunca informou uma — e sem OAB não há descoberta de
   * processo, que é o que o painel vazio precisa dizer.
   */
  oab: { numero: string; uf: string } | null;
}

/**
 * Iniciais para o avatar: primeira letra do primeiro nome + a do último.
 * "matheus f almeida" → "MA". Nome de uma palavra só devolve uma letra —
 * melhor que repetir a mesma duas vezes.
 */
export function iniciaisDe(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primeira = partes[0]![0]!;
  const ultima = partes.length > 1 ? partes[partes.length - 1]![0]! : '';
  return (primeira + ultima).toUpperCase();
}

/** `{ numero: '35075', uf: 'DF' }` → `"DF/35.075"` — como a OAB é lida em voz alta. */
export function formatarOab(oab: { numero: string; uf: string }): string {
  const digitos = oab.numero.replace(/\D/g, '');
  const comPontos = digitos.length > 3
    ? digitos.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    : digitos;
  return `${oab.uf}/${comPontos}`;
}
