import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowBigUp,
  ChevronDown,
  Inbox,
  Info,
  User,
  X,
} from 'lucide-react'
import type { PublicationCommentsResult } from '../../api/client'
import { getPublicationComments } from '../../api/client'
import type { Network, PublicationComment, SentimentLabel } from '../../types'
import { sentimentColor } from '../../lib/colors'
import { shortName } from '../../lib/format'
import { FOCUS_RING } from '../ui/focusRing'
import { TableCardSkeleton } from '../ui/skeletons'
import { StatusCard } from '../ui/StatusCard'
import { SentimentBar } from './SentimentBar'

const PAGE_SIZE = 20

const SENTIMENT_LABEL: Record<SentimentLabel, string> = {
  negative: 'Negativo',
  neutral: 'Neutro',
  positive: 'Positivo',
}

function voteLabel(network: Network): string {
  return network === 'youtube' ? 'curtidas' : 'votos'
}

function formatPct(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0
}

interface FilterChipProps {
  active: boolean
  label: string
  count: number
  dotColor?: string
  onClick: () => void
}

function FilterChip({ active, label, count, dotColor, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-[7px] text-[11px] font-semibold transition-colors ${FOCUS_RING} ${
        active
          ? 'bg-[var(--color-primary)] text-white'
          : 'bg-[var(--gridline)] text-[var(--text-secondary)] hover:brightness-95'
      }`}
    >
      {dotColor && (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
      )}
      {label}
      <span
        className={
          active ? 'font-medium text-white/80' : 'font-medium text-[var(--text-muted)]'
        }
      >
        {count.toLocaleString('pt-BR')}
      </span>
    </button>
  )
}

function CommentCard({
  comment,
  network,
}: {
  comment: PublicationComment
  network: Network
}) {
  const color = sentimentColor(comment.sentiment)
  return (
    <div
      className="flex flex-col gap-2 rounded-xl border-l-[3px] px-[15px] py-[14px]"
      style={{
        borderLeftColor: color,
        backgroundColor: `color-mix(in srgb, ${color} 8%, var(--chart-surface))`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[var(--gridline)] bg-white">
            <User size={11} className="text-[var(--text-muted)]" />
          </span>
          <span className="text-[10px] font-medium text-[var(--text-muted)]">
            Autor anônimo · há {comment.hoursAgo} h
          </span>
        </span>
        <span
          className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[9px] font-bold"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 20%, white)`, color }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
          {SENTIMENT_LABEL[comment.sentiment]}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-[var(--text-primary)]">
        &ldquo;{comment.text}&rdquo;
      </p>
      <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
        <ArrowBigUp size={13} strokeWidth={2} />
        {comment.votes.toLocaleString('pt-BR')} {voteLabel(network)}
      </span>
    </div>
  )
}

interface Props {
  /** null = painel fechado */
  documentId: string | null
  onClose: () => void
}

/** Painel lateral "Ver comentários" — a thread inteira de uma publicação específica
 * (um post/comentário já listado num carrossel de exemplos), com filtro por
 * sentimento, ordenação e paginação "carregar mais". Autocontido: quem quiser esse
 * botão só precisa guardar o id do documento clicado e passar pra cá. */
