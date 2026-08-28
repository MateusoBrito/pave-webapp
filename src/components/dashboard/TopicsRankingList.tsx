import { AlertTriangle, ListOrdered, MousePointerClick, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { TopicRankingRow } from '../../api/client'
import { useFilters } from '../../context/FiltersContext'
import { formatSignedPercent } from '../../lib/format'
import type { Entity } from '../../types'
import { shortName } from '../../lib/format'
import { IconTile } from '../ui/IconTile'
import { TableCardSkeleton } from '../ui/skeletons'
import { StatusCard } from '../ui/StatusCard'

interface Props {
  rows: TopicRankingRow[]
  entities: Entity[]
  loading: boolean
  error?: Error
  refetch?: () => void
}

export function TopicsRankingList({ rows, entities, loading, error, refetch }: Props) {
  const navigate = useNavigate()
  const { clearFilters } = useFilters()
  const max = Math.max(...rows.map((r) => r.mentions), 1)
  const isEmpty = !loading && !error && rows.length === 0

  return (
    <section
      className="flex flex-col gap-[15px] rounded-2xl bg-[var(--chart-surface)] p-[22px]"
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      <div className="flex items-center gap-[13px]">
        <IconTile icon={ListOrdered} tone="pink" size={34} />
        <div>
          <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
            Ranking de tópicos do período
          </h2>
          <p className="text-[11px] text-[var(--text-muted)]">
            Ordenado por volume de menções
          </p>
          {!isEmpty && !loading && !error && (
            <p className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-[var(--color-primary)]">
              <MousePointerClick size={12} />
              Clique em um tópico para abrir o detalhamento
            </p>
          )}
        </div>
      </div>

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
          description="A combinação de candidato e período não retornou tópicos."
          primaryAction={{ label: 'Limpar filtros', onClick: clearFilters }}
        />
      ) : (
        <ol className="flex flex-col gap-2.5">
          {rows.map((row, index) => {
            const entity = entities.find((e) => e.id === row.topic.entityId)
            const label = entity
              ? `${row.topic.label} · ${shortName(entity.name)}`
              : row.topic.label
            return (
              <li key={row.topic.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/topicos/${row.topic.id}`)}
                  className="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left hover:bg-black/5"
                >
                  <span className="w-4 shrink-0 text-xs text-[var(--text-muted)]">
                    {index + 1}
                  </span>
                  <span className="w-40 shrink-0 truncate text-sm text-[var(--text-primary)]">
                    {label}
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
            )
          })}
        </ol>
      )}
    </section>
  )
}
