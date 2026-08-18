import { type CSSProperties } from 'react';
import styles from './LinedIcon.module.css';

const W = 220;
const H = 240;

const DocumentIcon = () => (
  <g className={styles.sway} style={{ transformOrigin: '110px 120px' }}>
    {/* Abstract Dossier Framework (Sharp Quadrilaterals) */}
    <path d="M 50 40 L 140 40 L 140 180 L 50 180 Z" fill="var(--paper-3)" />
    <path d="M 50 40 L 140 40 L 140 180 L 50 180 Z" 
          fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="miter"
          pathLength="100" className={styles.drawPath} />
          
    {/* Offset structure plane */}
    <path d="M 70 60 L 170 60 L 170 200 L 70 200 Z" 
          fill="none" stroke="var(--ink-4)" strokeWidth="2" strokeLinejoin="miter"
          pathLength="100" className={styles.drawPath} style={{ animationDelay: '0.2s' } as CSSProperties} />

    {/* Green horizontal strict data bars */}
    <path d="M 65 90 L 125 90" stroke="var(--brick)" strokeWidth="8" strokeLinecap="square" 
          pathLength="100" className={styles.drawPath} style={{ animationDelay: '0.5s' } as CSSProperties} />
    <path d="M 65 120 L 95 120" stroke="var(--brick)" strokeWidth="8" strokeLinecap="square" 
          pathLength="100" className={styles.drawPath} style={{ animationDelay: '0.7s' } as CSSProperties} />
    <path d="M 65 150 L 125 150" stroke="var(--brick)" strokeWidth="8" strokeLinecap="square" 
          pathLength="100" className={styles.drawPath} style={{ animationDelay: '0.9s' } as CSSProperties} />

    {/* Abstract scanner reading the dossier vertically */}
    <line x1="30" y1="0" x2="180" y2="0" stroke="var(--brick)" strokeWidth="2" className={styles.scanDown} />
  </g>
);

const PrazoIcon = () => (
  <g className={styles.sway} style={{ transformOrigin: '110px 120px' }}>
    {/* Background calendar page */}
    <path d="M 45 40 L 175 40 L 175 210 L 45 210 Z" fill="var(--paper-3)" />
    <path d="M 45 40 L 175 40 L 175 210 L 45 210 Z" 
          fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="miter" 
          pathLength="100" className={styles.drawPath} />
          
    {/* Calendar header section */}
    <line x1="45" y1="80" x2="175" y2="80" stroke="var(--ink)" strokeWidth="3" pathLength="100" className={styles.drawPath} style={{ animationDelay: '0.2s' } as CSSProperties} />
    
    {/* Binding rings */}
    <line x1="70" y1="25" x2="70" y2="55" stroke="var(--ink)" strokeWidth="4" className={styles.popIn} style={{ animationDelay: '0.4s' } as CSSProperties} />
    <line x1="110" y1="25" x2="110" y2="55" stroke="var(--ink)" strokeWidth="4" className={styles.popIn} style={{ animationDelay: '0.5s' } as CSSProperties} />
    <line x1="150" y1="25" x2="150" y2="55" stroke="var(--ink)" strokeWidth="4" className={styles.popIn} style={{ animationDelay: '0.6s' } as CSSProperties} />

    {/* Calendar Grid (Background faint squares) */}
    <g fill="none" stroke="var(--ink-4)" strokeWidth="2" className={styles.popIn} style={{ animationDelay: '0.7s' } as CSSProperties}>
      <rect x="65" y="100" width="20" height="20" />
      <rect x="100" y="100" width="20" height="20" />
      <rect x="135" y="100" width="20" height="20" />
      <rect x="65" y="135" width="20" height="20" />
      <rect x="100" y="135" width="20" height="20" />
      <rect x="135" y="135" width="20" height="20" />
      <rect x="65" y="170" width="20" height="20" />
      <rect x="100" y="170" width="20" height="20" />
      <rect x="135" y="170" width="20" height="20" />
    </g>

    {/* The moving tracking block (Deadline hunter) */}
    <rect x="135" y="170" width="20" height="20" fill="var(--brick)" className={styles.calendarTick} />

    {/* Elimination strike (A sharp slash drawn over the deadline) */}
    <path d="M 50 160 L 165 195" stroke="var(--brick)" strokeWidth="6" strokeLinecap="square" pathLength="100" className={styles.strikeThrough} />
  </g>
);

