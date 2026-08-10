import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { TopicSentiment } from '../../types'
import { seriesColor } from '../../lib/colors'
import { ChartTooltip } from './ChartTooltip'

interface Props {
  sentiment: TopicSentiment | undefined
  loading: boolean
}

const ORDER: { key: keyof TopicSentiment; label: string; colorIndex: number }[] = [
  { key: 'negative', label: 'Negativo', colorIndex: 0 },
  { key: 'neutral', label: 'Neutro', colorIndex: 2 },
  { key: 'positive', label: 'Positivo', colorIndex: 4 },
]

export function SentimentDonut({ sentiment, loading }: Props) {
  const rows = sentiment
    ? ORDER.map((o) => ({
        name: o.label,
        value: sentiment[o.key],
        colorIndex: o.colorIndex,
      })).filter((r) => r.value > 0)
    : []
  const total = rows.reduce((s, r) => s + r.value, 0) || 1

  return (
    <section className="rounded-xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
        Distribuição de sentimento
      </h2>
      <p className="mb-4 text-xs text-[var(--text-muted)]">
        Negativo · neutro · positivo no período
      </p>

      {loading || rows.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-[var(--text-muted)]">
          Carregando…
        </div>
      ) : (
        <div className="flex items-center gap-6">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={rows}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                isAnimationActive={false}
                stroke="var(--chart-surface)"
                strokeWidth={2}
              >
                {rows.map((row) => (
                  <Cell key={row.name} fill={seriesColor(row.colorIndex)} />
                ))}
              </Pie>
              <Tooltip content={(props) => <ChartTooltip {...props} />} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="flex shrink-0 flex-col gap-2">
            {rows.map((row) => (
              <li key={row.name} className="flex items-center gap-2 text-sm">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: seriesColor(row.colorIndex) }}
                />
                <span className="text-[var(--text-secondary)]">{row.name}</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {((row.value / total) * 100).toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
