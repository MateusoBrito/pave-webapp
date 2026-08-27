import { AlertTriangle, Search } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import type { TopicDetail } from '../../api/client'
import type { TopicSentiment } from '../../types'
import { formatShortDate } from '../../lib/dates'
import { formatPercent } from '../../lib/format'
import { Skeleton } from '../ui/Skeleton'
import { StatusCard } from '../ui/StatusCard'

const SENTIMENT_LABEL: Record<string, string> = {
  negative: 'Negativo',
  neutral: 'Neutro',
  positive: 'Positivo',
}

function predominant(sentiment: TopicSentiment): { label: string; pct: number } {
  const total = sentiment.negative + sentiment.neutral + sentiment.positive || 1
  if (
    sentiment.negative >= sentiment.neutral &&
    sentiment.negative >= sentiment.positive
  ) {
    return { label: 'negative', pct: (sentiment.negative / total) * 100 }
  }
  if (sentiment.positive >= sentiment.neutral) {
    return { label: 'positive', pct: (sentiment.positive / total) * 100 }
  }
  return { label: 'neutral', pct: (sentiment.neutral / total) * 100 }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium tracking-wide text-[var(--text-muted)] uppercase">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  )
}

interface Props {
  detail: TopicDetail | undefined
  loading: boolean
  error?: Error
  refetch?: () => void
}

export function TopicHeader({ detail, loading, error, refetch }: Props) {
  const navigate = useNavigate()

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
    return (
      <section className="rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
        <Skeleton className="h-3 w-32" />
        <div className="mt-3 flex flex-wrap items-start justify-between gap-6">
          <div>
            <Skeleton className="h-7 w-56" />
            <div className="mt-3 flex gap-1.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-16 rounded-full" />
              ))}
            </div>
          </div>
          <div className="flex gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-2.5 w-14" />
                <Skeleton className="h-5 w-14" />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (!detail) {
    return (
      <StatusCard
        icon={Search}
        tone="graphite"
        title="Tópico não encontrado"
        description="Esse tópico pode não existir mais para o candidato selecionado."
        primaryAction={{
          label: 'Voltar para Tópicos',
          onClick: () => navigate('/topicos'),
        }}
      />
    )
  }

  return (
    <section className="rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <Link to="/topicos" className="text-xs text-[var(--text-muted)] hover:underline">
        ← Tópicos / {detail.topic.label}
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            {detail.topic.label}
          </h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {detail.topic.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[var(--baseline)] px-2 py-0.5 text-xs text-[var(--text-secondary)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <Stat label="Menções" value={detail.mentions.toLocaleString('pt-BR')} />
          <Stat label="Share do período" value={formatPercent(detail.sharePct)} />
          <Stat
            label="Sentimento"
            value={`${SENTIMENT_LABEL[predominant(detail.sentiment).label]} ${formatPercent(predominant(detail.sentiment).pct)}`}
          />
          <Stat
            label="Pico"
            value={detail.peakDate ? formatShortDate(detail.peakDate) : '—'}
          />
        </div>
      </div>
    </section>
  )
}