export function CommentsPanel({ documentId, onClose }: Props) {
  const [sentiment, setSentiment] = useState<SentimentLabel | undefined>(undefined)
  const [sort, setSort] = useState<'top' | 'recent'>('top')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [data, setData] = useState<PublicationCommentsResult>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error>()

  useEffect(() => {
    setSentiment(undefined)
    setSort('top')
    setLimit(PAGE_SIZE)
    setData(undefined)
  }, [documentId])

  useEffect(() => {
    if (!documentId) return
    let cancelled = false
    setLoading(true)
    setError(undefined)
    getPublicationComments({ documentId, sentiment, sort, limit })
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [documentId, sentiment, sort, limit])

  useEffect(() => {
    if (!documentId) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [documentId, onClose])

  if (!documentId) return null

  const total = data
    ? data.totalBySentiment.negative +
      data.totalBySentiment.neutral +
      data.totalBySentiment.positive
    : 0
  const remaining = data ? data.totalFiltered - data.comments.length : 0
  const publicationLabel = data?.entity
    ? `${data.topic.label} · ${shortName(data.entity.name)}`
    : data?.topic.label

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/50" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Comentários da publicação"
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-[580px] flex-col bg-white"
        style={{ boxShadow: 'var(--modal-shadow)' }}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 px-6 pt-6 pb-5">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Comentários da publicação
            </h2>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              {data
                ? `${total.toLocaleString('pt-BR')} comentários classificados · ${data.contextLabel}`
                : 'Carregando…'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className={`shrink-0 rounded-[10px] bg-[var(--gridline)] p-2.5 text-[var(--text-secondary)] hover:bg-black/10 ${FOCUS_RING}`}
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pt-1 pb-6">
          {error ? (
            <StatusCard
              icon={AlertTriangle}
              tone="coral"
              title="Não foi possível carregar"
              description="Falha ao consultar a API. Tente de novo."
              primaryAction={{
                label: 'Tentar novamente',
                onClick: () => setLimit(PAGE_SIZE),
              }}
            />
          ) : !data ? (
            <TableCardSkeleton rows={5} />
          ) : (
            <>
              <div className="flex flex-col gap-2.5 rounded-[14px] border border-[var(--gridline)] bg-[var(--page-plane)] p-4">
                <span className="w-fit rounded-md border border-[var(--gridline)] bg-white px-2.5 py-1 text-[10px] font-bold text-[var(--text-secondary)]">
                  {publicationLabel}
                </span>
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {data.document.text}
                </p>
                <SentimentBar sentiment={data.totalBySentiment} />
                <p className="text-[10px] font-semibold text-[var(--text-secondary)]">
                  {formatPct(data.totalBySentiment.negative, total)}% negativo ·{' '}
                  {formatPct(data.totalBySentiment.neutral, total)}% neutro ·{' '}
                  {formatPct(data.totalBySentiment.positive, total)}% positivo
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <FilterChip
                  active={sentiment === undefined}
                  label="Todos"
                  count={total}
                  onClick={() => setSentiment(undefined)}
                />
                <FilterChip
                  active={sentiment === 'negative'}
                  label="Negativo"
                  count={data.totalBySentiment.negative}
                  dotColor={sentimentColor('negative')}
                  onClick={() => setSentiment('negative')}
                />
                <FilterChip
                  active={sentiment === 'neutral'}
                  label="Neutro"
                  count={data.totalBySentiment.neutral}
                  dotColor={sentimentColor('neutral')}
                  onClick={() => setSentiment('neutral')}
                />
                <FilterChip
                  active={sentiment === 'positive'}
                  label="Positivo"
                  count={data.totalBySentiment.positive}
                  dotColor={sentimentColor('positive')}
                  onClick={() => setSentiment('positive')}
                />
                <span className="flex-1" />
                <label className="relative flex items-center gap-1.5 rounded-lg border border-[var(--baseline)] bg-white px-2.5 py-[7px] text-[11px] font-medium text-[var(--text-secondary)]">
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value as 'top' | 'recent')}
                    className="absolute inset-0 cursor-pointer appearance-none opacity-0"
                    aria-label="Ordenar comentários"
                  >
                    <option value="top">Mais votados</option>
                    <option value="recent">Mais recentes</option>
                  </select>
                  {sort === 'top' ? 'Mais votados' : 'Mais recentes'}
                  <ChevronDown size={12} className="text-[var(--text-muted)]" />
                </label>
              </div>

              {data.comments.length === 0 ? (
                <StatusCard
                  icon={Inbox}
                  tone="graphite"
                  title="Nenhum comentário"
                  description="Nenhum comentário encontrado para este filtro."
                />
              ) : (
                <div className={`flex flex-col gap-2.5 ${loading ? 'opacity-60' : ''}`}>
                  {data.comments.map((comment) => (
                    <CommentCard
                      key={comment.id}
                      comment={comment}
                      network={data.document.network}
                    />
                  ))}
                </div>
              )}

              {remaining > 0 && (
                <button
                  type="button"
                  onClick={() => setLimit((l) => l + PAGE_SIZE)}
                  disabled={loading}
                  className={`flex items-center justify-center rounded-[11px] bg-[var(--gridline)] px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:brightness-95 disabled:opacity-60 ${FOCUS_RING}`}
                >
                  Carregar mais {Math.min(PAGE_SIZE, remaining)} comentários
                </button>
              )}

              <div className="flex items-start gap-2.5 rounded-[11px] bg-[var(--gridline)] px-3.5 py-3">
                <Info size={13} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
                <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">
                  Autores aparecem sem identificação. O painel guarda apenas o
                  identificador da plataforma, usado para não contar o mesmo comentário
                  duas vezes.
                </p>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
