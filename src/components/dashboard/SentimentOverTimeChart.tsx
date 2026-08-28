import { AlertTriangle, BarChart3, Inbox } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { SentimentSeriesPoint } from '../../api/client'
import { useFilters } from '../../context/FiltersContext'
import { sentimentColor } from '../../lib/colors'
import { formatShortDate } from '../../lib/dates'
import { IconTile } from '../ui/IconTile'
import { ChartCardSkeleton } from '../ui/skeletons'
import { StatusCard } from '../ui/StatusCard'
import { ChartTooltip } from './ChartTooltip'

interface Props {
  points: SentimentSeriesPoint[]
  loading: boolean
  error?: Error
  refetch?: () => void
}

const LEGEND = [
  { key: 'positive', label: 'Positivo' },
  { key: 'neutral', label: 'Neutro' },
  { key: 'negative', label: 'Negativo' },
] as const

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
    <section
      className="flex flex-col gap-[15px] rounded-2xl bg-[var(--chart-surface)] p-[22px]"
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      <div className="flex items-center gap-[13px]">
        <IconTile icon={BarChart3} tone="coral" size={34} />
        <div>
          <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
            Sentimento ao longo do tempo
          </h2>
          <p className="text-[11px] text-[var(--text-muted)]">
            Distribuição diária dos comentários sobre este tópico
          </p>
        </div>
      </div>

      {!loading && !error && !isEmpty && (
        <div className="flex flex-wrap items-center gap-4">
          {LEGEND.map((item) => (
            <span
              key={item.key}
              className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                style={{ backgroundColor: sentimentColor(item.key) }}
              />
              {item.label}
            </span>
          ))}
        </div>
      )}

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
          description="Ninguém falou sobre este tópico no intervalo selecionado."
          primaryAction={{ label: 'Ampliar para 90 dias', onClick: () => setDays(90) }}
          secondaryAction={{ label: 'Limpar filtros', onClick: clearFilters }}
        />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
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

      {!loading && !error && !isEmpty && (
        <div className="flex items-start gap-[10px] rounded-[11px] border border-[var(--tint-amber)] bg-[var(--tint-amber)] px-[14px] py-[11px]">
          <AlertTriangle
            size={15}
            className="mt-0.5 shrink-0 text-[var(--tint-text-amber)]"
          />
          <p className="flex-1 text-[11px] text-[var(--tint-text-amber)]">
            Sentimento é calculado apenas para Reddit e YouTube. Anúncios da Meta são
            conteúdo do próprio candidato e não têm reação pública coletável.
          </p>
        </div>
      )}
    </section>
  )
}
