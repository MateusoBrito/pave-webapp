import { useNavigate } from 'react-router-dom'
import type { TopicRankingRow } from '../../api/client'
import { formatSignedPercent } from '../../lib/format'

interface Props {
  rows: TopicRankingRow[]
  loading: boolean
}

export function TopicsRankingList({ rows, loading }: Props) {
  const navigate = useNavigate()
  const max = Math.max(...rows.map((r) => r.mentions), 1)

  return (
    <section className="rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
        Ranking de tópicos do período
      </h2>
      <p className="mb-4 text-xs text-[var(--text-muted)]">
        Ordenado por volume · comparação com o período anterior
      </p>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[var(--text-muted)]">
          Carregando…
        </div>
      ) : (
        <ol className="flex flex-col gap-2.5">
          {rows.map((row, index) => (
            <li key={row.topic.id}>
              <button
                type="button"
                onClick={() => navigate(`/topicos/${row.topic.id}`)}
                className="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left hover:bg-black/5 dark:hover:bg-white/10"
              >
                <span className="w-4 shrink-0 text-xs text-[var(--text-muted)]">
                  {index + 1}
                </span>
                <span className="w-36 shrink-0 truncate text-sm text-[var(--text-primary)]">
                  {row.topic.label}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--gridline)]">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${(row.mentions / max) * 100}%`,
                      backgroundColor: 'var(--color-primary)',
                    }}
                  />
                </span>
                <span className="w-16 shrink-0 text-right text-sm text-[var(--text-primary)]">
                  {row.mentions.toLocaleString('pt-BR')}
                </span>
                <span className="w-12 shrink-0 text-right text-xs text-[var(--text-secondary)]">
                  {formatSignedPercent(row.variationPct)}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
