import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Topic, TopicSeriesPoint } from '../../types'
import { pivotByDate } from '../../lib/chartData'
import { seriesColor } from '../../lib/colors'
import { formatShortDate } from '../../lib/dates'
import { ChartTooltip } from './ChartTooltip'

type Mode = 'stacked' | 'percent' | 'lines'

const MODE_LABEL: Record<Mode, string> = {
  stacked: 'Empilhado',
  percent: '100%',
  lines: 'Linhas',
}
// soft cap de séries categóricas (dataviz skill) — o resto dobra em "Outros"
const FEATURED_COUNT = 4

interface Props {
  topics: Topic[]
  series: TopicSeriesPoint[]
  loading: boolean
}

export function TopicsStackedChart({ topics, series, loading }: Props) {
  const [mode, setMode] = useState<Mode>('stacked')

  const orderedTopics = useMemo(
    () => [...topics].sort((a, b) => b.weight - a.weight),
    [topics],
  )
  const featured = orderedTopics.slice(0, FEATURED_COUNT)
  const rest = orderedTopics.slice(FEATURED_COUNT)
  const chartSeries = useMemo(
    () => [
      ...featured,
      ...(rest.length > 0 ? [{ id: 'outros', label: 'Outros' } as Topic] : []),
    ],
    [featured, rest],
  )

  const data = useMemo(() => {
    const pivoted = pivotByDate(
      series,
      (p) => p.topicId,
      (p) => p.mentions,
    )
    const rows =
      rest.length === 0
        ? pivoted
        : pivoted.map((row) => {
            const next: Record<string, number | string> = { date: row.date }
            for (const t of featured) next[t.id] = row[t.id] ?? 0
            next.outros = rest.reduce((sum, t) => sum + (Number(row[t.id]) || 0), 0)
            return next
          })

    if (mode !== 'percent') return rows
    return rows.map((row) => {
      const total = chartSeries.reduce((sum, t) => sum + (Number(row[t.id]) || 0), 0) || 1
      const next: Record<string, number | string> = { date: row.date }
      for (const t of chartSeries) next[t.id] = ((Number(row[t.id]) || 0) / total) * 100
      return next
    })
  }, [series, featured, rest, mode, chartSeries])

  return (
    <section className="rounded-xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Evolução dos tópicos no tempo
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Participação diária de cada tópico · re-modelagem mensal marcada na linha do
            tempo
          </p>
        </div>
        <div className="flex gap-1">
          {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                mode === m
                  ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--chart-surface)]'
                  : 'border-[var(--baseline)] text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
      </div>

      {loading || data.length === 0 ? (
        <div className="flex h-72 items-center justify-center text-sm text-[var(--text-muted)]">
          Carregando…
        </div>
      ) : mode === 'lines' ? (
        <ResponsiveContainer width="100%" height={288}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid
              stroke="var(--gridline)"
              strokeDasharray="0"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--baseline)' }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={(props) => <ChartTooltip {...props} />} />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
            {chartSeries.map((topic, index) => (
              <Line
                key={topic.id}
                dataKey={topic.id}
                name={topic.label}
                stroke={seriesColor(index)}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={288}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid
              stroke="var(--gridline)"
              strokeDasharray="0"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--baseline)' }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={40}
              unit={mode === 'percent' ? '%' : undefined}
            />
            <Tooltip content={(props) => <ChartTooltip {...props} />} />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
            {chartSeries.map((topic, index) => (
              <Area
                key={topic.id}
                dataKey={topic.id}
                name={topic.label}
                stackId="topics"
                stroke={seriesColor(index)}
                strokeWidth={2}
                fill={seriesColor(index)}
                fillOpacity={0.55}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </section>
  )
}
