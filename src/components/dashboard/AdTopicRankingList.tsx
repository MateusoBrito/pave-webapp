import { AlertTriangle, ListOrdered, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { AdTopicRankingRow } from '../../api/client'
import { useFilters } from '../../context/FiltersContext'
import { formatBRLRange } from '../../lib/format'
import { IconTile } from '../ui/IconTile'
import { TableCardSkeleton } from '../ui/skeletons'
import { StatusCard } from '../ui/StatusCard'

interface Props {
  rows: AdTopicRankingRow[]
  loading: boolean
  error?: Error
  refetch?: () => void
}

/** Ranking de tópicos por investimento declarado em anúncios — mesma lógica de
 * TopicsRankingList (Tópicos), mas ordenado por R$ em vez de menções. */
export function AdTopicRankingList({ rows, loading, error, refetch }: Props) {
  const navigate = useNavigate()
  const { clearFilters } = useFilters()
  const max = Math.max(...rows.map((r) => r.investmentMaxBRL), 1)
  const isEmpty = !loading && !error && rows.length === 0

  return (
    <section className="rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <div className="flex items-center gap-3">
        <IconTile icon={ListOrdered} tone="pink" size={36} />
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Ranking de tópicos do período
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Investimento declarado · estimativa pelo ponto médio das faixas da Ad Library
          </p>
        </div>
      </div>

      <div className="mt-4">
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
            title="Nenhum anúncio neste período"
            description="A combinação de candidato e período não retornou anúncios."
            primaryAction={{ label: 'Limpar filtros', onClick: clearFilters }}
          />
        ) : (
          <ol className="flex flex-col gap-2.5">
            {rows.map((row, index) => (
              <li key={row.topic.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/topicos/${row.topic.id}`)}
                  className="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left hover:bg-black/5"
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
                        width: `${(row.investmentMaxBRL / max) * 100}%`,
                        backgroundColor: 'var(--color-pink)',
                      }}
                    />
                  </span>
                  <span className="w-28 shrink-0 text-right text-sm text-[var(--text-primary)]">
                    {formatBRLRange(row.investmentMinBRL, row.investmentMaxBRL)}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}
