'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import styles from './page.module.css';
import { HeroRays } from './HeroRays';

const TEXTS = [
  {
    eyebrow: 'Processo certo. Prazo certo. Sempre.',
    h1: 'Fique à frente de cada prazo',
    lead: 'Ponto Processual é uma plataforma de monitoramento agêntico construída para escritórios que não podem errar prazo. Acompanhamos seus processos em todos os tribunais, decodificamos cada movimentação e avisamos você no WhatsApp — antes que vire prejuízo.',
  },
  {
    eyebrow: 'Automação inteligente',
    h1: 'Menos sistema, mais advocacia',
    lead: 'A plataforma entra no PJe, e-SAJ, Projudi e CPE por você. Lemos as publicações, identificamos prazos e atualizamos seu calendário automaticamente. Elimine a checagem manual diária e centralize tudo em um único lugar.',
  },
  {
    eyebrow: 'Comunicação proativa',
    h1: 'Seu cliente sempre informado',
    lead: 'Ao longo do dia, o Ponto Processual resume o que aconteceu em cada processo e envia alertas claros no WhatsApp. Antecipe o contato do cliente e demonstre controle total sobre a carteira.',
  },
];

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Quando o topo do container chega no topo da tela, rect.top é 0.
      // O scroll total dentro do container é scrollHeight - windowHeight.
      const totalScroll = containerRef.current.scrollHeight - windowHeight;
      const currentScroll = -rect.top;
      
      let p = currentScroll / totalScroll;
      p = Math.max(0, Math.min(1, p));

      let newStep = 0;
      if (p > 0.33 && p < 0.66) newStep = 1;
      else if (p >= 0.66) newStep = 2;
      
      if (newStep !== step) {
        setStep(newStep);
      }
    };
    
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [step]);

  return (
    <section className={styles.heroWrap} data-nav-theme="dark" ref={containerRef}>
      <div className={styles.heroSticky}>
        <div className={styles.heroBg}>
          <HeroRays />
        </div>
        
        <div className={styles.heroContent}>
          {TEXTS.map((t, i) => (
            <div 
              key={i} 
              className={`${styles.heroInner} ${i === step ? styles.heroInnerActive : styles.heroInnerInactive}`}
            >
              <p className={styles.eyebrow}>
                <span className={styles.eyebrowMark} aria-hidden="true" />
                {t.eyebrow}
              </p>
              <h1 className={styles.h1}>
                {t.h1}
              </h1>
              <p className={styles.heroLead}>
                {t.lead}
              </p>
              {i === 0 && (
                <a
                  href="#como-funciona"
                  className={styles.heroCta}
                >
                  VER COMO FUNCIONA
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
