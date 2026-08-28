import { AlertTriangle, Inbox, PieChart as PieChartIcon } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { SentimentLabel, TopicSentiment } from '../../types'
import { useFilters } from '../../context/FiltersContext'
import { sentimentColor } from '../../lib/colors'
import { IconTile } from '../ui/IconTile'
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
  { key: 'positive', label: 'Positivo' },
  { key: 'neutral', label: 'Neutro' },
  { key: 'negative', label: 'Negativo' },
]

function predominant(rows: { key: SentimentLabel; value: number }[], total: number) {
  const top = [...rows].sort((a, b) => b.value - a.value)[0]
  if (!top) return { key: 'neutral' as SentimentLabel, pct: 0 }
  return { key: top.key, pct: (top.value / total) * 100 }
}

export function SentimentDonut({ sentiment, loading, error, refetch }: Props) {
  const { setDays, clearFilters } = useFilters()
  const rows = sentiment
    ? ORDER.map((o) => ({ key: o.key, name: o.label, value: sentiment[o.key] })).filter(
        (r) => r.value > 0,
      )
    : []
  const total = rows.reduce((s, r) => s + r.value, 0) || 1
  const isEmpty = !loading && !error && rows.length === 0
  const top = predominant(rows, total)

  return (
    <section
      className="flex flex-col gap-[15px] rounded-2xl bg-[var(--chart-surface)] p-[22px]"
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      <div className="flex items-center gap-[13px]">
        <IconTile icon={PieChartIcon} tone="coral" size={34} />
        <div>
          <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
            Distribuição de sentimento
          </h2>
          <p className="text-[11px] text-[var(--text-muted)]">
            Comentários do público neste tópico
          </p>
        </div>
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
        <>
          <div className="flex flex-wrap items-center gap-4">
            {rows.map((row) => (
              <span
                key={row.name}
                className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: sentimentColor(row.key) }}
                />
                {row.name}
              </span>
            ))}
          </div>
          <div className="relative">
            <ResponsiveContainer width="100%" height={176}>
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
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-xl font-bold" style={{ color: sentimentColor(top.key) }}>
                {top.pct.toFixed(0)}%
              </p>
              <p
                className="text-[10px] font-medium"
                style={{ color: sentimentColor(top.key) }}
              >
                {ORDER.find((o) => o.key === top.key)?.label.toLowerCase()}
              </p>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
