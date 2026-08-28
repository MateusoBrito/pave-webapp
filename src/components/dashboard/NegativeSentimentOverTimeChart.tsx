import { AlertTriangle, Inbox, TrendingDown } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { CandidateSentimentPoint } from '../../api/client'
import type { Entity } from '../../types'
import { useFilters } from '../../context/FiltersContext'
import { pivotByDate } from '../../lib/chartData'
import { candidateColor } from '../../lib/colors'
import { formatShortDate } from '../../lib/dates'
import { IconTile } from '../ui/IconTile'
import { ChartCardSkeleton } from '../ui/skeletons'
import { StatusCard } from '../ui/StatusCard'
import { ChartTooltip } from './ChartTooltip'

interface Props {
  entities: Entity[]
  points: CandidateSentimentPoint[]
  loading: boolean
  error?: Error
  refetch?: () => void
}

/** "Sentimento negativo ao longo do tempo" do Comparativo — % negativo/dia por
 * candidato, na mesma escala (0-100%), pra comparar diretamente. */
export function NegativeSentimentOverTimeChart({
  entities,
  points,
  loading,
  error,
  refetch,
}: Props) {
  const { setDays, clearFilters } = useFilters()
  const data = pivotByDate(
    points,
    (p) => p.entityId,
    (p) => p.negativePct,
  )
  const isEmpty = !loading && !error && data.length === 0

  return (
    <section
      className="flex flex-col gap-[15px] rounded-2xl bg-[var(--chart-surface)] p-[22px]"
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      <div className="flex flex-wrap items-center gap-[13px]">
        <IconTile icon={TrendingDown} tone="coral" size={34} />
        <div className="flex-1">
          <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
            Sentimento negativo ao longo do tempo
          </h2>
          <p className="text-[11px] text-[var(--text-muted)]">
            Percentual de comentários negativos por dia · comparável entre candidatos
          </p>
        </div>
        {!loading && !error && !isEmpty && (
          <div className="flex flex-wrap gap-4 text-sm">
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
      </div>

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
        <ChartCardSkeleton height={200} />
      ) : isEmpty ? (
        <StatusCard
          icon={Inbox}
          tone="graphite"
          title="Nenhum dado de sentimento neste período"
          description="Sem comentários orgânicos suficientes para calcular sentimento no recorte atual."
          primaryAction={{ label: 'Ampliar para 90 dias', onClick: () => setDays(90) }}
          secondaryAction={{ label: 'Limpar filtros', onClick: clearFilters }}
        />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
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
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
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
