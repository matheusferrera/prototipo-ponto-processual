import { FrameGrid } from '@/components/ui/FrameGrid/FrameGrid';
import styles from './page.module.css';
import { OabSearch } from './OabSearch';
import { TribunalTicker } from './TribunalTicker';
import { TRIBUNAIS } from './tribunais';

/**
 * Hero alto (≈1,7 tela) com a malha de quadros grudada no fundo: a altura
 * extra existe só para dar percurso de scroll ao paralaxe do FrameGrid — o
 * conteúdo fica centrado na primeira tela. Nenhum texto troca ou some com o
 * scroll.
 *
 * O CTA acima da dobra é a busca por OAB, não uma âncora de scroll: o
 * visitante vê os próprios processos antes de decidir se dá o e-mail.
 */
export function HeroSection() {
  return (
    <section className={styles.heroWrap} data-nav-theme="dark">
      <div className={styles.heroBg} aria-hidden="true">
        <FrameGrid />
      </div>

      <div className={styles.heroContent}>
        <TribunalTicker itens={TRIBUNAIS} />
        <h1 className={styles.h1}>
          Sua manhã não começa vasculhando vários sistemas de tribunais.
        </h1>
        <p className={styles.heroLead}>
          Enquanto você advoga, a plataforma faz a ronda por eles e te chama no WhatsApp no mesmo dia
          em que sai a publicação.
        </p>

        <OabSearch />
      </div>
    </section>
  );
}
