import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  ImageOff,
  Inbox,
  Megaphone,
  SquareArrowOutUpRight,
  Wallet,
} from 'lucide-react'
import type { Entity, Topic, TopicDocument } from '../../types'
import { useFilters } from '../../context/FiltersContext'
import { candidateColor } from '../../lib/colors'
import { formatBRLRange } from '../../lib/format'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { FOCUS_RING } from '../ui/focusRing'
import { IconTile } from '../ui/IconTile'
import { TableCardSkeleton } from '../ui/skeletons'
import { StatusCard } from '../ui/StatusCard'

const PAGE_SIZE = 3

const PLATFORM_LABEL: Record<'facebook' | 'instagram', string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

function formatImpressions(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')} mi`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} mil`
  return n.toLocaleString('pt-BR')
}

interface Props {
  documents: TopicDocument[]
  entities: Entity[]
  topics: Topic[]
  loading: boolean
  error?: Error
  refetch?: () => void
}

/** Carrossel de "Exemplos de anúncios" — pré-visualização no formato em que o anúncio
 * foi veiculado. A Ad Library não devolve a imagem do criativo, só metadados; o card
 * mostra isso explicitamente em vez de fingir uma imagem que não existe. */
export function AdExamplesCarousel({
  documents,
  entities,
  topics,
  loading,
  error,
  refetch,
}: Props) {
  const { clearFilters } = useFilters()
  const [page, setPage] = useState(0)
  const isEmpty = !loading && !error && documents.length === 0
  const pageCount = Math.max(1, Math.ceil(documents.length / PAGE_SIZE))

  useEffect(() => {
    setPage(0)
  }, [documents])

  const start = page * PAGE_SIZE
  const visible = documents.slice(start, start + PAGE_SIZE)

  return (
    <section
      className="flex flex-col gap-[15px] rounded-2xl bg-[var(--chart-surface)] p-[22px]"
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      <div className="flex flex-wrap items-center gap-[13px]">
        <IconTile icon={Megaphone} tone="blue" size={34} />
        <div className="flex-1">
          <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
            Exemplos de anúncios
          </h2>
          <p className="text-[11px] text-[var(--text-muted)]">
            Pré-visualização no formato em que o anúncio foi veiculado · use as setas para
            ver mais
          </p>
        </div>
        {!loading && !error && !isEmpty && (
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-medium text-[var(--text-muted)]">
              {start + 1}–{Math.min(start + PAGE_SIZE, documents.length)} de{' '}
              {documents.length}
            </p>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Página anterior"
              className={`flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[var(--gridline)] text-[var(--text-secondary)] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
            >
              <ChevronLeft size={15} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page >= pageCount - 1}
              aria-label="Próxima página"
              className={`flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[var(--color-primary)] text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
            >
              <ChevronRight size={15} strokeWidth={2.5} />
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
      ) : loading ? (
        <TableCardSkeleton rows={3} />
      ) : isEmpty ? (
        <StatusCard
          icon={Inbox}
          tone="graphite"
          title="Nenhum anúncio encontrado"
          description="Nenhum exemplo disponível para esta combinação de filtros."
          primaryAction={{ label: 'Limpar filtros', onClick: clearFilters }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {visible.map((doc) => {
            const entity = entities.find((e) => e.id === doc.entityId)
            const topic = topics.find((t) => t.id === doc.topicId)
            const ad = doc.ad
            if (!entity || !ad) return null
            const color = candidateColor(entity.id)

            return (
              <div
                key={doc.id}
                className="flex flex-col overflow-hidden rounded-[14px] border border-[var(--gridline)]"
              >
                <div className="flex flex-col gap-2 px-3.5 pt-3.5 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      name={entity.name}
                      color={color}
                      size={36}
                      photoUrl={entity.photoUrl}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-[var(--text-primary)]">
                        {entity.name}
                      </p>
                      <p className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                        Patrocinado
                        <BadgeCheck size={11} className="text-[var(--color-blue)]" />
                      </p>
                    </div>
                  </div>
                  {topic && (
                    <span className="w-fit max-w-full truncate rounded-md bg-[var(--tint-primary)] px-2 py-1 text-[9px] font-bold text-[var(--color-primary-dark)]">
                      {topic.label} · {shortName(entity.name)}
                    </span>
                  )}
                </div>

                <p className="px-3.5 pb-3 text-xs leading-relaxed text-[var(--text-primary)]">
                  {doc.text}
                </p>

                <div className="flex h-[146px] flex-col items-center justify-center gap-2 bg-[var(--page-plane)] p-5 text-center">
                  <ImageOff size={26} className="text-[var(--text-muted)]" />
                  <p className="text-[10px] font-semibold text-[var(--text-secondary)]">
                    A Ad Library não devolve a imagem
                  </p>
                  <Button
                    variant="outline"
                    disabled
                    title="Link direto para a Ad Library ainda não integrado"
                    className="px-2.5 py-1.5 text-[10px]"
                  >
                    Abrir no Ad Library
                    <SquareArrowOutUpRight size={11} />
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-2 bg-[var(--gridline)]/60 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[8px] font-bold tracking-wide text-[var(--text-muted)] uppercase">
                      {ad.domain}
                    </p>
                    <p className="truncate text-xs font-bold text-[var(--text-primary)]">
                      {ad.headline}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-[7px] bg-[var(--chart-surface)] px-3 py-2 text-[11px] font-semibold text-[var(--text-secondary)]">
                    {ad.cta}
                  </span>
                </div>

                <div className="flex flex-col gap-2 px-3.5 pt-3 pb-3.5">
                  <p className="flex items-center gap-2 text-[11px] font-semibold text-[var(--text-secondary)]">
                    <Wallet size={12} className="shrink-0 text-[var(--text-muted)]" />
                    {formatBRLRange(ad.investmentMinBRL, ad.investmentMaxBRL)}
                    <span className="font-normal text-[var(--text-muted)]">
                      · investimento declarado
                    </span>
                  </p>
                  <p className="flex items-center gap-2 text-[11px] font-semibold text-[var(--text-secondary)]">
                    <Eye size={12} className="shrink-0 text-[var(--text-muted)]" />
                    {formatImpressions(ad.impressionsMin)} –{' '}
                    {formatImpressions(ad.impressionsMax)}
                    <span className="font-normal text-[var(--text-muted)]">
                      · impressões
                    </span>
                  </p>
                  <p className="flex items-center gap-2 text-[11px] font-semibold text-[var(--text-secondary)]">
                    <Clock size={12} className="shrink-0 text-[var(--text-muted)]" />
                    {ad.daysActive} dias no ar
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ad.platforms.map((p) => (
                      <span
                        key={p}
                        className="rounded-md bg-[var(--tint-blue)] px-2 py-1 text-[9px] font-bold text-[var(--tint-text-blue)]"
                      >
                        {PLATFORM_LABEL[p]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
