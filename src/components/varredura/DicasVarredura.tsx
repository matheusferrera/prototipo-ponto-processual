'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, CalendarClock, KeyRound, PowerOff, ScrollText } from 'lucide-react';
import styles from './Varredura.module.css';

/** Quanto cada dica fica na tela. Longo o bastante para ler duas vezes. */
const INTERVALO_MS = 7000;

/**
 * O que se diz para alguém que está esperando.
 *
 * Nenhuma delas é curiosidade: cada uma é ou uma coisa que a pessoa pode ir
 * fazer agora (e por isso leva a uma tela de verdade), ou uma coisa que ela
 * precisa saber para não interpretar mal o resultado que vai chegar. A
 * primeira é a do login de tribunal porque é a única que muda o *teto* do que
 * a plataforma consegue ver — o resto da carteira depende dela.
 */
const DICAS = [
  {
    icone: KeyRound,
    texto:
      'Isto aqui é o diário oficial — o que foi publicado, e só isso. Com o login do tribunal o robô entra nos autos e alcança andamentos internos, documentos e os expedientes que só aparecem no painel do PJe.',
    href: '/credenciais',
    cta: 'Conectar um tribunal →',
  },
  {
    icone: CalendarClock,
    texto:
      'Cada intimação que chega vira prazo com data já calculada e entra na sua pauta. Você não precisa abrir nada para saber o que vence esta semana.',
    href: '/prazos',
    cta: 'Ver a pauta de prazos →',
  },
  {
    icone: ScrollText,
    texto:
      'As movimentações de todos os processos caem num feed único, em ordem de chegada. É o lugar de olhar de manhã, no lugar de abrir tribunal por tribunal.',
    href: '/movimentacoes',
    cta: 'Ver as movimentações →',
  },
  {
    icone: Activity,
    texto:
      'Tribunal fora do ar não vira silêncio: a página de status mostra quando cada um respondeu pela última vez, para você saber se a calmaria é real.',
    href: '/status',
    cta: 'Ver o status dos tribunais →',
  },
  {
    icone: PowerOff,
    texto:
      'Pode fechar esta página. A varredura roda no servidor e continua sem você — quando voltar, o que foi encontrado já vai estar aqui.',
  },
] as const;

/**
 * As dicas que ocupam a espera.
 *
 * Rotação automática com os marcadores servindo de controle: quem quis reler
 * a anterior não fica refém do ciclo. Clicar num marcador **para** a rotação
 * — mexer no carrossel e ele continuar andando debaixo do dedo é a forma mais
 * rápida de tornar o componente irritante.
 */
export function DicasVarredura() {
  const [i, setI] = useState(0);
  const [parado, setParado] = useState(false);

  useEffect(() => {
    if (parado) return;
    const t = setInterval(() => setI(atual => (atual + 1) % DICAS.length), INTERVALO_MS);
    return () => clearInterval(t);
  }, [parado]);

  const dica = DICAS[i]!;
  const Icone = dica.icone;

  return (
    <div className={styles.dicas}>
      <div className={styles.dicasLabel}>Enquanto isso</div>

      {/* `key` remonta o bloco a cada troca, que é o que dispara o fade. O
          `role="status"` sem `aria-live` agressivo: leitor de tela anuncia a
          dica nova sem interromper o que a pessoa estiver ouvindo. */}
      <div key={i} className={`${styles.dica} ${styles.dicaFade}`} role="status">
        <Icone size={16} className={styles.dicaIcone} aria-hidden="true" />
        <div className={styles.dicaCorpo}>
          <p className={styles.dicaTexto}>{dica.texto}</p>
          {'href' in dica && dica.href ? (
            <Link href={dica.href} className={styles.dicaLink}>
              {dica.cta}
            </Link>
          ) : null}
        </div>
      </div>

      <div className={styles.dicaPontos}>
        {DICAS.map((_, n) => (
          <button
            key={n}
            type="button"
            className={`${styles.dicaPonto}${n === i ? ` ${styles.dicaPontoAtivo}` : ''}`}
            aria-label={`Dica ${n + 1} de ${DICAS.length}`}
            aria-current={n === i}
            onClick={() => {
              setI(n);
              setParado(true);
            }}
          />
        ))}
      </div>
    </div>
  );
}
