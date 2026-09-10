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
import type { TooltipContentProps } from 'recharts'
import type { NetworkMentions } from '../../api/client'
import { NETWORKS } from '../../types'
import type { Entity } from '../../types'
import { useFilters } from '../../context/FiltersContext'
import { candidateColor } from '../../lib/colors'
import { formatCompactNumber } from '../../lib/format'
import { IconTile } from '../ui/IconTile'
import { ChartCardSkeleton } from '../ui/skeletons'
import { StatusCard } from '../ui/StatusCard'

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

  // Bars are 100%-stacked (each row's segments sum to 100) so a network dominated by one
  // source (YouTube dwarfing Reddit/Meta Ads in absolute terms) doesn't flatten the others
  // into invisibility - the absolute total still shows via renderTotalLabel above each bar.
  //
  // `d.byEntity` vem da API sem filtro de candidato = todo o registro (inclusive gente
  // fora do conjunto monitorado, que nunca ganha `<Bar>` aqui). Sem restringir a `entities`,
  // o total (`d.mentions`) contava essa gente também e a pilha nunca fechava 100%.
  const trackedIds = new Set(entities.map((e) => e.id))
  const rows = data.map((d) => {
    const tracked = d.byEntity.filter((e) => trackedIds.has(e.entityId))
    const total = tracked.reduce((sum, e) => sum + e.mentions, 0)
    const row: Record<string, number | string> = {
      label: NETWORKS.find((n) => n.id === d.network)?.label ?? d.network,
      total,
    }
    for (const e of tracked) {
      row[e.entityId] = total > 0 ? (e.mentions / total) * 100 : 0
      row[`${e.entityId}_abs`] = e.mentions
    }
    return row
  })

  // Custom instead of the shared ChartTooltip: that one formats `label` as a date
  // (formatShortDate), but this chart's x-axis is network names, not dates. Also shows the
  // absolute mention count alongside the now-normalized percentage, since the bar segment
  // itself no longer carries that number visually.
  function renderTooltip({ active, payload, label }: TooltipContentProps) {
    if (!active || !payload || payload.length === 0) return null
    return (
      <div className="rounded-lg border border-[var(--baseline)] bg-[var(--chart-surface)] px-3 py-2 shadow-lg">
        <p className="mb-1 text-xs text-[var(--text-muted)]">{String(label)}</p>
        <dl className="space-y-1">
          {payload
            .filter((entry) => entry.value !== undefined)
            .map((entry) => {
              const rowData = entry.payload as Record<string, number> | undefined
              const abs = Number(rowData?.[`${entry.dataKey}_abs`] ?? 0)
              return (
                <div
                  key={String(entry.dataKey)}
                  className="flex items-center gap-2 text-sm"
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: String(entry.color) }}
                  />
                  <dd className="font-semibold text-[var(--text-primary)]">
                    {Math.round(Number(entry.value))}% · {formatCompactNumber(abs)}
                  </dd>
                  <dt className="text-[var(--text-secondary)]">{entry.name}</dt>
                </div>
              )
            })}
        </dl>
      </div>
    )
  }

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
    const pct = Math.round(Number(value ?? 0))
    if (pct === 0 || nh < 20) return null
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
            {data
              .map((d) => NETWORKS.find((n) => n.id === d.network)?.label ?? d.network)
              .join(' · ')}
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
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip content={renderTooltip} cursor={{ fill: 'var(--gridline)' }} />
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
