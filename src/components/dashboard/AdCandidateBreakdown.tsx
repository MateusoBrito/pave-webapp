import { AlertTriangle, Search, Wallet } from 'lucide-react'
import type { AdCandidateBreakdownRow } from '../../api/client'
import { useFilters } from '../../context/FiltersContext'
import { candidateColor } from '../../lib/colors'
import { formatBRLRange } from '../../lib/format'
import { Avatar } from '../ui/Avatar'
import { IconTile } from '../ui/IconTile'
import { TableCardSkeleton } from '../ui/skeletons'
import { StatusCard } from '../ui/StatusCard'

interface Props {
  rows: AdCandidateBreakdownRow[]
  loading: boolean
  error?: Error
  refetch?: () => void
}

/** Investimento e volume de anúncios por candidato — pareia com o ranking de tópicos
 * por investimento, mostrando quem investiu mais no período. */
export function AdCandidateBreakdown({ rows, loading, error, refetch }: Props) {
  const { clearFilters } = useFilters()
  const isEmpty = !loading && !error && rows.every((r) => r.adsCount === 0)
  const max = Math.max(...rows.map((r) => r.investmentMaxBRL), 1)

  return (
    <section className="rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <div className="flex items-center gap-3">
        <IconTile icon={Wallet} tone="green" size={36} />
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Investimento por candidato
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Faixa declarada na Ad Library, somada no período
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
          <TableCardSkeleton rows={2} />
        ) : isEmpty ? (
          <StatusCard
            icon={Search}
            tone="purple"
            title="Nenhum anúncio neste período"
            description="Nenhum candidato veiculou anúncios pagos no recorte selecionado."
            primaryAction={{ label: 'Limpar filtros', onClick: clearFilters }}
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {rows.map((row) => (
              <li key={row.entity.id} className="flex items-center gap-3">
                <Avatar
                  name={row.entity.name}
                  color={candidateColor(row.entity.id)}
                  size={34}
                  photoUrl={row.entity.photoUrl}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {row.entity.name}
                    </p>
                    <p className="shrink-0 text-xs text-[var(--text-muted)]">
                      {row.adsCount} anúncio{row.adsCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--gridline)]">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${(row.investmentMaxBRL / max) * 100}%`,
                          backgroundColor: candidateColor(row.entity.id),
                        }}
                      />
                    </span>
                    <span className="shrink-0 text-xs font-medium text-[var(--text-secondary)]">
                      {formatBRLRange(row.investmentMinBRL, row.investmentMaxBRL)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
