import { AlertTriangle, Inbox, TrendingUp } from 'lucide-react'
import {
  CartesianGrid,
  Label,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import type { TopicHourlyVolumePoint } from '../../api/client'
import type { Entity } from '../../types'
import { candidateColor } from '../../lib/colors'
import { formatHour } from '../../lib/dates'
import { IconTile } from '../ui/IconTile'
import { ChartCardSkeleton } from '../ui/skeletons'
import { StatusCard } from '../ui/StatusCard'

interface Props {
  entity?: Entity
  points: TopicHourlyVolumePoint[]
  loading: boolean
  error?: Error
  refetch?: () => void
}

/** Evolução do tópico por hora — não por dia: a modelagem é diária agora, então o
 * tópico inteiro já vive dentro de um único dia calendário (ver TopicHourlyVolumePoint
 * em client.ts); um gráfico diário colapsaria num ponto só. Sempre uma linha só (o
 * tópico já pertence a um único candidato). */
export function TopicHourlyVolumeChart({ entity, points, loading, error, refetch }: Props) {
  const data = points.map((p) => ({ date: p.date, mentions: p.mentions }))
  const isEmpty = !loading && !error && data.every((d) => !d.mentions)
  const color = entity ? candidateColor(entity.id) : 'var(--color-primary)'

  function renderTooltip({ active, payload, label }: TooltipContentProps) {
    if (!active || !payload || payload.length === 0) return null
    const value = Number(payload[0]?.value ?? 0)
    return (
      <div className="rounded-lg border border-[var(--baseline)] bg-[var(--chart-surface)] px-3 py-2 shadow-lg">
        <p className="mb-1 text-xs text-[var(--text-muted)]">{formatHour(String(label))}</p>
        <p className="flex items-center gap-2 text-sm">
          <span className="inline-block h-0.5 w-3" style={{ backgroundColor: color }} />
          <span className="font-semibold text-[var(--text-primary)]">
            {value.toLocaleString('pt-BR')}
          </span>
          <span className="text-[var(--text-secondary)]">menções</span>
        </p>
      </div>
    )
  }

  return (
    <section className="rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <div className="flex items-center gap-3">
        <IconTile icon={TrendingUp} tone="purple" size={36} />
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Evolução do tópico
          </h2>
          <p className="text-xs text-[var(--text-muted)]">Menções por hora</p>
        </div>
      </div>

      <div className="mt-3">
        {error ? (
          <StatusCard
            icon={AlertTriangle}
            tone="coral"
            title="Não foi possível carregar"
            description="Falha ao consultar a API. É só tentar de novo."
            primaryAction={refetch ? { label: 'Tentar novamente', onClick: refetch } : undefined}
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
            title="Nenhuma menção neste dia"
            description="Não há documentos suficientes para desenhar a evolução por hora deste tópico."
          />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--gridline)" strokeDasharray="0" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatHour}
                interval="preserveStartEnd"
                minTickGap={48}
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
              >
                <Label
                  value="Menções"
                  angle={-90}
                  position="insideLeft"
                  style={{ fill: 'var(--text-muted)', fontSize: 11, textAnchor: 'middle' }}
                />
              </YAxis>
              <Tooltip content={renderTooltip} />
              <Line
                dataKey="mentions"
                name={entity?.name ?? 'Menções'}
                stroke={color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--chart-surface)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
