import styles from './page.module.css';
import { HeroRays } from './HeroRays';
import { OabSearch } from './OabSearch';

/**
 * Hero alto (≈1,7 tela) com o leque de faixas grudado no fundo: a altura
 * extra existe só para dar percurso de scroll ao paralaxe do HeroRays — o
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
        <HeroRays />
      </div>

      <div className={styles.heroContent}>
        <p className={styles.eyebrow}>
          <span className={styles.eyebrowMark} aria-hidden="true" />
          PJe · e-SAJ · Projudi · CPE · DJEN
        </p>
        <h1 className={styles.h1}>
          Você não deveria ser o alarme{' '}
          <br className={styles.brWide} />
          dos seus próprios processos.
        </h1>
        <p className={styles.heroLead}>
          Cada tribunal tem o seu sistema, o seu login e o seu jeito de publicar — e alguém precisa
          abrir todos, todo dia, só para ter certeza de que nada saiu. O Ponto Processual faz essa ronda
          por você, lê cada publicação e te chama no WhatsApp quando alguma coisa muda.
        </p>

        <OabSearch />
      </div>
    </section>
  );
}
