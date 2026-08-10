/** Pivota uma lista de pontos com `date` em linhas por dia, uma coluna por chave —
 * usado por todo gráfico de série temporal com múltiplas séries (candidato ou tópico). */
export function pivotByDate<T extends { date: string }>(
  points: T[],
  keyFn: (point: T) => string,
  valueFn: (point: T) => number,
): Record<string, number | string>[] {
  const byDate = new Map<string, Record<string, number | string>>()
  for (const point of points) {
    const row = byDate.get(point.date) ?? { date: point.date }
    const key = keyFn(point)
    row[key] = (Number(row[key]) || 0) + valueFn(point)
    byDate.set(point.date, row)
  }
  return Array.from(byDate.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  )
}
