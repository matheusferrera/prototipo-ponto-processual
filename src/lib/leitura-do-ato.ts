import type { CategoriaMovimentacao, OrigemMovimentacao } from '@/types';

/**
 * A IA pode ler ESTE ato?
 *
 * Espelha o recorte de `etapaLeituraDoMovimento` no backend, e existe para o
 * botão de leitura não ser oferecido onde `POST /ia/movimentacoes/{id}`
 * responderia 409:
 *
 * - **origem**: só as três públicas (`djen`, `tribunalPublico`, `pdpj`). O ato
 *   do painel autenticado tem vencimento OFICIAL, e a leitura do ato é a única
 *   análise que mexe em prazo — por isso ela nunca o toca; `datajud` não tem
 *   texto nenhum;
 * - **categoria**: fora `publicacao` e `tramite`. "Publicado Despacho em 06/08"
 *   e "conclusos" não são o ato: ler qualquer uma devolve um resumo que repete
 *   o rótulo.
 *
 * **`categoria` NULA passa, e não é descuido** — é a mesma disjunção que o SQL
 * do backend precisa declarar (`categoria IS NULL OR categoria NOT IN (…)`): o
 * ato do DJEN é gravado sem categoria, e ele é justamente a única fonte de ato
 * ENDEREÇADO. Tratar o nulo como "não lê" esconderia o diário inteiro.
 *
 * Campo AUSENTE também passa, pelo mesmo princípio: quem decide de verdade é o
 * backend, e esta função só evita oferecer o que ele recusaria com certeza.
 *
 * **Mora fora de `movimentacao.ts` para poder ser testada.** Aquele arquivo
 * importa `@/lib/pje-text`, e o alias `@/` não resolve sob `node --test` — os
 * testes deste projeto rodam sem bundler.
 */
const ORIGENS_QUE_A_IA_LE = new Set<OrigemMovimentacao>(['djen', 'tribunalPublico', 'pdpj']);
const CATEGORIAS_QUE_A_IA_NAO_LE = new Set<CategoriaMovimentacao>(['publicacao', 'tramite']);

export function podeLerComIa(m: {
  origem?: OrigemMovimentacao | null;
  categoria?: CategoriaMovimentacao | null;
}): boolean {
  if (m.origem && !ORIGENS_QUE_A_IA_LE.has(m.origem)) return false;
  if (m.categoria && CATEGORIAS_QUE_A_IA_NAO_LE.has(m.categoria)) return false;
  return true;
}
