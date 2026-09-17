import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { AcoesDoTopoNoCelular, CabecalhoDaTela } from '@/components/movimentacoes/CabecalhoDaTela/CabecalhoDaTela';
import type { VistaDasMovimentacoes } from '@/components/movimentacoes/AbasDaTela/AbasDaTela';
import { ListaCompleta } from '@/components/movimentacoes/ListaCompleta/ListaCompleta';
import { ListaDeFios } from '@/components/movimentacoes/ListaDeFios/ListaDeFios';
import { Novidades, novidadesDe, primeiroDaAbaNovas } from '@/components/movimentacoes/Novidades/Novidades';
import { PainelDoAto } from '@/components/movimentacoes/PainelDoAto/PainelDoAto';
import {
  getFiosDoPrazo,
  getMovimentacao,
  getMovimentacoes,
  getTribunaisDaCarteira,
} from '@/lib/api.server';
import {
  MOVIMENTACOES_POR_PAGINA,
  movimentacaoFiltersToApi,
  parseMovimentacaoFilters,
  serializeMovimentacaoFilters,
  type MovimentacaoSearchParams,
} from '@/lib/movimentacao-filters';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Movimentações — Ponto Processual',
  description: 'O que chegou nos seus processos, o que corre nos seus prazos e o histórico inteiro.',
};

/**
 * Quantas novas a aba Novas traz de uma vez — o teto de `GET /movements`.
 * Passando disso, a aba diz que mostra as mais recentes e aponta para Todas.
 */
const TETO_DE_NOVAS = 100;

const primeiro = (valor: string | string[] | undefined) => (Array.isArray(valor) ? valor[0] : valor)?.trim() ?? '';

/**
 * A ABA pedida na URL — **Todas é a padrão** (pedido do dono do produto em
 * 17/09/2026: a tela abre pelo histórico, e é para lá que apontam o menu, o
 * "Ver todas" do painel e a dica da varredura). Novas e Com prazo são
 * explícitas (`?vista=novas`, `?vista=fios`).
 */
function vistaDaUrl(sp: MovimentacaoSearchParams): VistaDasMovimentacoes {
  const pedida = primeiro(sp.vista);
  return pedida === 'fios' || pedida === 'novas' ? pedida : 'todas';
}

/** Id de movimentação que pode virar requisição — o resto é descartado. */
const ID_VALIDO = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * MOVIMENTAÇÕES — três perguntas sobre o mesmo acervo.
 *
 * | aba | pergunta | de onde vem |
 * |---|---|---|
 * | Todas (padrão) | o histórico inteiro, com busca e filtros | `GET /movements` |
 * | Novas | o que chegou desde a última vez, e o que disso é comigo | `GET /movements?novas=true` |
 * | Com prazo | o que aconteceu nos casos em que tenho prazo correndo | `GET /deadlines/fios` |
 *
 * **Os filtros só valem na aba Todas.** A aba Novas responde "o que chegou",
 * e um recorte escondido ali faria a pessoa achar que não chegou nada; trocar
 * de aba descarta os filtros, e voltar para Todas os perde também — a URL de
 * Todas é a que os carrega.
 *
 * No desktop largo (≥1200px) a aba Novas vira tela dividida: a lista à
 * esquerda e o ato escolhido à direita (`?ato=`). Nas outras larguras e nas
 * outras abas, o ato abre como card por cima da lista (a fenda `@card`).
 */
