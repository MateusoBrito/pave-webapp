import { AlertTriangle, Search } from 'lucide-react'
import { NETWORKS } from '../../types'
import type { TopicNetworkMatrixRow } from '../../api/client'
import { useFilters } from '../../context/FiltersContext'
import { TableCardSkeleton } from '../ui/skeletons'
import { StatusCard } from '../ui/StatusCard'

interface Props {
  rows: TopicNetworkMatrixRow[]
  loading: boolean
  error?: Error
  refetch?: () => void
}

export function TopicsByNetworkGrid({ rows, loading, error, refetch }: Props) {
  const { clearFilters } = useFilters()
  const isEmpty = !loading && !error && rows.length === 0

  return (
    <section className="rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
        Tópicos por rede social
      </h2>
      <p className="mb-4 text-xs text-[var(--text-muted)]">
        Intensidade = volume relativo · alinhamento entre modelos por rede
      </p>

      {error ? (
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
      ) : loading ? (
        <TableCardSkeleton rows={5} />
      ) : isEmpty ? (
        <StatusCard
          icon={Search}
          tone="purple"
          title="Nenhum resultado para este filtro"
          description="A combinação de candidato e assunto não retornou tópicos."
          primaryAction={{ label: 'Limpar filtros', onClick: clearFilters }}
        />
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
                          backgroundColor: 'var(--color-primary)',
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
