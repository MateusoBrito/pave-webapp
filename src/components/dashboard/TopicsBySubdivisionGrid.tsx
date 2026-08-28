import { AlertTriangle, ChevronLeft, ChevronRight, Grid3x3, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { SubdivisionMatrix } from '../../api/client'
import { useFilters } from '../../context/FiltersContext'
import { shortName } from '../../lib/format'
import type { Entity } from '../../types'
import { FOCUS_RING } from '../ui/focusRing'
import { IconTile } from '../ui/IconTile'
import { TableCardSkeleton } from '../ui/skeletons'
import { StatusCard } from '../ui/StatusCard'

const VISIBLE_COLUMNS = 3
// mesma escala de 5 degraus do heatmap de tópicos por rede, só que interpolada a
// partir dos tokens em vez de hex cru — ver "Tópicos por rede social"
const INTENSITY_STEPS = [0, 0.25, 0.5, 0.75, 1]

interface Props {
  matrix: SubdivisionMatrix | undefined
  title: string
  subtitle: string
  loading: boolean
  error?: Error
  refetch?: () => void
  entities: Entity[]
}

/** "Tópicos por subreddit" / "Tópicos por canal" — mesma visualização de heatmap para
 * as duas redes; no YouTube as colunas (canais oficiais dos candidatos) cabem todas de
 * uma vez, no Reddit (8 subreddits fixos) elas são paginadas de 3 em 3. */
export function TopicsBySubdivisionGrid({
  matrix,
  title,
  subtitle,
  loading,
  error,
  refetch,
  entities,
}: Props) {
  const { clearFilters } = useFilters()
  const [page, setPage] = useState(0)
  const columns = matrix?.columns ?? []
  const paginated = columns.length > VISIBLE_COLUMNS
  const pageCount = paginated ? Math.ceil(columns.length / VISIBLE_COLUMNS) : 1
  const visibleColumns = paginated
    ? columns.slice(page * VISIBLE_COLUMNS, page * VISIBLE_COLUMNS + VISIBLE_COLUMNS)
    : columns

  useEffect(() => {
    setPage(0)
  }, [columns.length])

  const isEmpty = !loading && !error && (!matrix || matrix.rows.length === 0)

  return (
    <section
      className="flex flex-col gap-[15px] rounded-2xl bg-[var(--chart-surface)] p-[22px]"
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      <div className="flex flex-wrap items-center gap-[13px]">
        <IconTile icon={Grid3x3} tone="blue" size={34} />
        <div className="flex-1">
          <h2 className="text-[15px] font-bold text-[var(--text-primary)]">{title}</h2>
          <p className="text-[11px] text-[var(--text-muted)]">{subtitle}</p>
        </div>
        {paginated && !loading && !error && !isEmpty && (
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-medium text-[var(--text-muted)]">
              {Math.min((page + 1) * VISIBLE_COLUMNS, columns.length)} de {columns.length}{' '}
              subreddits
            </p>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Colunas anteriores"
              className={`flex h-7 w-7 items-center justify-center rounded-[9px] bg-[var(--gridline)] text-[var(--text-secondary)] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
            >
              <ChevronLeft size={13} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page >= pageCount - 1}
              aria-label="Próximas colunas"
              className={`flex h-7 w-7 items-center justify-center rounded-[9px] bg-[var(--tint-primary)] text-[var(--color-primary)] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
            >
              <ChevronRight size={13} strokeWidth={2.5} />
            </button>
          </div>
        )}
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
      ) : loading || !matrix ? (
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
        <>
          <div className="overflow-x-auto">
            <div
              className="flex flex-col gap-[7px]"
              style={{ minWidth: 176 + visibleColumns.length * 100 }}
            >
              <div className="flex items-center gap-2.5 text-[9px] text-[var(--text-muted)]">
                <span className="w-[176px] shrink-0" />
                {visibleColumns.map((c) => (
                  <span key={c.key} className="min-w-0 flex-1 text-center font-bold">
                    {c.label}
                  </span>
                ))}
              </div>
              {matrix.rows.map((row) => {
                const entity = entities.find((e) => e.id === row.topic.entityId)
                const label = entity
                  ? `${row.topic.label} · ${shortName(entity.name)}`
                  : row.topic.label
                return (
                  <div key={row.topic.id} className="flex items-center gap-2.5">
                    <p className="w-[176px] shrink-0 truncate text-[10px] font-medium text-[var(--text-secondary)]">
                      {label}
                    </p>
                    {visibleColumns.map((c) => {
                      const value = row.values[c.key] ?? 0
                      const ratio = value / matrix.maxValue
                      const step = INTENSITY_STEPS.reduce((closest, s) =>
                        Math.abs(s - ratio) < Math.abs(closest - ratio) ? s : closest,
                      )
                      return (
                        <div
                          key={c.key}
                          className="flex h-[30px] min-w-0 flex-1 items-center justify-center rounded-lg text-[10px] font-bold"
                          style={{
                            backgroundColor: `color-mix(in srgb, var(--color-primary) ${step * 100}%, var(--tint-primary))`,
                            color: step >= 0.5 ? '#fff' : 'var(--text-secondary)',
                          }}
                        >
                          {value.toLocaleString('pt-BR')}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 rounded-[11px] bg-[var(--page-plane)] px-3.5 py-3">
            <p className="text-[10px] font-medium text-[var(--text-muted)]">
              Menos {matrix.unitLabel}
            </p>
            <div className="flex gap-[3px]">
              {INTENSITY_STEPS.map((step) => (
                <div
                  key={step}
                  className="h-3 w-9 rounded-[3px]"
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--color-primary) ${step * 100}%, var(--tint-primary))`,
                  }}
                />
              ))}
            </div>
            <p className="text-[10px] font-medium text-[var(--text-muted)]">
              Mais {matrix.unitLabel}
            </p>
            <span className="hidden flex-1 sm:block" />
            <p className="text-[10px] text-[var(--text-muted)]">
              0 – {matrix.maxValue.toLocaleString('pt-BR')} {matrix.unitLabel}
            </p>
          </div>
        </>
      )}
    </section>
  )
}
