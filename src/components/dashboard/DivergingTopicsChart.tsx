import type { DivergingTopicRow } from '../../api/client'
import { seriesColor } from '../../lib/colors'

interface Props {
  rows: DivergingTopicRow[]
  loading: boolean
  labelA: string
  labelB: string
}

export function DivergingTopicsChart({ rows, loading, labelA, labelB }: Props) {
  const max = Math.max(...rows.flatMap((r) => [r.aMentions, r.bMentions]), 1)

  return (
    <section className="rounded-xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
        Tópicos: onde cada candidato concentra a conversa
      </h2>
      <p className="mb-4 text-xs text-[var(--text-muted)]">
        Barras divergentes · mesmo tópico, volume relativo de cada lado
      </p>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[var(--text-muted)]">
          Carregando…
        </div>
      ) : (
        <>
          <div className="mb-2 flex justify-between text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
            <span>◀ {labelA}</span>
            <span>{labelB} ▶</span>
          </div>
          <div className="flex flex-col gap-3">
            {rows.map((row) => (
              <div key={row.topic.id} className="flex items-center gap-3">
                <div className="flex flex-1 justify-end">
                  <span
                    className="h-4 rounded-l"
                    style={{
                      width: `${(row.aMentions / max) * 100}%`,
                      backgroundColor: seriesColor(0),
                    }}
                  />
                </div>
                <span className="w-40 shrink-0 text-center text-sm text-[var(--text-primary)]">
                  {row.topic.label}
                </span>
                <div className="flex flex-1 justify-start">
                  <span
                    className="h-4 rounded-r"
                    style={{
                      width: `${(row.bMentions / max) * 100}%`,
                      backgroundColor: seriesColor(1),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
