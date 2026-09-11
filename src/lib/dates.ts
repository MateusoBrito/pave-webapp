import type { PeriodFilter } from '../api/client'

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** D-1 - mesma âncora usada por lastNDaysPeriod/allTimePeriod (dado nunca existe para
 * "hoje", só até ontem). */
export function yesterdayIsoDate(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return toIsoDate(d)
}

/** Âncora no D-1 (última coleta) — dado nunca existe para "hoje", só até ontem. */
export function lastNDaysPeriod(n: number): PeriodFilter {
  const to = new Date()
  to.setUTCDate(to.getUTCDate() - 1)
  const from = new Date(to)
  from.setUTCDate(from.getUTCDate() - (n - 1))
  return { from: toIsoDate(from), to: toIsoDate(to) }
}

/** Não existe controle de período na Visão Geral, ela sempre mostra tudo que o
 * Postgres retém (hoje, ~1 semana por política de retenção; ver pipelines/etl). A API
 * rejeita períodos com mais de 366 dias (deps.py, MAX_PERIOD_DAYS) - 365 dias pra trás
 * cobre qualquer coisa que a retenção guarde com folga, sem esbarrar nesse limite. */
const ALL_TIME_DAYS = 365

export function allTimePeriod(): PeriodFilter {
  return lastNDaysPeriod(ALL_TIME_DAYS)
}

export function formatShortDate(iso: string): string {
  const [, month, day] = iso.split('-')
  return `${day}/${month}`
}

/** "05/09 14h" — eixo/tooltip dos gráficos por hora do drill-down de tópico. Inclui o
 * dia (não só a hora): o modelo é ajustado com os documentos de um dia, mas o
 * "transform" de 2 em 2 horas pode atribuir documentos atrasados de outro dia ao
 * mesmo tópico depois - na prática um tópico costuma ter atividade em pelo menos dois
 * dias, então só a hora sozinha ("14h") é ambígua. Formato falado ("14h", não
 * "14:00"): mais curto e mais fácil de ler no eixo do que o formato de relógio, que
 * também repetia ":00" em todo ponto (os baldes são sempre hora cheia). */
export function formatHour(iso: string): string {
  const d = new Date(iso)
  const dia = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${dia} ${d.getHours()}h`
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
