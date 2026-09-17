/**
 * A fenda `@card` VAZIA — o estado de toda navegação que não é interceptada.
 *
 * Sem este arquivo o Next não sabe o que renderizar na fenda quando a rota
 * atual não tem correspondência dentro dela, e um F5 na página do ato estoura
 * em 404. Devolver `null` é literalmente "não há card aberto".
 */
export default function SemCard() {
  return null;
}
