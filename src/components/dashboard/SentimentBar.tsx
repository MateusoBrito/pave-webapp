import type { TopicSentiment } from '../../types'
import { seriesColor } from '../../lib/colors'

interface Props {
  sentiment: TopicSentiment
  className?: string
}

/** Negativo = tom mais escuro, positivo = mais claro — mesma convenção do donut/barras empilhadas. */
export function SentimentBar({ sentiment, className = '' }: Props) {
  const total = sentiment.negative + sentiment.neutral + sentiment.positive || 1
  const negPct = (sentiment.negative / total) * 100
  const neuPct = (sentiment.neutral / total) * 100
  const posPct = (sentiment.positive / total) * 100

  return (
    <div
      className={`flex h-2 w-full overflow-hidden rounded-full bg-[var(--gridline)] ${className}`}
      role="img"
      aria-label={`Sentimento: ${negPct.toFixed(0)}% negativo, ${neuPct.toFixed(0)}% neutro, ${posPct.toFixed(0)}% positivo`}
    >
      <div style={{ width: `${negPct}%`, backgroundColor: seriesColor(0) }} />
      <div style={{ width: `${neuPct}%`, backgroundColor: seriesColor(2) }} />
      <div style={{ width: `${posPct}%`, backgroundColor: seriesColor(4) }} />
    </div>
  )
}
