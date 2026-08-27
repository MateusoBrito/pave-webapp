import type { TopicSentiment } from '../../types'
import { sentimentColor } from '../../lib/colors'

interface Props {
  sentiment: TopicSentiment
  className?: string
}

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
      <div style={{ width: `${negPct}%`, backgroundColor: sentimentColor('negative') }} />
      <div style={{ width: `${neuPct}%`, backgroundColor: sentimentColor('neutral') }} />
      <div style={{ width: `${posPct}%`, backgroundColor: sentimentColor('positive') }} />
    </div>
  )
}
