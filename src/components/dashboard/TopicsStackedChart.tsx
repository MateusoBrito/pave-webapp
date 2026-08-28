import { AlertTriangle, Inbox, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Entity, Topic, TopicSeriesPoint } from '../../types'
import { useFilters } from '../../context/FiltersContext'
import { pivotByDate } from '../../lib/chartData'
import { topicColor } from '../../lib/colors'
import { formatShortDate } from '../../lib/dates'
import { shortName } from '../../lib/format'
import { IconTile } from '../ui/IconTile'
import { SegmentedControl } from '../ui/SegmentedControl'
import { ChartCardSkeleton } from '../ui/skeletons'
import { StatusCard } from '../ui/StatusCard'
import { ChartTooltip } from './ChartTooltip'

type Mode = 'stacked' | 'percent' | 'lines'

const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: 'stacked', label: 'Empilhado' },
  { value: 'percent', label: '100%' },
  { value: 'lines', label: 'Linhas' },
]
// soft cap de séries categóricas (dataviz skill) — o resto dobra em "Outros"
const FEATURED_COUNT = 4

interface Props {
  topics: Topic[]
  entities: Entity[]
  series: TopicSeriesPoint[]
  loading: boolean
  error?: Error
  refetch?: () => void
}

export function TopicsStackedChart({
  topics,
  entities,
  series,
  loading,
  error,
  refetch,
}: Props) {
  const [mode, setMode] = useState<Mode>('stacked')
  const { setDays, clearFilters } = useFilters()

  const orderedTopics = useMemo(
    () => [...topics].sort((a, b) => b.weight - a.weight),
    [topics],
  )
  const featured = orderedTopics.slice(0, FEATURED_COUNT)
  const rest = orderedTopics.slice(FEATURED_COUNT)
  const chartSeries = useMemo(
    () => [
      ...featured,
      ...(rest.length > 0 ? [{ id: 'outros', label: 'Outros' } as Topic] : []),
    ],
    [featured, rest],
  )
  const seriesName = (topic: Topic) => {
    const entity = entities.find((e) => e.id === topic.entityId)
    return entity ? `${topic.label} · ${shortName(entity.name)}` : topic.label
  }
  const isEmpty = !loading && !error && series.every((p) => p.mentions === 0)

  const data = useMemo(() => {
    const pivoted = pivotByDate(
      series,
      (p) => p.topicId,
      (p) => p.mentions,
    )
    const rows =
      rest.length === 0
        ? pivoted
        : pivoted.map((row) => {
            const next: Record<string, number | string> = { date: row.date }
            for (const t of featured) next[t.id] = row[t.id] ?? 0
            next.outros = rest.reduce((sum, t) => sum + (Number(row[t.id]) || 0), 0)
            return next
          })

    if (mode !== 'percent') return rows
    return rows.map((row) => {
      const total = chartSeries.reduce((sum, t) => sum + (Number(row[t.id]) || 0), 0) || 1
      const next: Record<string, number | string> = { date: row.date }
      for (const t of chartSeries) next[t.id] = ((Number(row[t.id]) || 0) / total) * 100
      return next
    })
  }, [series, featured, rest, mode, chartSeries])

  return (
    <section
      className="flex flex-col gap-[15px] rounded-2xl bg-[var(--chart-surface)] p-[22px]"
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      <div className="flex flex-wrap items-center gap-[13px]">
        <IconTile icon={TrendingUp} tone="purple" size={34} />
        <div className="flex-1">
          <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
            Evolução dos tópicos no tempo
          </h2>
          <p className="text-[11px] text-[var(--text-muted)]">
            Menções por dia em cada tópico
          </p>
        </div>
        <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />
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
        <ChartCardSkeleton height={288} />
      ) : isEmpty ? (
        <StatusCard
          icon={Inbox}
          tone="graphite"
          title="Nenhuma menção neste período"
          description="Ninguém falou sobre este recorte no intervalo selecionado."
          primaryAction={{ label: 'Ampliar para 90 dias', onClick: () => setDays(90) }}
          secondaryAction={{ label: 'Limpar filtros', onClick: clearFilters }}
        />
      ) : mode === 'lines' ? (
        <ResponsiveContainer width="100%" height={288}>
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
              allowDecimals={false}
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={(props) => <ChartTooltip {...props} />} />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
            {chartSeries.map((topic, index) => (
              <Line
                key={topic.id}
                dataKey={topic.id}
                name={topic.id === 'outros' ? topic.label : seriesName(topic)}
                stroke={topicColor(index)}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={288}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
              unit={mode === 'percent' ? '%' : undefined}
            />
            <Tooltip content={(props) => <ChartTooltip {...props} />} />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
            {chartSeries.map((topic, index) => (
              <Area
                key={topic.id}
                dataKey={topic.id}
                name={topic.id === 'outros' ? topic.label : seriesName(topic)}
                stackId="topics"
                stroke={topicColor(index)}
                strokeWidth={2}
                fill={topicColor(index)}
                fillOpacity={0.55}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </section>
  )
}
