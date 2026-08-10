import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { CandidateVolumePoint } from '../../api/client'
import type { Entity } from '../../types'
import { pivotByDate } from '../../lib/chartData'
import { seriesColor } from '../../lib/colors'
import { formatShortDate } from '../../lib/dates'
import { ChartTooltip } from './ChartTooltip'

interface Props {
  entities: Entity[]
  points: CandidateVolumePoint[]
  loading: boolean
  title?: string
  subtitle?: string
}

export function VolumeOverTimeChart({
  entities,
  points,
  loading,
  title = 'Volume de menções ao longo do tempo',
  subtitle = 'Série diária por candidato · fonte: soma das redes selecionadas',
}: Props) {
  const data = pivotByDate(
    points,
    (p) => p.entityId,
    (p) => p.mentions,
  )

  return (
    <section className="rounded-xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
      <p className="mb-4 text-xs text-[var(--text-muted)]">{subtitle}</p>

      {loading || data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-[var(--text-muted)]">
          Carregando…
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
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
            <Legend wrapperStyle={{ fontSize: 13, color: 'var(--text-secondary)' }} />
            {entities.map((entity, index) => (
              <Line
                key={entity.id}
                dataKey={entity.id}
                name={entity.name}
                stroke={seriesColor(index)}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--chart-surface)' }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </section>
  )
}
