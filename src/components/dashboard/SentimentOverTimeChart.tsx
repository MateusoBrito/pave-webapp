import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { SentimentSeriesPoint } from '../../api/client'
import { seriesColor } from '../../lib/colors'
import { formatShortDate } from '../../lib/dates'
import { ChartTooltip } from './ChartTooltip'

interface Props {
  points: SentimentSeriesPoint[]
  loading: boolean
}

export function SentimentOverTimeChart({ points, loading }: Props) {
  const data = points.map((p) => ({
    date: p.date,
    Negativo: p.sentiment.negative,
    Neutro: p.sentiment.neutral,
    Positivo: p.sentiment.positive,
  }))

  return (
    <section className="rounded-xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
        Sentimento ao longo do tempo
      </h2>
      <p className="mb-4 text-xs text-[var(--text-muted)]">
        Barras empilhadas diárias · filtrável por rede social
      </p>

      {loading || data.length === 0 ? (
        <div className="flex h-56 items-center justify-center text-sm text-[var(--text-muted)]">
          Carregando…
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
            <Tooltip
              content={(props) => <ChartTooltip {...props} />}
              cursor={{ fill: 'var(--gridline)' }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
            <Bar
              dataKey="Negativo"
              stackId="s"
              fill={seriesColor(0)}
              isAnimationActive={false}
            />
            <Bar
              dataKey="Neutro"
              stackId="s"
              fill={seriesColor(2)}
              isAnimationActive={false}
            />
            <Bar
              dataKey="Positivo"
              stackId="s"
              fill={seriesColor(4)}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </section>
  )
}
