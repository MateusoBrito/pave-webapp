import type { PeriodFilter } from '../api/client'

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Âncora no D-1 (última coleta) — dado nunca existe para "hoje", só até ontem. */
export function lastNDaysPeriod(n: number): PeriodFilter {
  const to = new Date()
  to.setUTCDate(to.getUTCDate() - 1)
  const from = new Date(to)
  from.setUTCDate(from.getUTCDate() - (n - 1))
  return { from: toIsoDate(from), to: toIsoDate(to) }
}

export function formatShortDate(iso: string): string {
  const [, month, day] = iso.split('-')
  return `${day}/${month}`
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateRange(period: PeriodFilter): string {
  const [, fm, fd] = period.from.split('-')
  const [ty, tm, td] = period.to.split('-')
  return `${fd}/${fm} – ${td}/${tm}/${ty}`
}

export function formatFullDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
