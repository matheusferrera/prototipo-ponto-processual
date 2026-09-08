import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader/PageHeader';
import { FilterWorkspace } from '@/components/filters/FilterWorkspace';
import { PageContent } from '@/components/movimentacoes/PageContent/PageContent';
import { CategoriaFilter } from '@/components/movimentacoes/CategoriaFilter/CategoriaFilter';
import { ActiveMovimentacaoFilters } from '@/components/movimentacoes/MovimentacaoFilters/ActiveMovimentacaoFilters';
import {
  MOVIMENTACAO_PANEL_HOST_ID,
  MovimentacaoFilterControls,
} from '@/components/movimentacoes/MovimentacaoFilters/MovimentacaoFilterControls';
import { AtoDetalhe } from '@/components/movimentacoes/AtoDetalhe/AtoDetalhe';
import { getMovimentacao, getMovimentacoes, getTribunaisDaCarteira } from '@/lib/api.server';
import {
  movimentacaoFiltersToApi,
  movimentacaoFiltersToRecord,
  parseMovimentacaoFilters,
  serializeMovimentacaoFilters,
  type MovimentacaoSearchParams,
} from '@/lib/movimentacao-filters';
import type { CategoriaMovimentacao } from '@/types';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Movimentações — Ponto Processual',
  description: 'Feed geral de movimentações de todos os processos monitorados.',
};

/**
 * Linhas por página.
 *
 * Eram 20, o que num acervo real dá 324 páginas — e cada "próxima" devolve a
 * pessoa ao topo. Com a linha em ~56px, 50 linhas ocupam menos rolagem do que
 * as 20 de antes ocupavam a 140px, e o número de páginas cai para um terço.
 */
const POR_PAGINA = 50;

/**
 * O `?aberta=` da URL, saneado.
 *
 * Ids são cuid do Prisma; qualquer coisa fora de `[A-Za-z0-9_-]` é lixo ou
 * tentativa, e vira "nenhuma linha aberta" em vez de chegar ao backend.
 */
function cleanId(valor: string | string[] | undefined): string | null {
  const bruto = (Array.isArray(valor) ? valor[0] : valor)?.trim() ?? '';
  return /^[A-Za-z0-9_-]{1,64}$/.test(bruto) ? bruto : null;
}

export default async function MovimentacoesPage({
  searchParams,
}: {
  searchParams: Promise<MovimentacaoSearchParams>;
}) {
  const sp = await searchParams;
  const requestedPage = Number(Array.isArray(sp.page) ? sp.page[0] : sp.page);
  const currentPage = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  /* Só os tribunais em que esta conta tem processo: filtrar por um tribunal
     vazio nunca devolveu nada, e a lista completa escondia os que chegam
     pelas fontes públicas. Ver `getTribunaisDaCarteira`. */
  const tribunals = await getTribunaisDaCarteira();
  const filters = parseMovimentacaoFilters(sp, tribunals.map(tribunal => tribunal.code));

  const { groups, total, totalPages, page: backendPage } =
    await getMovimentacoes(currentPage, POR_PAGINA, movimentacaoFiltersToApi(filters));

  const listParams = movimentacaoFiltersToRecord(filters);

  /* A LINHA ABERTA.
   *
   * `?aberta=<id>` é o estado da expansão, e ele vive na URL pelo mesmo motivo
   * que todo filtro deste projeto vive: o botão voltar fecha o painel, o
   * endereço é compartilhável, recarregar não perde o lugar, e nada disso custa
   * um client component.
   *
   * O id só vale para uma linha DESTA página. Um link com `?aberta=` de um ato
   * que ficou fora do recorte (outro filtro, outra página) não abre nada e não
   * redireciona: a URL do feed descreve a LISTA, e o parâmetro só tem efeito
   * sobre o que está nela. Quem quer o ato em si tem o endereço dele —
   * `/movimentacoes/<id>`, que continua de pé e é o que a timeline do processo
   * e o "ver o ato" dos prazos usam.
   *
   * O detalhe é buscado no servidor, como o resto da tela: o `textoOriginal`
   * não vem na listagem (média de 8 KB na origem `djen`, 151 KB no maior deste
   * acervo), então ele custa uma requisição — e essa requisição só existe
   * quando alguém abre uma linha. */
  const idAberto = cleanId(sp.aberta);
  const naPagina = idAberto
    ? groups.some(g => g.items.some(m => m.id === idAberto))
    : false;
  const detalhe = naPagina ? await getMovimentacao(idAberto!) : null;
  const aberta = detalhe ? { id: detalhe.id, painel: <AtoDetalhe mov={detalhe} /> } : null;

  /* O href de cada categoria: a seleção nova, sempre voltando à página 1 —
     senão o filtro herda a página 12 de um conjunto que acabou de encolher. */
  const hrefCategoria = (proximas: CategoriaMovimentacao[]) => {
    const params = serializeMovimentacaoFilters({ ...filters, categoria: proximas });
    const query = params.toString();
    return query ? `/movimentacoes?${query}` : '/movimentacoes';
  };

  const cabecalho = (
    <div className={styles.barra}>
      <CategoriaFilter ativas={filters.categoria} href={hrefCategoria} />
    </div>
  );

  return (
    <AppLayout
      active="Movimentações"
      mobileTitle="Movimentações"
      mobileBreadcrumb="Início / Movimentações"
      mobileActions={<MovimentacaoFilterControls filters={filters} tribunals={tribunals} variant="mobile" />}
    >
      <PageHeader basePath="/movimentacoes" title="Movimentações" breadcrumb="Início / Movimentações">
        <MovimentacaoFilterControls filters={filters} tribunals={tribunals} />
      </PageHeader>

      <FilterWorkspace panelHostId={MOVIMENTACAO_PANEL_HOST_ID}>
        <ActiveMovimentacaoFilters filters={filters} />

        <PageContent
          key={backendPage}
          movimentacoes={groups}
          total={total}
          totalPages={totalPages}
          currentPage={backendPage}
          porPagina={POR_PAGINA}
          listParams={listParams}
          aberta={aberta}
          pageInfo={cabecalho}
        />
      </FilterWorkspace>
    </AppLayout>
  );
}
