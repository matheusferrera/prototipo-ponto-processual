import type { Movimentacao } from '@/types';
import { assuntoCurto, semCodigo } from '@/lib/pje-text';

/**
 * Título de uma movimentação no feed: a parte (cliente) do processo — o que o
 * advogado procura ao varrer o feed, mesma hierarquia de `clientePrazo`. Sem
 * parte, cai para o assunto encurtado; sem nenhum dos dois, o tipo (que nunca
 * é vazio).
 */
export function clienteMovimentacao(m: Movimentacao): string {
  return m.parte || assuntoCurto(m.assunto) || m.tipo;
}

/** Assunto a exibir na meta — encurtado e omitido quando já subiu para o título. */
export function assuntoSecundario(m: Movimentacao, cliente: string): string | null {
  const curto = assuntoCurto(m.assunto);
  return curto && curto !== cliente ? curto : null;
}

/** Descrição da movimentação sem o id interno do documento que o PJe anexa no fim. */
export function descricaoMovimentacao(m: Movimentacao): string {
  return semCodigo(m.detail) || m.detail;
}