const WhatsappIcon = () => (
  <g className={styles.sway} style={{ transformOrigin: '110px 120px' }}>
    {/* Left Node (You / System) */}
    <path d="M 30 80 L 60 80 L 60 160 L 30 160 Z" fill="var(--paper-3)" />
    <path d="M 30 80 L 60 80 L 60 160 L 30 160 Z" 
          fill="none" stroke="var(--ink)" strokeWidth="3" className={styles.popIn} style={{ animationDelay: '0.2s' } as CSSProperties} />
          
    {/* Right Node (Client) */}
    <path d="M 160 80 L 190 80 L 190 160 L 160 160 Z" fill="var(--paper-3)" />
    <path d="M 160 80 L 190 80 L 190 160 L 160 160 Z" 
          fill="none" stroke="var(--ink)" strokeWidth="3" className={styles.popIn} style={{ animationDelay: '0.4s' } as CSSProperties} />

    {/* Upper Circuit: Sending message */}
    <path d="M 45 80 L 45 40 L 175 40 L 175 80" 
          fill="none" stroke="var(--ink-4)" strokeWidth="2" strokeLinejoin="miter" pathLength="100" className={styles.drawPath} style={{ animationDelay: '0.6s' } as CSSProperties} />
    
    {/* Lower Circuit: Receiving response (Closing the loop) */}
    <path d="M 175 160 L 175 200 L 45 200 L 45 160" 
          fill="none" stroke="var(--ink-4)" strokeWidth="2" strokeLinejoin="miter" pathLength="100" className={styles.drawPath} style={{ animationDelay: '0.8s' } as CSSProperties} />

    {/* The Active "Closing the Loop" Signals */}
    {/* Green signal jumping from You to Client */}
    <path d="M 45 80 L 45 40 L 175 40 L 175 80" 
          fill="none" stroke="var(--brick)" strokeWidth="6" strokeLinejoin="miter" strokeLinecap="square" pathLength="100" className={styles.signalOut} />
    
    {/* Green signal jumping from Client back to You */}
    <path d="M 175 160 L 175 200 L 45 200 L 45 160" 
          fill="none" stroke="var(--brick)" strokeWidth="6" strokeLinejoin="miter" strokeLinecap="square" pathLength="100" className={styles.signalIn} />

    {/* Internal block data (abstract lines) */}
    <line x1="38" y1="105" x2="52" y2="105" stroke="var(--brick)" strokeWidth="4" strokeLinecap="square" className={styles.popIn} style={{ animationDelay: '1s' } as CSSProperties} />
    <line x1="38" y1="135" x2="52" y2="135" stroke="var(--ink)" strokeWidth="4" strokeLinecap="square" className={styles.popIn} style={{ animationDelay: '1.2s' } as CSSProperties} />
    
    <line x1="168" y1="105" x2="182" y2="105" stroke="var(--ink)" strokeWidth="4" strokeLinecap="square" className={styles.popIn} style={{ animationDelay: '1.4s' } as CSSProperties} />
    <line x1="168" y1="135" x2="182" y2="135" stroke="var(--brick)" strokeWidth="4" strokeLinecap="square" className={styles.popIn} style={{ animationDelay: '1.6s' } as CSSProperties} />
  </g>
);

const ICONS = {
  documento: DocumentIcon,
  prazo: PrazoIcon,
  whatsapp: WhatsappIcon,
} as const;

export type LinedIconVariant = keyof typeof ICONS;

export function LinedIcon({ variant, size }: { variant: LinedIconVariant; size?: number }) {
  const IconComponent = ICONS[variant];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} aria-hidden="true" style={size ? { width: size, height: size } : undefined}>
      <IconComponent />
    </svg>
  );
}
