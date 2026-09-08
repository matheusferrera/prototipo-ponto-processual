import type { ReactNode } from 'react';
import { SummaryBar, type SummaryChip } from '@/components/filters/SummaryBar';
import { buildQuery } from '@/lib/utils';

export interface ContagemCarteira {
  /** todos os processos que passam pelos filtros, ignorando o filtro de estado */
  todos: number;
  novidade: number;
  erro: number;
}

interface ProcessSummaryBarProps {
  contagem: ContagemCarteira;
  /** params atuais da lista — o chip troca só o `state` e volta à página 1 */
  listParams: Record<string, string | undefined>;
  /** controles de exibição (lista/tabela, configurar) — ficam à direita */
  children?: ReactNode;
}

/**
 * Os números da carteira como filtros, não como estatística: "Com novidade 3"
 * é um clique, e o estado ativo se lê na própria barra.
 */
export function ProcessSummaryBar({ contagem, listParams, children }: ProcessSummaryBarProps) {
  const active = listParams.state ?? '';
  const href = (state: string) => `/processos${buildQuery(listParams, { state: state || undefined, page: undefined })}`;

  const chips: SummaryChip[] = [
    { key: 'todos', href: href(''), label: 'Todos', count: contagem.todos, active: active === '' },
    { key: 'signal', href: href('signal'), label: 'Com novidade', count: contagem.novidade, active: active === 'signal', tone: 'signal' },
  ];
  if (contagem.erro > 0 || active === 'alert') {
    chips.push({ key: 'alert', href: href('alert'), label: 'Com erro', count: contagem.erro, active: active === 'alert', tone: 'alert' });
  }

  return <SummaryBar chips={chips} ariaLabel="Filtrar por estado">{children}</SummaryBar>;
}
