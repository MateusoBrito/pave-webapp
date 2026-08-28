import { AlertTriangle, Hash, Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Megaphone, MessageSquare, Play } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import type { TopicDetail } from '../../api/client'
import type { Entity, Network, SentimentLabel, TopicSentiment } from '../../types'
import {
  candidateColor,
  networkColor,
  networkTint,
  sentimentColor,
} from '../../lib/colors'
import { formatShortDate } from '../../lib/dates'
import { formatPercent } from '../../lib/format'
import { Avatar } from '../ui/Avatar'
import { IconTile } from '../ui/IconTile'
import { Skeleton } from '../ui/Skeleton'
import { StatusCard } from '../ui/StatusCard'

const SENTIMENT_LABEL: Record<string, string> = {
  negative: 'Negativo',
  neutral: 'Neutro',
  positive: 'Positivo',
}

const NETWORK_ICON: Record<Network, LucideIcon> = {
  youtube: Play,
  reddit: MessageSquare,
  meta_ads: Megaphone,
}
const NETWORK_LABEL: Record<Network, string> = {
  youtube: 'YouTube',
  reddit: 'Reddit',
  meta_ads: 'Meta Ads',
}

function predominant(sentiment: TopicSentiment): { label: SentimentLabel; pct: number } {
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

function Indicator({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[9px] font-bold tracking-[0.8px] text-[var(--text-muted)] uppercase">
        {label}
      </p>
      <p
        className="text-[19px] font-bold text-[var(--text-primary)]"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </p>
    </div>
  )
}

interface Props {
  detail: TopicDetail | undefined
  ownerEntity: Entity | undefined
  loading: boolean
  error?: Error
  refetch?: () => void
}

export function TopicHeader({ detail, ownerEntity, loading, error, refetch }: Props) {
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
      <section
        className="rounded-[18px] bg-[var(--chart-surface)] p-[22px]"
        style={{ boxShadow: 'var(--card-shadow)' }}
      >
        <Skeleton className="h-3 w-56" />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-[52px] w-[52px] rounded-2xl" />
            <div>
              <Skeleton className="h-6 w-56" />
              <div className="mt-2 flex gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-16 rounded-full" />
                ))}
              </div>
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

  const { label: sentimentLabel, pct: sentimentPct } = predominant(detail.sentiment)
  const network = detail.dominantNetwork
  const NetworkIcon = NETWORK_ICON[network]
  const entityColor = ownerEntity
    ? candidateColor(ownerEntity.id)
    : 'var(--color-primary)'

  return (
    <section
      className="flex flex-col gap-[18px] rounded-[18px] bg-[var(--chart-surface)] p-[22px]"
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      <div className="flex items-center gap-2 text-[11px]">
        <Link
          to="/topicos"
          className="font-semibold text-[var(--color-primary)] hover:underline"
        >
          O que os usuários comentam?
        </Link>
        <span className="text-[var(--text-muted)]">/</span>
        <span className="font-semibold text-[var(--color-primary)]">
          {NETWORK_LABEL[network]}
        </span>
        <span className="text-[var(--text-muted)]">/</span>
        <span className="text-[var(--text-secondary)]">
          {detail.topic.label}
          {ownerEntity ? ` · ${ownerEntity.name}` : ''}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <IconTile icon={Hash} tone="purple" size={52} />
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                {detail.topic.label}
              </h1>
              {ownerEntity && (
                <span
                  className="flex items-center gap-1.5 rounded-lg py-1.5 pr-2.5 pl-2"
                  style={{ backgroundColor: `${entityColor}1a` }}
                >
                  <Avatar
                    name={ownerEntity.name}
                    color={entityColor}
                    size={18}
                    photoUrl={ownerEntity.photoUrl}
                  />
                  <span className="text-[11px] font-bold" style={{ color: entityColor }}>
                    {ownerEntity.name}
                  </span>
                </span>
              )}
              <span
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                style={{ backgroundColor: networkTint(network) }}
              >
                <NetworkIcon size={11} style={{ color: networkColor(network) }} />
                <span
                  className="text-[11px] font-bold"
                  style={{ color: networkColor(network) }}
                >
                  {NETWORK_LABEL[network]}
                </span>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {detail.topic.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-[7px] bg-[var(--page-plane)] px-2.5 py-1 text-[10px] font-medium text-[var(--text-secondary)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <Indicator label="Menções" value={detail.mentions.toLocaleString('pt-BR')} />
          <Indicator label="Share do período" value={formatPercent(detail.sharePct)} />
          <div className="flex flex-col gap-1">
            <p className="text-[9px] font-bold tracking-[0.8px] text-[var(--text-muted)] uppercase">
              Sentimento
            </p>
            <p
              className="text-[19px] font-bold"
              style={{ color: sentimentColor(sentimentLabel) }}
            >
              {SENTIMENT_LABEL[sentimentLabel]} {formatPercent(sentimentPct)}
            </p>
            <p className="text-[9px] text-[var(--text-muted)]">
              comentários no {NETWORK_LABEL[network]}
            </p>
          </div>
          <Indicator
            label="Pico"
            value={detail.peakDate ? formatShortDate(detail.peakDate) : '—'}
          />
        </div>
      </div>
    </section>
  )
}
