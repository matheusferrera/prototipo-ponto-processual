import styles from './page.module.css';
import { HeroRays } from './HeroRays';

/**
 * Hero alto (≈1,7 tela) com o leque de faixas grudado no fundo: a altura
 * extra existe só para dar percurso de scroll ao paralaxe do HeroRays — o
 * conteúdo fica centrado na primeira tela. Nenhum texto troca ou some com o
 * scroll; o único estado interativo é o hover do CTA.
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
          Processo certo. Prazo certo. Sempre.
        </p>
        <h1 className={styles.h1}>Fique à frente de cada prazo</h1>
        <p className={styles.heroLead}>
          Ponto Processual é uma plataforma de monitoramento agêntico construída para escritórios que
          não podem errar prazo. Acompanhamos seus processos em todos os tribunais, decodificamos cada
          movimentação e avisamos você no WhatsApp — antes que vire prejuízo.
        </p>
        <a href="#como-funciona" className={styles.heroCta}>
          VER COMO FUNCIONA
        </a>
      </div>
    </section>
  );
}
