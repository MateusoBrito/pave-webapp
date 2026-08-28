import type { TopicSentiment } from '../../types'
import { sentimentColor } from '../../lib/colors'

interface Props {
  sentiment: TopicSentiment
  className?: string
  /** mostra o "N%" dentro de cada segmento — só quando o segmento for largo o bastante */
  showLabels?: boolean
  size?: 'sm' | 'lg'
}

const MIN_LABEL_PCT = 8

export function SentimentBar({
  sentiment,
  className = '',
  showLabels = false,
  size = 'sm',
}: Props) {
  const total = sentiment.negative + sentiment.neutral + sentiment.positive || 1
  const negPct = (sentiment.negative / total) * 100
  const neuPct = (sentiment.neutral / total) * 100
  const posPct = (sentiment.positive / total) * 100
  const height = size === 'lg' ? 'h-[22px]' : 'h-2'
  const radius = size === 'lg' ? 'rounded-[7px]' : 'rounded-full'
  // ordem padrão (negativo→positivo) fica igual à de sempre — só o card grande do
  // Comparativo usa a ordem do Figma (positivo→negativo), pra não mudar o visual de
  // quem já chama este componente sem os novos props (ex.: TopTopicsTable)
  const segments =
    size === 'lg'
      ? [
          { pct: posPct, key: 'positive' as const, textLight: true },
          { pct: neuPct, key: 'neutral' as const, textLight: false },
          { pct: negPct, key: 'negative' as const, textLight: true },
        ]
      : [
          { pct: negPct, key: 'negative' as const, textLight: true },
          { pct: neuPct, key: 'neutral' as const, textLight: false },
          { pct: posPct, key: 'positive' as const, textLight: true },
        ]

  return (
    <div
      className={`flex ${height} w-full overflow-hidden ${radius} bg-[var(--gridline)] ${className}`}
      role="img"
      aria-label={`Sentimento: ${negPct.toFixed(0)}% negativo, ${neuPct.toFixed(0)}% neutro, ${posPct.toFixed(0)}% positivo`}
    >
      {segments.map(({ pct, key, textLight }) =>
        pct > 0 ? (
          <div
            key={key}
            className="flex items-center justify-center"
            style={{ width: `${pct}%`, backgroundColor: sentimentColor(key) }}
          >
            {showLabels && pct >= MIN_LABEL_PCT && (
              <span
                className="text-[9px] font-bold"
                style={{ color: textLight ? '#fff' : 'var(--text-secondary)' }}
              >
                {pct.toFixed(0)}%
              </span>
            )}
          </div>
        ) : null,
      )}
    </div>
  )
}
