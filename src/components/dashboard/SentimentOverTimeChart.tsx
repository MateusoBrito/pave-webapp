import { AlertTriangle, Inbox } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { SentimentSeriesPoint } from '../../api/client'
import { useFilters } from '../../context/FiltersContext'
import { sentimentColor } from '../../lib/colors'
import { formatShortDate } from '../../lib/dates'
import { ChartCardSkeleton } from '../ui/skeletons'
import { StatusCard } from '../ui/StatusCard'
import { ChartTooltip } from './ChartTooltip'

interface Props {
  points: SentimentSeriesPoint[]
  loading: boolean
  error?: Error
  refetch?: () => void
}

export function SentimentOverTimeChart({ points, loading, error, refetch }: Props) {
  const { setDays, clearFilters } = useFilters()
  const data = points.map((p) => ({
    date: p.date,
    Negativo: p.sentiment.negative,
    Neutro: p.sentiment.neutral,
    Positivo: p.sentiment.positive,
  }))
  const isEmpty =
    !loading && !error && data.every((d) => d.Negativo + d.Neutro + d.Positivo === 0)

  return (
    <section className="rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
        Sentimento ao longo do tempo
      </h2>
      <p className="mb-4 text-xs text-[var(--text-muted)]">
        Barras empilhadas diárias · filtrável por rede social
      </p>

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
        <ChartCardSkeleton height={240} />
      ) : isEmpty ? (
        <StatusCard
          icon={Inbox}
          tone="graphite"
          title="Nenhuma menção neste período"
          description="Ninguém falou sobre este tópico no intervalo selecionado."
          primaryAction={{ label: 'Ampliar para 90 dias', onClick: () => setDays(90) }}
          secondaryAction={{ label: 'Limpar filtros', onClick: clearFilters }}
        />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
            <Tooltip
              content={(props) => <ChartTooltip {...props} />}
              cursor={{ fill: 'var(--gridline)' }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
            <Bar
              dataKey="Negativo"
              stackId="s"
              fill={sentimentColor('negative')}
              isAnimationActive={false}
            />
            <Bar
              dataKey="Neutro"
              stackId="s"
              fill={sentimentColor('neutral')}
              isAnimationActive={false}
            />
            <Bar
              dataKey="Positivo"
              stackId="s"
              fill={sentimentColor('positive')}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </section>
  )
}
