import { AlertTriangle, MessageSquareText, Search } from 'lucide-react'
import type { TopicRankingRow } from '../../api/client'
import { useFilters } from '../../context/FiltersContext'
import { sentimentColor } from '../../lib/colors'
import { shortName } from '../../lib/format'
import type { Entity } from '../../types'
import { IconTile } from '../ui/IconTile'
import { TableCardSkeleton } from '../ui/skeletons'
import { StatusCard } from '../ui/StatusCard'
import { SentimentBar } from './SentimentBar'

const AXIS = ['0%', '25%', '50%', '75%', '100%']
const LEGEND: { key: 'positive' | 'neutral' | 'negative'; label: string }[] = [
  { key: 'positive', label: 'Positivo' },
  { key: 'neutral', label: 'Neutro' },
  { key: 'negative', label: 'Negativo' },
]

interface Props {
  rows: TopicRankingRow[]
  entities: Entity[]
  subtitle: string
  loading: boolean
  error?: Error
  refetch?: () => void
}

/** "Repercussão dos tópicos" — sentimento por tema, reaproveitando o mesmo
 * TopicRankingRow do ranking ao lado (já traz `.sentiment` por tópico) e a mesma
 * SentimentBar grande usada em "Sentimento por candidato". */
export function TopicSentimentBreakdownList({
  rows,
  entities,
  subtitle,
  loading,
  error,
  refetch,
}: Props) {
  const { clearFilters } = useFilters()
  const isEmpty = !loading && !error && rows.length === 0

  return (
    <section
      className="flex flex-col gap-[15px] rounded-2xl bg-[var(--chart-surface)] p-[22px]"
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      <div className="flex items-center gap-[13px]">
        <IconTile icon={MessageSquareText} tone="coral" size={34} />
        <div>
          <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
            Repercussão dos tópicos
          </h2>
          <p className="text-[11px] text-[var(--text-muted)]">{subtitle}</p>
        </div>
      </div>

      {!loading && !error && !isEmpty && (
        <div className="flex items-center gap-4">
          {LEGEND.map((item) => (
            <span
              key={item.key}
              className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]"
            >
              <span
                className="h-2.5 w-2.5 rounded-[3px]"
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
        <TableCardSkeleton rows={5} />
      ) : isEmpty ? (
        <StatusCard
          icon={Search}
          tone="purple"
          title="Nenhum resultado para este filtro"
          description="A combinação de candidato e período não retornou tópicos."
          primaryAction={{ label: 'Limpar filtros', onClick: clearFilters }}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map((row) => {
            const entity = entities.find((e) => e.id === row.topic.entityId)
            const label = entity
              ? `${row.topic.label} · ${shortName(entity.name)}`
              : row.topic.label
            return (
              <div key={row.topic.id} className="flex items-center gap-2.5">
                <p className="w-36 shrink-0 truncate text-[10px] font-medium text-[var(--text-secondary)]">
                  {label}
                </p>
                <div className="min-w-0 flex-1">
                  <SentimentBar sentiment={row.sentiment} size="lg" showLabels />
                </div>
              </div>
            )
          })}
          <div className="flex items-center gap-2.5">
            <span className="w-36 shrink-0" />
            <div className="flex flex-1 justify-between text-[9px] text-[var(--text-muted)]">
              {AXIS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
