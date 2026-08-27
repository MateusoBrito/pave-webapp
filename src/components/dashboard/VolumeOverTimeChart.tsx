import { AlertTriangle, Inbox, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  CartesianGrid,
  Label,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { CandidateVolumePoint, PeriodFilter } from '../../api/client'
import type { Entity } from '../../types'
import { useFilters } from '../../context/FiltersContext'
import { pivotByDate, detectGapRanges } from '../../lib/chartData'
import { candidateColor } from '../../lib/colors'
import { formatShortDate } from '../../lib/dates'
import { Button } from '../ui/Button'
import { IconTile, type IconTone } from '../ui/IconTile'
import { ChartCardSkeleton } from '../ui/skeletons'
import { StatusCard } from '../ui/StatusCard'
import { ChartTooltip } from './ChartTooltip'

interface Props {
  entities: Entity[]
  points: CandidateVolumePoint[]
  loading: boolean
  error?: Error
  refetch?: () => void
  period: PeriodFilter
  title?: string
  subtitle?: string
  icon?: LucideIcon
  tone?: IconTone
}

export function VolumeOverTimeChart({
  entities,
  points,
  loading,
  error,
  refetch,
  period,
  title = 'Volume de menções ao longo do tempo',
  subtitle = 'Série diária por candidato',
  icon = TrendingUp,
  tone = 'purple',
}: Props) {
  const { setDays, clearFilters } = useFilters()
  const data = pivotByDate(
    points,
    (p) => p.entityId,
    (p) => p.mentions,
  )
  const gaps = detectGapRanges(points, period, (p) => p.mentions)
  const isEmpty =
    !loading && !error && data.every((row) => entities.every((e) => !row[e.id]))

  return (
    <section className="rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <div className="flex items-center gap-3">
        <IconTile icon={icon} tone={tone} size={36} />
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
          <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
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
          <ChartCardSkeleton height={260} />
        ) : isEmpty ? (
          <StatusCard
            icon={Inbox}
            tone="graphite"
            title="Nenhuma menção neste período"
            description={`Ninguém falou sobre este recorte entre ${formatShortDate(period.from)} e ${formatShortDate(period.to)}.`}
            primaryAction={{ label: 'Ampliar para 90 dias', onClick: () => setDays(90) }}
            secondaryAction={{ label: 'Limpar filtros', onClick: clearFilters }}
          />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <pattern
                  id="gapHatch"
                  patternUnits="userSpaceOnUse"
                  width="6"
                  height="6"
                  patternTransform="rotate(45)"
                >
                  <rect width="6" height="6" fill="var(--chart-surface)" />
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="6"
                    stroke="var(--baseline)"
                    strokeWidth="2"
                  />
                </pattern>
              </defs>
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
              {gaps.map((gap) => (
                <ReferenceArea
                  key={gap.from}
                  x1={gap.from}
                  x2={gap.to}
                  fill="url(#gapHatch)"
                  stroke="var(--baseline)"
                  strokeOpacity={0.6}
                  ifOverflow="visible"
                >
                  <Label
                    value="sem coleta"
                    position="insideTop"
                    offset={8}
                    fill="var(--text-muted)"
                    fontSize={11}
                  />
                </ReferenceArea>
              ))}
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
      </div>

      {!loading && !error && !isEmpty && gaps.length > 0 && (
        <div className="mt-3">
          <Button
            variant="secondary"
            disabled
            title="Página de status da coleta ainda não existe"
            className="px-3 py-1.5 text-xs"
          >
            Ver status da coleta
          </Button>
        </div>
      )}
    </section>
  )
}
