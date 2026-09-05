import type { CategoriaMovimentacao } from '@/types';

/**
 * As categorias como a tela as chama, na ordem em que aparecem no filtro.
 *
 * A ordem é do mais para o menos relevante ao advogado, e não a do enum: quem
 * abre o filtro procura "decisões" primeiro. `tramite` é o último de propósito —
 * é o que a API esconde por padrão, e marcá-lo é uma escolha de ver mais.
 */
export const CATEGORIAS_MOVIMENTACAO = [
  { value: 'decisorio', label: 'Decisões e despachos', curto: 'Decisão' },
  { value: 'atoDeParte', label: 'Petições e manifestações', curto: 'Petição' },
  { value: 'publicacao', label: 'Publicações e intimações', curto: 'Publicação' },
  { value: 'prazo', label: 'Prazos', curto: 'Prazo' },
  { value: 'tramite', label: 'Trâmite de cartório', curto: 'Cartório' },
] as const satisfies readonly { value: CategoriaMovimentacao; label: string; curto: string }[];

export const CATEGORIA_VALUES = CATEGORIAS_MOVIMENTACAO.map(c => c.value);

const POR_VALOR = new Map(CATEGORIAS_MOVIMENTACAO.map(c => [c.value as string, c]));

/** O rótulo curto, para o selo na movimentação. `null` volta vazio. */
export function categoriaCurta(categoria: CategoriaMovimentacao | null | undefined): string {
  return categoria ? POR_VALOR.get(categoria)?.curto ?? '' : '';
}

/** O rótulo por extenso, para filtro e chip. */
export function categoriaLabel(categoria: CategoriaMovimentacao | null | undefined): string {
  return categoria ? POR_VALOR.get(categoria)?.label ?? '' : '';
}

/** Sanitiza o que vem da URL: ignora valor desconhecido, sem quebrar a página. */
export function parseCategorias(valor: string | string[] | undefined): CategoriaMovimentacao[] {
  const bruto = Array.isArray(valor) ? valor[0] ?? '' : valor ?? '';
  return [...new Set(
    bruto.split(',').map(item => item.trim())
      .filter((item): item is CategoriaMovimentacao => POR_VALOR.has(item)),
  )];
}
