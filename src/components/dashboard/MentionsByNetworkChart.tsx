import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { NETWORKS } from '../../types'
import type { NetworkMentions } from '../../api/client'
import { ChartTooltip } from './ChartTooltip'

interface Props {
  data: NetworkMentions[]
  loading: boolean
}

export function MentionsByNetworkChart({ data, loading }: Props) {
  const rows = data.map((d) => ({
    network: d.network,
    label: NETWORKS.find((n) => n.id === d.network)?.label ?? d.network,
    mentions: d.mentions,
  }))

  return (
    <section className="rounded-xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
        Menções por rede social
      </h2>
      <p className="mb-4 text-xs text-[var(--text-muted)]">
        {NETWORKS.map((n) => n.label).join(' · ')}
      </p>

      {loading ? (
        <div className="flex h-56 items-center justify-center text-sm text-[var(--text-muted)]">
          Carregando…
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid
              stroke="var(--gridline)"
              strokeDasharray="0"
              vertical={false}
            />
            <XAxis
              dataKey="label"
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
            <Bar
              dataKey="mentions"
              name="Menções"
              fill="var(--series-3)"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </section>
  )
}
