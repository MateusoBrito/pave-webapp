import { AlertTriangle, Inbox } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { SentimentLabel, TopicSentiment } from '../../types'
import { useFilters } from '../../context/FiltersContext'
import { sentimentColor } from '../../lib/colors'
import { ChartCardSkeleton } from '../ui/skeletons'
import { StatusCard } from '../ui/StatusCard'
import { ChartTooltip } from './ChartTooltip'

interface Props {
  sentiment: TopicSentiment | undefined
  loading: boolean
  error?: Error
  refetch?: () => void
}

const ORDER: { key: SentimentLabel; label: string }[] = [
  { key: 'negative', label: 'Negativo' },
  { key: 'neutral', label: 'Neutro' },
  { key: 'positive', label: 'Positivo' },
]

export function SentimentDonut({ sentiment, loading, error, refetch }: Props) {
  const { setDays, clearFilters } = useFilters()
  const rows = sentiment
    ? ORDER.map((o) => ({ key: o.key, name: o.label, value: sentiment[o.key] })).filter(
        (r) => r.value > 0,
      )
    : []
  const total = rows.reduce((s, r) => s + r.value, 0) || 1
  const isEmpty = !loading && !error && rows.length === 0

  return (
    <section className="rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
        Distribuição de sentimento
      </h2>
      <p className="mb-4 text-xs text-[var(--text-muted)]">
        Negativo · neutro · positivo no período
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
        <ChartCardSkeleton height={180} />
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
        <div className="flex items-center gap-6">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={rows}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                isAnimationActive={false}
                stroke="var(--chart-surface)"
                strokeWidth={2}
              >
                {rows.map((row) => (
                  <Cell key={row.name} fill={sentimentColor(row.key)} />
                ))}
              </Pie>
              <Tooltip content={(props) => <ChartTooltip {...props} />} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="flex shrink-0 flex-col gap-2">
            {rows.map((row) => (
              <li key={row.name} className="flex items-center gap-2 text-sm">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: sentimentColor(row.key) }}
                />
                <span className="text-[var(--text-secondary)]">{row.name}</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {((row.value / total) * 100).toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
