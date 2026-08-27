import { Grid3x3, Info } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { TopicRankingRow } from '../../api/client'
import { NETWORKS } from '../../types'
import type { Entity } from '../../types'
import { candidateColor, sentimentColor } from '../../lib/colors'
import { Avatar } from '../ui/Avatar'
import { IconTile } from '../ui/IconTile'
import { SentimentBar } from './SentimentBar'

interface Props {
  rows: TopicRankingRow[]
  entities: Entity[]
  loading: boolean
}

function networkLabel(id: string): string {
  return NETWORKS.find((n) => n.id === id)?.label ?? id
}

const SENTIMENT_LEGEND: { key: 'positive' | 'neutral' | 'negative'; label: string }[] = [
  { key: 'positive', label: 'Positivo' },
  { key: 'neutral', label: 'Neutro' },
  { key: 'negative', label: 'Negativo' },
]

/** Fluxo de navegação: Visão Geral → "Ver detalhes" → drill-down do tópico. */
export function TopTopicsTable({ rows, entities, loading }: Props) {
  const navigate = useNavigate()

  return (
    <section className="rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <div className="mb-1 flex items-center gap-3">
        <IconTile icon={Grid3x3} tone="amber" size={36} />
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Top 10 tópicos do período
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Todo tópico pertence a um candidato — o modelo gera conjuntos separados para
            cada um
          </p>
        </div>
      </div>

      <div className="mt-4 mb-3 flex items-start gap-2 rounded-lg bg-[var(--tint-graphite)] px-3 py-2 text-xs text-[var(--text-secondary)]">
        <Info size={14} className="mt-0.5 shrink-0" />
        Meta Ads não aparece nesta tabela: anúncio pago é conteúdo do candidato, não
        conversa do público.
      </div>

      <div className="mb-3 flex flex-wrap gap-4 text-xs text-[var(--text-secondary)]">
        {SENTIMENT_LEGEND.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: sentimentColor(s.key) }}
            />
            {s.label}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[var(--text-muted)]">
          Carregando…
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--gridline)] text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                <th className="pb-2 font-medium">Tópico e candidato</th>
                <th className="pb-2 font-medium">Rede</th>
                <th className="pb-2 font-medium">Menções</th>
                <th className="pb-2 font-medium">Sentimento</th>
                <th className="pb-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const entity = entities.find((e) => e.id === row.topic.entityId)
                const total =
                  row.sentiment.negative +
                    row.sentiment.neutral +
                    row.sentiment.positive || 1
                const negativePct = Math.round((row.sentiment.negative / total) * 100)
                const color = candidateColor(row.topic.entityId)

                return (
                  <tr
                    key={row.topic.id}
                    className="border-b border-[var(--gridline)] last:border-0"
                  >
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={entity?.name ?? '?'} color={color} size={32} />
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            {row.topic.label}
                          </p>
                          <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            {entity?.name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-[var(--text-secondary)]">
                      {networkLabel(row.dominantNetwork)}
                    </td>
                    <td className="py-3 text-[var(--text-primary)]">
                      {row.mentions.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <SentimentBar
                          sentiment={row.sentiment}
                          className="max-w-[110px]"
                        />
                        <span className="text-xs text-[var(--text-secondary)]">
                          {negativePct}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/topicos/${row.topic.id}`)}
                        className="rounded-full bg-[var(--tint-primary)] px-3 py-1 text-xs font-medium text-[var(--color-primary-dark)] hover:brightness-95"
                      >
                        Ver detalhes ›
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
