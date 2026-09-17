'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, SlidersHorizontal, X } from 'lucide-react';
import { Sheet, SheetClose, SheetContent, SheetTitle } from '@/components/ui/sheet';
import type { TribunalOption } from '@/lib/tribunals';
import { CATEGORIAS_MOVIMENTACAO } from '@/lib/categoria-movimentacao';
import {
  DEFAULT_MOVIMENTACAO_FILTERS,
  QUEM_MOVIMENTACAO,
  alternarCategoria,
  categoriaLigada,
  countActiveMovimentacaoFilters,
  serializeMovimentacaoFilters,
  type MovimentacaoFilterState,
  type MovimentacaoSort,
} from '@/lib/movimentacao-filters';
import styles from './FolhaDeFiltros.module.css';

const ORDENS: { value: MovimentacaoSort; label: string }[] = [
  { value: '', label: 'Mais recentes primeiro' },
  { value: 'antigas', label: 'Mais antigas primeiro' },
  { value: 'tribunal', label: 'Por tribunal (A–Z)' },
];

/**
 * OS FILTROS NO CELULAR — uma folha que sobe de baixo.
 *
 * A faixa de pílulas no topo da lista gastava 88px antes da primeira
 * movimentação e rolava para o lado. Aqui o recorte vive atrás de um toque, e
 * a lista mostra só a frase do que está valendo (`resumoDosFiltros`).
 *
 * **Nada muda até "Ver movimentações".** A folha edita uma cópia; fechar pelo
 * ×, pelo véu ou pelo gesto descarta. Aplicar leva SEMPRE à lista de todas: a
 * aba Novas responde "o que chegou" e não se filtra — um recorte escondido ali
 * faria a pessoa achar que não chegou nada.
 */
export function FolhaDeFiltros({
  filtros,
  tribunais,
  variante,
}: {
  filtros: MovimentacaoFilterState;
  tribunais: readonly TribunalOption[];
  /** `icone` no topo da tela; `texto` ("Mudar") ao lado da frase do recorte. */
  variante: 'icone' | 'texto';
}) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [rascunho, setRascunho] = useState(filtros);
  const ativos = countActiveMovimentacaoFilters(filtros);

  const mudar = (mudanca: Partial<MovimentacaoFilterState>) => setRascunho(atual => ({ ...atual, ...mudanca }));
  const alternarTribunal = (codigo: string) => mudar({
    tribunal: rascunho.tribunal.includes(codigo)
      ? rascunho.tribunal.filter(t => t !== codigo)
      : [...rascunho.tribunal, codigo],
  });

  function aplicar() {
    const params = serializeMovimentacaoFilters(rascunho);
    params.set('vista', 'todas');
    setAberta(false);
    router.push(`/movimentacoes?${params.toString()}`);
  }

  return (
    <>
      {variante === 'icone' ? (
        <button
          type="button"
          className={styles.gatilhoIcone}
          aria-label={ativos ? `Filtros, ${ativos} ativos` : 'Filtros'}
          onClick={() => { setRascunho(filtros); setAberta(true); }}
        >
          <SlidersHorizontal size={20} aria-hidden="true" />
          {ativos > 0 && <span className={styles.ponto} aria-hidden="true" />}
        </button>
      ) : (
        <button
          type="button"
          className={styles.gatilhoTexto}
          onClick={() => { setRascunho(filtros); setAberta(true); }}
        >
          Mudar
        </button>
      )}

      <Sheet open={aberta} onOpenChange={setAberta}>
        <SheetContent side="bottom" showCloseButton={false} className={styles.folha}>
          <div className={styles.alca} aria-hidden="true"><span /></div>

          <div className={styles.topo}>
            <SheetTitle className={styles.titulo}>Filtrar</SheetTitle>
            <button
              type="button"
              className={styles.limpar}
              onClick={() => setRascunho({ ...DEFAULT_MOVIMENTACAO_FILTERS, q: rascunho.q })}
            >
              Limpar
            </button>
            <SheetClose className={styles.fechar} aria-label="Fechar">
              <X size={20} aria-hidden="true" />
            </SheetClose>
          </div>

          <div className={styles.corpo}>
            <fieldset className={styles.grupo}>
              <legend className={styles.legenda}>Mostrar</legend>
              <div className={styles.pilulas}>
                {CATEGORIAS_MOVIMENTACAO.map(categoria => {
                  const ligada = categoriaLigada(rascunho.categoria, categoria.value);
                  return (
                    <button
                      key={categoria.value}
                      type="button"
                      className={styles.pilula}
                      aria-pressed={ligada}
                      onClick={() => mudar({ categoria: alternarCategoria(rascunho.categoria, categoria.value) })}
                    >
                      {ligada && <Check size={16} aria-hidden="true" />}
                      {categoria.label}
                    </button>
                  );
                })}
              </div>
              <p className={styles.dica}>Ligado, o trâmite de cartório aparece recolhido numa linha só.</p>
            </fieldset>

            <fieldset className={styles.grupo}>
              <legend className={styles.legenda}>De quem é a providência</legend>
              <div className={styles.segmento}>
                {QUEM_MOVIMENTACAO.map(opcao => (
                  <button
                    key={opcao.value || 'qualquer'}
                    type="button"
                    className={styles.segmentoOpcao}
                    aria-pressed={rascunho.quem === opcao.value}
                    onClick={() => mudar({ quem: opcao.value })}
                  >
                    {opcao.label}
                  </button>
                ))}
              </div>
            </fieldset>

            {tribunais.length > 0 && (
              <fieldset className={styles.grupo}>
                <legend className={styles.legenda}>Tribunal</legend>
                <div className={styles.pilulas}>
                  <button
                    type="button"
                    className={styles.pilula}
                    aria-pressed={rascunho.tribunal.length === 0}
                    onClick={() => mudar({ tribunal: [] })}
                  >
                    Todos
                  </button>
                  {tribunais.map(tribunal => (
                    <button
                      key={tribunal.code}
                      type="button"
                      className={`${styles.pilula} ${styles.pilulaTribunal}`}
                      aria-pressed={rascunho.tribunal.includes(tribunal.code)}
                      onClick={() => alternarTribunal(tribunal.code)}
                    >
                      {tribunal.code}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <fieldset className={styles.grupo}>
              <legend className={styles.legenda}>Ordem</legend>
              {ORDENS.map(ordem => (
                <label key={ordem.value || 'recentes'} className={styles.radio}>
                  <input
                    type="radio"
                    name="ordem-das-movimentacoes"
                    checked={rascunho.sort === ordem.value}
                    onChange={() => mudar({ sort: ordem.value })}
                  />
                  {ordem.label}
                </label>
              ))}
            </fieldset>
          </div>

          <div className={styles.acoes}>
            <button type="button" className={styles.aplicar} onClick={aplicar}>
              Ver movimentações
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
