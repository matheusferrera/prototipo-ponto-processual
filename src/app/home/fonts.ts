import { Fraunces } from 'next/font/google';

// Equivalente livre da serif editorial usada pela Tennr (featureDisplayLight,
// peso 300) para os headlines da landing page pública.
export const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  weight: ['300', '400'],
  style: ['normal', 'italic'],
  display: 'swap',
});
