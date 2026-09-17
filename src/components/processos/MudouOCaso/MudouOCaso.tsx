import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { TimelineEvent } from '@/types';
import { tempoCurto } from '@/lib/processo-apresentacao';
import { resumoMovimentacao } from '@/lib/movimentacao';
import styles from './MudouOCaso.module.css';

/**
 * § O QUE MUDOU O CASO — duas linhas fixas: a última decisão e a última
 * petição nos autos.
 *
 * ## Por que elas merecem um lugar próprio
 *
 * Hoje essas duas respostas não estão em lugar nenhum: ficam diluídas na lista
 * cronológica, entre trâmites. E a medição diz por que isso é caro —
 * **decisório é 6% e ato de parte 10%** dos últimos 90 dias: **84% do que rola
 * na lista não é nem um nem outro**. Achar a última decisão rolando a timeline
 * é procurar 6 linhas entre 100, e num processo de 4.900 movimentações é
 * procurar entre páginas.
 *
 * As duas vêm de uma busca própria por categoria (`limit=1`), não de um filtro
 * sobre a página carregada: a primeira página da timeline traz 50 atos e pode
 * não conter nenhum decisório — num processo em execução, a última decisão
 * pode estar a três anos de distância.
 *
 * ## "Da outra parte" só quando o campo diz
 *
 * A API **não tem** um campo "esta petição é sua": `categoria: 'atoDeParte'`
 * diz que a linha é uma petição, não de quem ela é. O único sinal declarado é
 * `ia.deQuem`, e é só ele que qualifica a linha aqui. Inferir o dono do texto
 * do ato seria adivinhar no campo onde adivinhar troca o cliente pelo
 * adversário.
 */
export function MudouOCaso({ decisao, peticao }: {
  decisao: TimelineEvent | null;
  peticao: TimelineEvent | null;
}) {
  if (!decisao && !peticao) {
    return (
      <p className={styles.vazio}>
        Nenhuma decisão e nenhuma petição registradas neste processo até aqui — o que chegou
        até agora é publicação e trâmite de cartório.
      </p>
    );
  }

  return (
    <div className={styles.lista}>
      <Linha rotulo="Última decisão" evento={decisao} ausente="Nenhuma decisão registrada neste processo." />
      <Linha rotulo="Última petição nos autos" evento={peticao} ausente="Nenhuma petição registrada nos autos." />
    </div>
  );
}

const DE_QUEM: Record<string, string> = {
  destinatario: 'endereçada a você',
  parteContraria: 'da outra parte',
  terceiro: 'de terceiro',
};

function Linha({ rotulo, evento, ausente }: { rotulo: string; evento: TimelineEvent | null; ausente: string }) {
  if (!evento) {
    return (
      <div className={styles.item}>
        <span className={styles.rotulo}>{rotulo}</span>
        <p className={styles.semDado}>{ausente}</p>
      </div>
    );
  }

  const dono = evento.ia?.deQuem && evento.ia.deQuem !== 'indefinido' ? DE_QUEM[evento.ia.deQuem] : null;

  return (
    <Link href={`/movimentacoes/${encodeURIComponent(evento.id)}`} className={styles.item}>
      <span className={styles.corpo}>
        <span className={styles.rotulo}>{rotulo}</span>
        <span className={styles.ato}>{resumoMovimentacao({ detail: evento.title, ia: evento.ia })}</span>
        <span className={styles.meta}>
          <time dateTime={evento.dia}>{evento.date} {evento.ano}</time>
          {tempoCurto(evento.rawDate ?? evento.dia) && <> · {tempoCurto(evento.rawDate ?? evento.dia)}</>}
          {dono && <> · {dono}</>}
        </span>
      </span>
      <ChevronRight aria-hidden="true" size={16} strokeWidth={2} className={styles.seta} />
    </Link>
  );
}