export default async function MovimentacoesPage({
  searchParams,
}: {
  searchParams: Promise<MovimentacaoSearchParams>;
}) {
  const sp = await searchParams;
  const vista = vistaDaUrl(sp);

  const hrefVista = (proxima: VistaDasMovimentacoes) =>
    proxima === 'todas' ? '/movimentacoes' : `/movimentacoes?vista=${proxima}`;

  /* A contagem de prazos em curso e a de novas alimentam as abas de TODAS as
     vistas — por isso saem sempre, em paralelo com o que a vista pede. As
     contagens pedem uma linha só: o que interessa é o `total`. */
  const [tribunais, fios, contagemDeNovas] = await Promise.all([
    getTribunaisDaCarteira(),
    getFiosDoPrazo(vista === 'fios' ? 50 : 1),
    vista === 'novas'
      ? getMovimentacoes(1, TETO_DE_NOVAS, { novas: true })
      : getMovimentacoes(1, 1, { novas: true }),
  ]);
  const filtros = parseMovimentacaoFilters(sp, tribunais.map(t => t.code));
  const novas = contagemDeNovas.total;
  const vistasAte = contagemDeNovas.vistasAte;

  const comum = { vista, href: hrefVista, novas, emCurso: fios.total };
  const layout = (conteudo: ReactNode, processos?: number) => (
    <AppLayout
      active="Movimentações"
      mobileTitle="Movimentações"
      mobileActions={<AcoesDoTopoNoCelular {...comum} filtros={filtros} tribunais={tribunais} />}
      /* O badge do menu conta movimentações NÃO VISTAS — e só elas. Os prazos
         em curso daqui não entram como `prazos`: aquele contador, nas outras
         telas, é "o que ainda vence", e o `total` de `/deadlines/fios` inclui
         prazo aberto já vencido. Dois números diferentes no mesmo lugar do
         menu fariam a navegação mentir. */
      contadores={{ movimentacoes: novas }}
    >
      <CabecalhoDaTela {...comum} vistasAte={vistasAte} processos={processos} />
      {conteudo}
    </AppLayout>
  );

  /* ── COM PRAZO ─────────────────────────────────────────────────────────── */
  if (vista === 'fios') {
    return layout(
      <div className={styles.rolagem}>
        <ListaDeFios fios={fios.data} total={fios.total} />
      </div>,
    );
  }

  /* ── TODAS ─────────────────────────────────────────────────────────────── */
  if (vista === 'todas') {
    const lista = await getMovimentacoes(1, MOVIMENTACOES_POR_PAGINA, movimentacaoFiltersToApi(filtros));
    return layout(
      <div className={styles.rolagem}>
        <ListaCompleta
          /* A chave troca com o recorte: sem ela, o "carregar dias anteriores"
             guardaria as páginas do recorte anterior ao mudar um filtro. */
          key={serializeMovimentacaoFilters(filtros).toString()}
          grupos={lista.groups}
          filtros={filtros}
          tribunais={tribunais}
          pagina={lista.page}
          totalPaginas={lista.totalPages}
          vistasAte={lista.vistasAte}
          focarBusca={primeiro(sp.buscar) === '1'}
        />
      </div>,
    );
  }

  /* ── NOVAS ─────────────────────────────────────────────────────────────── */
  const itens = contagemDeNovas.groups.flatMap(g => g.items);
  const pedido = primeiro(sp.ato);
  const selecionado = ID_VALIDO.test(pedido) && itens.some(m => m.id === pedido)
    ? pedido
    : primeiroDaAbaNovas(itens);
  /* O ato do painel é buscado mesmo quando a tela é estreita e o painel não
     aparece: o servidor não sabe a largura. É uma requisição por página, e só
     na aba Novas com alguma novidade. */
  const mov = selecionado ? await getMovimentacao(selecionado) : null;

  const voltarCru = primeiro(sp.voltar);
  const voltar = voltarCru === 'nunca' ? null
    : voltarCru && !Number.isNaN(Date.parse(voltarCru)) ? voltarCru
    : undefined;

  return layout(
    <div className={styles.dividida} data-com-painel={itens.length > 0 || undefined}>
      <div className={styles.coluna}>
        <Novidades
          itens={itens}
          total={novas}
          vistasAte={vistasAte}
          selecionado={selecionado}
          hrefPainel={id => `/movimentacoes?vista=novas&ato=${encodeURIComponent(id)}`}
          voltar={voltar}
          emCurso={fios.total}
        />
      </div>
      {itens.length > 0 && <PainelDoAto mov={mov} />}
    </div>,
    itens.length > 0 ? novidadesDe(itens).totalProcessos : undefined,
  );
}
