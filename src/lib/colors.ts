/**
 * Rampa de cinza posicional (wireframe stage — cor entra só depois da aprovação).
 * A 1ª série é sempre a de maior contraste com a superfície, usada por posição
 * (nunca por identidade de hue) — nunca reciclada quando um filtro muda a contagem
 * de séries. Ver index.css para os valores claro/escuro.
 */
export const SERIES_COLORS = [
  'var(--series-1)',
  'var(--series-2)',
  'var(--series-3)',
  'var(--series-4)',
  'var(--series-5)',
] as const

export function seriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length]
}
