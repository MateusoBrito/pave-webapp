import { AlertTriangle, Search, Thermometer } from 'lucide-react'
import type { CandidateSentimentSummary } from '../../api/client'
import { useFilters } from '../../context/FiltersContext'
import { sentimentColor } from '../../lib/colors'
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
  rows: CandidateSentimentSummary[]
  subtitle: string
  loading: boolean
  error?: Error
  refetch?: () => void
}

/** "Sentimento por candidato" — uma SentimentBar grande por candidato, mesma barra do
 * Comparativo (size="lg" showLabels), reaproveitada aqui. */
export function CandidateSentimentBreakdown({
  rows,
  subtitle,
  loading,
  error,
  refetch,
}: Props) {
  const { clearFilters } = useFilters()
  const isEmpty =
    !loading &&
    !error &&
    rows.every(
      (r) => r.sentiment.negative + r.sentiment.neutral + r.sentiment.positive === 0,
    )

  return (
    <section
      className="flex flex-col gap-[15px] rounded-2xl bg-[var(--chart-surface)] p-[22px]"
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      <div className="flex items-center gap-[13px]">
        <IconTile icon={Thermometer} tone="blue" size={34} />
        <div>
          <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
            Sentimento por candidato
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
        <TableCardSkeleton rows={2} />
      ) : isEmpty ? (
        <StatusCard
          icon={Search}
          tone="purple"
          title="Nenhum comentário neste período"
          description="A combinação de candidato e período não retornou comentários."
          primaryAction={{ label: 'Limpar filtros', onClick: clearFilters }}
        />
      ) : (
        <div className="flex flex-col gap-[18px]">
          {rows.map((row) => (
            <div key={row.entity.id} className="flex flex-col gap-2.5">
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                {row.entity.name}
              </p>
              <SentimentBar sentiment={row.sentiment} size="lg" showLabels />
            </div>
          ))}
          <div className="flex justify-between text-[9px] text-[var(--text-muted)]">
            {AXIS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
