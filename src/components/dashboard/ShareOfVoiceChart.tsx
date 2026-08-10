import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { ShareOfVoiceEntry } from '../../api/client'
import type { Entity } from '../../types'
import { seriesColor } from '../../lib/colors'
import { ChartTooltip } from './ChartTooltip'

interface Props {
  entities: Entity[]
  data: ShareOfVoiceEntry[]
  loading: boolean
}

export function ShareOfVoiceChart({ entities, data, loading }: Props) {
  const rows = data
    .map((d) => ({
      entityId: d.entityId,
      name: entities.find((e) => e.id === d.entityId)?.name ?? d.entityId,
      mentions: d.mentions,
    }))
    .filter((r) => r.mentions > 0)

  return (
    <section className="rounded-xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
        Share of voice por candidato
      </h2>
      <p className="mb-4 text-xs text-[var(--text-muted)]">
        Participação no total de menções do período
      </p>

      {loading || rows.length === 0 ? (
        <div className="flex h-56 items-center justify-center text-sm text-[var(--text-muted)]">
          Carregando…
        </div>
      ) : (
        <div className="flex items-center gap-6">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={rows}
                dataKey="mentions"
                nameKey="name"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
                isAnimationActive={false}
                stroke="var(--chart-surface)"
                strokeWidth={2}
              >
                {rows.map((row, index) => (
                  <Cell key={row.entityId} fill={seriesColor(index)} />
                ))}
              </Pie>
              <Tooltip content={(props) => <ChartTooltip {...props} />} />
            </PieChart>
          </ResponsiveContainer>

          <ul className="flex shrink-0 flex-col gap-2">
            {entities.map((entity, index) => {
              const row = rows.find((r) => r.entityId === entity.id)
              if (!row) return null
              const total = rows.reduce((s, r) => s + r.mentions, 0) || 1
              return (
                <li key={entity.id} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: seriesColor(index) }}
                  />
                  <span className="text-[var(--text-secondary)]">{entity.name}</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {((row.mentions / total) * 100).toFixed(0)}%
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
