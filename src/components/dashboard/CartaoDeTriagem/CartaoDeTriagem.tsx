import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { BaixarPrazo } from '@/components/prazos/BaixarPrazo/BaixarPrazo';
import { LembrarPrazo } from '@/components/prazos/LembrarPrazo/LembrarPrazo';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { ConfirmarDeQuem } from '../ConfirmarDeQuem/ConfirmarDeQuem';
import { diasAte, distancia, tomDosDias } from '@/lib/situacao-do-ato';
import type { ChaveGrupoTriagem, ItemTriagem } from '@/lib/triagem';
import styles from './CartaoDeTriagem.module.css';

const dataCurta = (iso: string | null, estimada = false) => {
  if (!iso) return 'sem data definida';
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number);
  const texto = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  }).format(new Date(Date.UTC(ano!, mes! - 1, dia!))).replaceAll('.', '').toLowerCase();
  return estimada ? `${texto} ≈` : texto;
};

const primeira = (lista?: string[]) => lista?.find(Boolean)?.trim() ?? '';

export function CartaoDeTriagem({ item, grupo }: { item: ItemTriagem; grupo: ChaveGrupoTriagem }) {
  if (item.tipo === 'novidade') {
    const m = item.movimentacao;
    const dias = Math.max(0, diasAte(m.prazo?.dataLimite) ?? 8);
    const tom = tomDosDias(dias);
    return (
      <article className={styles.cartao} data-tom={tom} data-item-id={m.id}>
        <div className={styles.faixa}>
          <strong>Chegou agora e pede sua ação</strong>
          <span className={styles.faixaMeta}><TribTag label={m.tribunal} /><b>Nova</b></span>
        </div>
        <Link href={`/movimentacoes/${m.id}`} className={styles.corpo}>
          <h3>{m.ia.peca || m.tipo}</h3>
          <p>{m.ia.resumo || m.detail}</p>
          <span className={styles.partes}>{m.parte}</span>
          <span className={styles.meta}>{m.cnj} · {m.orgaoJulgador}</span>
        </Link>
        <footer className={styles.rodape}>
          <Link href={`/movimentacoes/${m.id}`} className={styles.verAcao}>
            Abrir ato <ChevronRight aria-hidden="true" />
          </Link>
        </footer>
      </article>
    );
  }

  const p = item.prazo;
  const dias = p.diasRestantes;
  const tom = dias === null ? 'voce' : tomDosDias(dias);
  const estimada = Boolean(p.metodoPrazo && p.metodoPrazo !== 'textoExplicito');
  const href = p.movementId ? `/movimentacoes/${p.movementId}` : '/prazos';
  const cliente = primeira(p.cliente) || p.parte || 'Parte não identificada';
  const contraria = primeira(p.parteContraria);
  const titulo = p.ato?.ia.peca || p.tipo || 'Prazo processual';

  return (
    <article className={styles.cartao} data-tom={tom} data-item-id={p.id}>
      <div className={styles.faixa}>
        <div>
          <strong>{item.lembrarHoje ? 'Você pediu para lembrar hoje' : dias === null ? 'Sem data definida' : distancia(dias)}</strong>
          <span>{dataCurta(p.vencimentoISO, estimada)}</span>
        </div>
        <span className={styles.faixaMeta}><TribTag label={p.tribunal} />{p.state === 'signal' && <b>Nova</b>}</span>
      </div>
      <Link href={href} className={styles.corpo}>
        <h3>{titulo}</h3>
        {grupo === 'deQuemE' && <p className={styles.alerta}>Não sabemos de quem é — não avisamos por WhatsApp.</p>}
        {p.ato?.ia.oQueFazer && <p>{p.ato.ia.oQueFazer}</p>}
        <span className={styles.partes}>{cliente}{contraria ? ` × ${contraria}` : ''}</span>
        <span className={styles.meta}>{p.cnj} · {p.orgaoJulgador}</span>
      </Link>
      <footer className={styles.rodape}>
        {grupo === 'deQuemE' ? (
          <ConfirmarDeQuem prazoId={p.id} />
        ) : (
          <>
            <BaixarPrazo prazoId={p.id} fechado={Boolean(p.fechado)} compacto toolbar atualizarPagina={false} />
            {dias !== null && dias > 1 && (
              <LembrarPrazo prazoId={p.id} vencimentoISO={p.vencimentoISO} lembrarEm={p.lembrarEm ?? null} toolbar />
            )}
            <Link href={href} className={styles.verAcao}>Ver tarefa <ChevronRight aria-hidden="true" /></Link>
          </>
        )}
      </footer>
    </article>
  );
}
