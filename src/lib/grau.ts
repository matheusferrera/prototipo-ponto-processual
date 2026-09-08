/** Grau exportado pelo backend: '1' | '2' | 'DJEN' (DJEN = ainda não confirmado). */
export function grauLabel(grau: string | undefined | null): string {
  if (grau === '1') return '1º';
  if (grau === '2') return '2º';
  if (grau === 'DJEN') return 'DJEN';
  return '';
}

