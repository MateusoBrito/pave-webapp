import type { PeriodFilter } from '../api/client'

function enumerateDates(period: PeriodFilter): string[] {
  const dates: string[] = []
  const cursor = new Date(`${period.from}T00:00:00Z`)
  const end = new Date(`${period.to}T00:00:00Z`)
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

function previousDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export interface DateRange {
  from: string
  to: string
}

/** Acha intervalos contínuos de datas, dentro do período, em que a soma de `valueFn` é
 * zero — usado pra marcar falha de coleta nos gráficos de série temporal.
 *
 * Só procura entre o primeiro e o último dia COM dado, e não no período inteiro. Fora
 * dessas bordas o vazio não é falha de coleta, é o período pedido sendo maior que o
 * histórico que existe: a Visão Geral pede 365 dias (allTimePeriod) e o banco retém da
 * ordem de 30. Marcar isso como lacuna gerava uma ReferenceArea cujas bordas não são
 * categorias do eixo X — o recharts colapsa a área na margem esquerda e o rótulo "sem
 * coleta" sai impresso por cima do eixo Y. */
export function detectGapRanges<T extends { date: string }>(
  points: T[],
  period: PeriodFilter,
  valueFn: (point: T) => number,
): DateRange[] {
  const totals = new Map<string, number>()
  for (const p of points) totals.set(p.date, (totals.get(p.date) ?? 0) + valueFn(p))

  const comDado = [...totals.entries()]
    .filter(([, total]) => total > 0)
    .map(([date]) => date)
    .sort()
  if (comDado.length === 0) return []
  const primeiro = comDado[0]
  const ultimo = comDado[comDado.length - 1]

  const ranges: DateRange[] = []
  let start: string | undefined
  for (const date of enumerateDates(period)) {
    if (date < primeiro || date > ultimo) continue
    const isZero = (totals.get(date) ?? 0) === 0
    if (isZero && !start) start = date
    if (!isZero && start) {
      ranges.push({ from: start, to: previousDate(date) })
      start = undefined
    }
  }
  if (start) ranges.push({ from: start, to: ultimo })
  return ranges
}

/** Dia com maior soma de `valueFn` entre os pontos - usado pelo KPI de "pico" (menções na
 * Visão Geral, anúncios no drill-down de tópico de anúncio). Soma antes de comparar porque
 * `points` pode ter mais de uma linha por dia (uma por candidato/entidade). */
export function peakDay<T extends { date: string }>(
  points: T[],
  valueFn: (point: T) => number,
): { date: string; total: number } | null {
  if (points.length === 0) return null
  const totals = new Map<string, number>()
  for (const p of points) totals.set(p.date, (totals.get(p.date) ?? 0) + valueFn(p))
  let peak = { date: '', total: -1 }
  for (const [date, total] of totals) {
    if (total > peak.total) peak = { date, total }
  }
  return peak
}

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
