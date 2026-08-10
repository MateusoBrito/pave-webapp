import { NETWORKS } from '../../types'
import type { TopicNetworkMatrixRow } from '../../api/client'

interface Props {
  rows: TopicNetworkMatrixRow[]
  loading: boolean
}

export function TopicsByNetworkGrid({ rows, loading }: Props) {
  return (
    <section className="rounded-xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
        Tópicos por rede social
      </h2>
      <p className="mb-4 text-xs text-[var(--text-muted)]">
        Intensidade = volume relativo · alinhamento entre modelos por rede
      </p>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[var(--text-muted)]">
          Carregando…
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr>
                <th className="pb-2" />
                {NETWORKS.map((n) => (
                  <th
                    key={n.id}
                    className="pb-2 text-center text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]"
                  >
                    {n.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.topic.id}>
                  <td className="py-1 pr-3 text-[var(--text-primary)]">
                    {row.topic.label}
                  </td>
                  {NETWORKS.map((n) => (
                    <td key={n.id} className="px-1 py-1">
                      <div
                        className="mx-auto h-8 w-full rounded-md"
                        style={{
                          backgroundColor: 'var(--series-1)',
                          opacity: 0.12 + row.byNetwork[n.id] * 0.78,
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
