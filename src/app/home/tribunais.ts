/**
 * Sistemas e tribunais que a landing exibe, na ordem em que devem passar.
 * Mora aqui, e não no `page.tsx`, porque tanto a página quanto o
 * `HeroSection` precisam da lista — e o `HeroSection` importar do `page.tsx`
 * fecharia um ciclo, já que é o `page.tsx` quem importa o `HeroSection`.
 *
 * A lista é uma afirmação de cobertura: só entra aqui o que a plataforma
 * realmente alcança.
 */
export const TRIBUNAIS = [
  'PJe', 'e-SAJ', 'Projudi', 'CPE', 'TJSP', 'TJRJ', 'TJMG', 'TJRN',
  'TJPI', 'TRF1', 'TRF3', 'TRT2', 'STJ', 'TST', 'DJEN',
] as const;
