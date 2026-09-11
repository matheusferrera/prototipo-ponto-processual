'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, Copy } from 'lucide-react';
import styles from './ProcessoPanorama.module.css';

export function CopiarCnj({ cnj }: { cnj: string }) {
  const [estado, setEstado] = useState<'idle' | 'ok' | 'erro'>('idle');
  return <span className={styles.copyGroup}>
    <button type="button" className={styles.copy} aria-label={`Copiar número ${cnj}`} onClick={async () => {
      try { await navigator.clipboard.writeText(cnj); setEstado('ok'); }
      catch { setEstado('erro'); }
    }}>
      <span>{cnj}</span>
      {estado === 'ok' ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
    </button>
    <span className={styles.small} role="status">{estado === 'ok' ? 'Copiado' : estado === 'erro' ? 'Selecione o número para copiar manualmente.' : ''}</span>
  </span>;
}

export function RevisarProvidencia() {
  const [revisada, setRevisada] = useState(false);
  return <div className={styles.review}>
    <label><input type="checkbox" checked={revisada} onChange={e => setRevisada(e.target.checked)} />
      {revisada ? 'Revisada nesta visualização' : 'Marcar como revisada'}
    </label>
    <span className={styles.small}>Demonstração · marcação temporária, sem encerrar o prazo.</span>
  </div>;
}

/**
 * "Ver análise completa" — troca a aba E ROLA até a leitura.
 *
 * O `href` continua carregando o `#analises-ia`, então o link sobrevive sem
 * JavaScript e continua sendo um endereço que se manda para alguém. O que ele
 * não faz sozinho é rolar: **quem rola nesta página é o `.pageShell`, não a
 * janela**, e o App Router não leva o hash até um scrollport aninhado — medido
 * ao vivo em 10/09/2026, o clique trocava a aba e parava com o container em
 * `scrollTop: 30`, deixando a análise 812px abaixo da dobra. A pessoa clicava
 * para expandir o resumo e continuava olhando para o mesmo resumo de três
 * linhas.
 *
 * Por que um laço e não um `scrollIntoView` direto: a aba de IA é renderizada NO
 * SERVIDOR (`aba === 'ia' &&` no `page.tsx`), então no instante do clique o alvo
 * ainda não existe no DOM — ele chega alguns frames depois, com a resposta do
 * RSC. O laço espera o alvo aparecer e desiste depois de 2s, que é o caso de a
 * navegação ter falhado: rolar para lugar nenhum é melhor que segurar um timer
 * vivo numa aba esquecida aberta.
 *
 * `setTimeout`, e não `requestAnimationFrame`: o Chrome NÃO dispara rAF em aba
 * oculta (`visibilityState: 'hidden'`), e quem clica e troca de aba antes de a
 * navegação terminar ficaria com o laço congelado até voltar. Timer é
 * estrangulado a ~1s numa aba oculta, mas dispara.
 */
export function VerAnaliseCompleta({ href }: { href: string }) {
  return <Link className={styles.link} href={href} onClick={() => rolarAteAparecer('analises-ia')}>
    Ver análise completa <ArrowUpRight size={14} aria-hidden="true" />
  </Link>;
}

function rolarAteAparecer(id: string, limiteMs = 2000) {
  const fim = Date.now() + limiteMs;
  const tenta = () => {
    const alvo = document.getElementById(id);
    // `block: 'start'` com o `scroll-margin-top` do `.panel`: o título da seção
    // encosta no topo do scrollport com uma folga, e a barra de abas fica logo
    // acima — sem ela a pessoa perde a referência de onde a página está.
    //
    // O `behavior` é decidido aqui, não no CSS: um `scroll-behavior: smooth` no
    // `.pageShell` valeria para TODA rolagem programática da página (o
    // "Carregar mais" da timeline, entre outras), o que é efeito colateral de
    // uma decisão que é só deste clique.
    if (alvo) { alvo.scrollIntoView({ behavior: suave() ? 'smooth' : 'auto', block: 'start' }); return; }
    if (Date.now() < fim) setTimeout(tenta, 50);
  };
  tenta();
}

/** Quem pediu menos movimento recebe o salto seco. */
function suave(): boolean {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
