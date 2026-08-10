import type { ComparisonCandidateSummary } from '../../api/client'
import { seriesColor } from '../../lib/colors'
import { SentimentBar } from './SentimentBar'

interface Props {
  summary: ComparisonCandidateSummary | undefined
  loading: boolean
  colorIndex: number
}

export function ComparisonCandidateCard({ summary, loading, colorIndex }: Props) {
  if (loading || !summary) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5 text-sm text-[var(--text-muted)]">
        Carregando…
      </div>
    )
  }

  const maxTopic = Math.max(...summary.topTopics.map((t) => t.mentions), 1)

  return (
    <div className="rounded-xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <div className="mb-4 flex items-center gap-3">
        <span
          className="h-10 w-10 shrink-0 rounded-full"
          style={{ backgroundColor: seriesColor(colorIndex) }}
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

      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
        Sentimento agregado
      </p>
      <SentimentBar sentiment={summary.sentiment} className="mb-4" />

      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
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
                  backgroundColor: seriesColor(colorIndex),
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
