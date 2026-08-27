import { TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  CartesianGrid,
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
import { candidateColor } from '../../lib/colors'
import { formatShortDate } from '../../lib/dates'
import { IconTile, type IconTone } from '../ui/IconTile'
import { ChartTooltip } from './ChartTooltip'

interface Props {
  entities: Entity[]
  points: CandidateVolumePoint[]
  loading: boolean
  title?: string
  subtitle?: string
  icon?: LucideIcon
  tone?: IconTone
}

export function VolumeOverTimeChart({
  entities,
  points,
  loading,
  title = 'Volume de menções ao longo do tempo',
  subtitle = 'Série diária por candidato',
  icon = TrendingUp,
  tone = 'purple',
}: Props) {
  const data = pivotByDate(
    points,
    (p) => p.entityId,
    (p) => p.mentions,
  )

  return (
    <section className="rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <div className="flex items-center gap-3">
        <IconTile icon={icon} tone={tone} size={36} />
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
          <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
        </div>
      </div>

      <div className="mt-3 mb-2 flex flex-wrap gap-4 text-sm">
        {entities.map((entity) => (
          <span
            key={entity.id}
            className="flex items-center gap-1.5 text-[var(--text-secondary)]"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: candidateColor(entity.id) }}
            />
            {entity.name}
          </span>
        ))}
      </div>

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
            {entities.map((entity) => (
              <Line
                key={entity.id}
                dataKey={entity.id}
                name={entity.name}
                stroke={candidateColor(entity.id)}
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
