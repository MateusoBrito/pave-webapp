import { AlertTriangle, BarChart3, Inbox } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { NetworkMentions } from '../../api/client'
import { NETWORKS } from '../../types'
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
  data: NetworkMentions[]
  loading: boolean
  error?: Error
  refetch?: () => void
}

interface SegmentLabelProps {
  x?: number | string
  y?: number | string
  width?: number | string
  height?: number | string
  // recharts' internal RenderableText union is wider than worth mirroring exactly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any
  index?: number
}

export function MentionsByNetworkChart({
  entities,
  data,
  loading,
  error,
  refetch,
}: Props) {
  const { setDays, clearFilters } = useFilters()
  const isEmpty = !loading && !error && data.every((d) => d.mentions === 0)

  const rows = data.map((d) => {
    const row: Record<string, number | string> = {
      label: NETWORKS.find((n) => n.id === d.network)?.label ?? d.network,
      total: d.mentions,
    }
    for (const e of d.byEntity) row[e.entityId] = e.mentions
    return row
  })

  function renderPercentLabel({ x, y, width, height, value, index }: SegmentLabelProps) {
    if (
      index === undefined ||
      x === undefined ||
      y === undefined ||
      width === undefined ||
      height === undefined
    )
      return null
    const nx = Number(x)
    const ny = Number(y)
    const nw = Number(width)
    const nh = Number(height)
    const total = Number(rows[index]?.total ?? 0)
    const segment = Number(value ?? 0)
    if (total === 0 || segment === 0 || nh < 20) return null
    const pct = Math.round((segment / total) * 100)
    return (
      <text
        x={nx + nw / 2}
        y={ny + nh / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontSize={12}
        fontWeight={600}
      >
        {pct}%
      </text>
    )
  }

  function renderTotalLabel({ x, y, width, index }: SegmentLabelProps) {
    if (index === undefined || x === undefined || y === undefined || width === undefined)
      return null
    const nx = Number(x)
    const ny = Number(y)
    const nw = Number(width)
    const total = Number(rows[index]?.total ?? 0)
    return (
      <text
        x={nx + nw / 2}
        y={ny - 10}
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
        fill="var(--text-primary)"
      >
        {formatCompactNumber(total)}
      </text>
    )
  }

  return (
    <section className="rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <div className="mb-1 flex items-center gap-3">
        <IconTile icon={BarChart3} tone="amber" size={36} />
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Menções por rede social
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            {NETWORKS.map((n) => n.label).join(' · ')}
          </p>
        </div>
      </div>

      {!loading && !error && !isEmpty && (
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
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={rows} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
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
              {entities.map((entity, index) => (
                <Bar
                  key={entity.id}
                  dataKey={entity.id}
                  name={entity.name}
                  stackId="net"
                  fill={candidateColor(entity.id)}
                  isAnimationActive={false}
                  radius={index === entities.length - 1 ? [6, 6, 0, 0] : undefined}
                >
                  <LabelList dataKey={entity.id} content={renderPercentLabel} />
                  {index === entities.length - 1 && (
                    <LabelList dataKey={entity.id} content={renderTotalLabel} />
                  )}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
