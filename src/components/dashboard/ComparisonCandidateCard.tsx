import { AlertTriangle, Inbox } from 'lucide-react'
import type { ComparisonCandidateSummary } from '../../api/client'
import { useFilters } from '../../context/FiltersContext'
import { candidateColor } from '../../lib/colors'
import { Avatar } from '../ui/Avatar'
import { KpiCardSkeleton } from '../ui/skeletons'
import { StatusCard } from '../ui/StatusCard'
import { SentimentBar } from './SentimentBar'

interface Props {
  summary: ComparisonCandidateSummary | undefined
  loading: boolean
  error?: Error
  refetch?: () => void
}

export function ComparisonCandidateCard({ summary, loading, error, refetch }: Props) {
  const { setDays, clearFilters } = useFilters()

  if (error) {
    return (
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
    )
  }

  if (loading) {
    return <KpiCardSkeleton />
  }

  if (!summary || summary.mentions === 0) {
    return (
      <StatusCard
        icon={Inbox}
        tone="graphite"
        title="Nenhuma menção neste período"
        description="Ninguém falou sobre este candidato no intervalo selecionado."
        primaryAction={{ label: 'Ampliar para 90 dias', onClick: () => setDays(90) }}
        secondaryAction={{ label: 'Limpar filtros', onClick: clearFilters }}
      />
    )
  }

  const color = candidateColor(summary.entity.id)
  const maxTopic = Math.max(...summary.topTopics.map((t) => t.mentions), 1)

  return (
    <div className="rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <div className="mb-4 flex items-center gap-3">
        <Avatar
          name={summary.entity.name}
          color={color}
          size={40}
          photoUrl={summary.entity.photoUrl}
        />
        <div>
          <p className="font-semibold text-[var(--text-primary)]">
            {summary.entity.name}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {summary.mentions.toLocaleString('pt-BR')} menções no período
          </p>
        </div>
      </div>

      <p className="mb-1 text-[10px] font-medium tracking-wide text-[var(--text-muted)] uppercase">
        Sentimento agregado
      </p>
      <SentimentBar sentiment={summary.sentiment} className="mb-4" />

      <p className="mb-2 text-[10px] font-medium tracking-wide text-[var(--text-muted)] uppercase">
        Top 3 tópicos
      </p>
      <ul className="flex flex-col gap-2">
        {summary.topTopics.map((t) => (
          <li key={t.topic.id} className="flex items-center gap-2 text-sm">
            <span className="w-32 shrink-0 truncate text-[var(--text-secondary)]">
              {t.topic.label}
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--gridline)]">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${(t.mentions / maxTopic) * 100}%`,
                  backgroundColor: color,
                }}
              />
            </span>
            <span className="w-14 shrink-0 text-right text-[var(--text-primary)]">
              {t.mentions.toLocaleString('pt-BR')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
