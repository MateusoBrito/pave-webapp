import { Link } from 'react-router-dom'
import type { TopicDetail } from '../../api/client'
import type { TopicSentiment } from '../../types'
import { formatShortDate } from '../../lib/dates'
import { formatPercent } from '../../lib/format'

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
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  )
}

interface Props {
  detail: TopicDetail | undefined
  loading: boolean
}

export function TopicHeader({ detail, loading }: Props) {
  return (
    <section className="rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <Link to="/topicos" className="text-xs text-[var(--text-muted)] hover:underline">
        ← Tópicos{detail ? ` / ${detail.topic.label}` : ''}
      </Link>

      {loading || !detail ? (
        <div className="mt-2 flex h-16 items-center text-sm text-[var(--text-muted)]">
          Carregando…
        </div>
      ) : (
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
      )}
    </section>
  )
}
