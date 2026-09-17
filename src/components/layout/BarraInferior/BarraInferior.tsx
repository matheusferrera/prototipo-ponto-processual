'use client';

import Link from 'next/link';
import { Activity, CalendarDays, FolderClosed, LayoutGrid, MoreHorizontal } from 'lucide-react';
import type { SidebarProps } from '@/components/layout/Sidebar/Sidebar';
import { ROTA_PAINEL } from '@/lib/rotas';
import styles from './BarraInferior.module.css';

/**
 * A navegação do celular.
 *
 * ## Por que ela existe
 *
 * O menu lateral é um padrão de DESKTOP: ele ocupa 220px que, num aparelho,
 * não existem. A adaptação até 15/09/2026 era um hambúrguer no topo — o que
 * custa dois toques para trocar de tela (abrir a gaveta, escolher) e coloca a
 * navegação no canto superior esquerdo, que é justamente onde o polegar não
 * chega segurando o aparelho com uma mão.
 *
 * O advogado abre este produto na fila do fórum, entre uma audiência e outra.
 * As quatro telas que ele alterna o dia inteiro — hoje, prazos, movimentações,
 * processos — passam a ficar a um toque, na faixa que o polegar alcança.
 *
 * ## Quatro destinos e um "mais", não sete
 *
 * A barra inferior degrada mal quando cresce: acima de cinco alvos cada um fica
 * com menos de 78px e o rótulo some. WhatsApp, Credenciais e Status continuam
 * na gaveta, atrás de "Mais" — são telas de configuração, visitadas uma vez por
 * mês, e não disputam espaço com as de trabalho.
 *
 * ## Os contadores são opcionais de propósito
 *
 * Quem tem o dado passa (`contadores`); quem não tem, não mostra número nenhum.
 * Um badge que às vezes aparece e às vezes não é pior que badge nenhum: ele faz
 * a ausência parecer "zero" quando na verdade é "não sei".
 */

export type ContadoresDaBarra = {
  /** Prazos em aberto que ainda vencem. `undefined` = a tela não sabe. */
  prazos?: number;
  /** Movimentações ainda não vistas. `undefined` = a tela não sabe. */
  movimentacoes?: number;
};

type Destino = {
  chave: SidebarProps['active'];
  rotulo: string;
  href: string;
  Icone: typeof LayoutGrid;
  /** Só `alert` pinta de tinto: prazo é a única contagem que cobra. */
  tom?: 'alert' | 'brick';
};

const DESTINOS: Destino[] = [
  { chave: 'Dashboard', rotulo: 'Hoje', href: ROTA_PAINEL, Icone: LayoutGrid },
  { chave: 'Prazos', rotulo: 'Prazos', href: '/prazos', Icone: CalendarDays, tom: 'alert' },
  { chave: 'Movimentações', rotulo: 'Movs', href: '/movimentacoes', Icone: Activity, tom: 'brick' },
  { chave: 'Processos', rotulo: 'Processos', href: '/processos', Icone: FolderClosed },
];

export function BarraInferior({
  active,
  contadores,
  onAbrirMais,
}: {
  active: SidebarProps['active'];
  contadores?: ContadoresDaBarra;
  onAbrirMais: () => void;
}) {
  const contagem = (chave: SidebarProps['active']) =>
    chave === 'Prazos' ? contadores?.prazos
    : chave === 'Movimentações' ? contadores?.movimentacoes
    : undefined;

  return (
    <nav className={styles.barra} aria-label="Navegação principal">
      {DESTINOS.map(({ chave, rotulo, href, Icone, tom }) => {
        const n = contagem(chave);
        const atual = active === chave;
        return (
          <Link
            key={chave}
            href={href}
            aria-current={atual ? 'page' : undefined}
            className={`${styles.aba} ${atual ? styles.abaAtiva : ''}`}
          >
            <span className={styles.icone}>
              <Icone size={20} strokeWidth={atual ? 2 : 1.6} aria-hidden="true" />
              {/* O número entra no rótulo acessível em vez de virar um `<span>`
                  solto: "Prazos, 4 em aberto" é o que o leitor de tela precisa
                  anunciar, e um badge visual sozinho não diz o que conta. */}
              {n !== undefined && n > 0 && (
                <span className={styles.badge} data-tom={tom} aria-hidden="true">
                  {n > 99 ? '99+' : n}
                </span>
              )}
            </span>
            <span className={styles.rotulo}>{rotulo}</span>
            {n !== undefined && n > 0 && (
              <span className={styles.somenteLeitor}>
                , {n} {chave === 'Prazos' ? 'em aberto' : 'sem ver'}
              </span>
            )}
          </Link>
        );
      })}

      <button type="button" className={styles.aba} onClick={onAbrirMais}>
        <span className={styles.icone}>
          <MoreHorizontal size={20} strokeWidth={1.6} aria-hidden="true" />
        </span>
        <span className={styles.rotulo}>Mais</span>
      </button>
    </nav>
  );
}
