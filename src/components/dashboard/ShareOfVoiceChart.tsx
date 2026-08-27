import { AlertTriangle, Inbox, PieChart as PieIcon } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { ShareOfVoiceEntry } from '../../api/client'
import type { Entity } from '../../types'
import { useFilters } from '../../context/FiltersContext'
import { candidateColor } from '../../lib/colors'
import { formatCompactNumber } from '../../lib/format'
import { IconTile } from '../ui/IconTile'
import { ChartCardSkeleton } from '../ui/skeletons'
import { StatusCard } from '../ui/StatusCard'
import { ChartTooltip } from './ChartTooltip'

interface Props {
  entities: Entity[]
  data: ShareOfVoiceEntry[]
  loading: boolean
  error?: Error
  refetch?: () => void
}

export function ShareOfVoiceChart({ entities, data, loading, error, refetch }: Props) {
  const { setDays, clearFilters } = useFilters()
  const rows = data
    .map((d) => ({
      entityId: d.entityId,
      name: entities.find((e) => e.id === d.entityId)?.name ?? d.entityId,
      mentions: d.mentions,
      share: d.share,
    }))
    .filter((r) => r.mentions > 0)
  const total = rows.reduce((s, r) => s + r.mentions, 0)
  const isEmpty = !loading && !error && rows.length === 0

  return (
    <section className="rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <div className="mb-1 flex items-center gap-3">
        <IconTile icon={PieIcon} tone="blue" size={36} />
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Share of voice por candidato
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Participação no total de menções do período
          </p>
        </div>
      </div>

      {!loading && !error && !isEmpty && (
        <div className="mt-3 mb-2 flex flex-wrap gap-4 text-sm">
          {rows.map((row) => (
            <span
              key={row.entityId}
              className="flex items-center gap-1.5 text-[var(--text-secondary)]"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: candidateColor(row.entityId) }}
              />
              {row.name}{' '}
              <strong className="text-[var(--text-primary)]">
                {(row.share * 100).toFixed(0)}%
              </strong>
            </span>
          ))}
        </div>
      )}

      <div className="mt-3">
        {error ? (
          <StatusCard
            icon={AlertTriangle}
            tone="coral"
            title="Não foi possível carregar"
            description="Falha ao consultar a API. Seus filtros foram mantidos — é só tentar de novo."
            primaryAction={
              refetch ? { label: 'Tentar novamente', onClick: refetch } : undefined
            }
            secondaryAction={{
              label: `Copiar código do erro · ${error.message || '500'}`,
              onClick: () => navigator.clipboard?.writeText(error.message || '500'),
            }}
          />
        ) : loading ? (
          <ChartCardSkeleton height={220} />
        ) : isEmpty ? (
          <StatusCard
            icon={Inbox}
            tone="graphite"
            title="Nenhuma menção neste período"
            description="Ninguém falou sobre este recorte no intervalo selecionado."
            primaryAction={{ label: 'Ampliar para 90 dias', onClick: () => setDays(90) }}
            secondaryAction={{ label: 'Limpar filtros', onClick: clearFilters }}
          />
        ) : (
          <div className="relative">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={rows}
                  dataKey="mentions"
                  nameKey="name"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={2}
                  isAnimationActive={false}
                  stroke="var(--chart-surface)"
                  strokeWidth={2}
                >
                  {rows.map((row) => (
                    <Cell key={row.entityId} fill={candidateColor(row.entityId)} />
                  ))}
                </Pie>
                <Tooltip content={(props) => <ChartTooltip {...props} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {formatCompactNumber(total)}
              </p>
              <p className="text-xs text-[var(--text-muted)]">menções no período</p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
