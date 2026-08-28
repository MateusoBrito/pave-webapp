import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Megaphone,
  MessageSquare,
  MessageSquareQuote,
  Play,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TopicDocument } from '../../types'
import { useFilters } from '../../context/FiltersContext'
import { networkColor, sentimentColor } from '../../lib/colors'
import { FOCUS_RING } from '../ui/focusRing'
import { IconTile, type IconTone } from '../ui/IconTile'
import { TableCardSkeleton } from '../ui/skeletons'
import { StatusCard } from '../ui/StatusCard'

const NETWORK_ICON: Record<string, LucideIcon> = {
  youtube: Play,
  reddit: MessageSquare,
  meta_ads: Megaphone,
}
const NETWORK_LABEL: Record<string, string> = {
  youtube: 'YouTube',
  reddit: 'Reddit',
  meta_ads: 'Meta Ads',
}
const SENTIMENT_LABEL: Record<string, string> = {
  negative: 'Negativo',
  neutral: 'Neutro',
  positive: 'Positivo',
}

const PAGE_SIZE = 3

interface Props {
  documents: TopicDocument[]
  loading: boolean
  error?: Error
  refetch?: () => void
  title?: string
  subtitle?: string
  icon?: LucideIcon
  tone?: IconTone
}

/** "Exemplos do que foi dito" do drill-down de tópico — carrossel paginado de 3 em 3,
 * com borda colorida por sentimento (distinto do ExamplePostsList em lista, usado em
 * PostsPage). Título/subtítulo/ícone são configuráveis: "O que os usuários comentam?"
 * reaproveita este mesmo componente por rede (Reddit/YouTube), só trocando o texto. */
export function TopicExamplePosts({
  documents,
  loading,
  error,
  refetch,
  title = 'Exemplos do que foi dito',
  subtitle = 'Publicações e comentários do público · autores anonimizados conforme a política de retenção (LGPD)',
  icon = MessageSquareQuote,
  tone = 'amber',
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
        <IconTile icon={icon} tone={tone} size={34} />
        <div className="flex-1">
          <h2 className="text-[15px] font-bold text-[var(--text-primary)]">{title}</h2>
          <p className="text-[11px] text-[var(--text-muted)]">{subtitle}</p>
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
          title="Nenhum exemplo encontrado"
          description="Nenhuma publicação disponível para esta combinação de filtros."
          primaryAction={{ label: 'Limpar filtros', onClick: clearFilters }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {visible.map((doc) => {
            const NetworkIcon = NETWORK_ICON[doc.network]
            return (
              <div
                key={doc.id}
                className="flex flex-col gap-3 rounded-[14px] border-l-4 p-[18px]"
                style={{
                  borderLeftColor: sentimentColor(doc.sentiment),
                  backgroundColor: `color-mix(in srgb, ${sentimentColor(doc.sentiment)} 8%, var(--chart-surface))`,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 rounded-[7px] border border-[var(--gridline)] bg-[var(--chart-surface)] py-1 pr-2.5 pl-1">
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px]"
                      style={{ backgroundColor: `${networkColor(doc.network)}1a` }}
                    >
                      <NetworkIcon
                        size={11}
                        style={{ color: networkColor(doc.network) }}
                      />
                    </span>
                    <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
                      {NETWORK_LABEL[doc.network]}
                    </span>
                  </span>
                  <span
                    className="flex shrink-0 items-center gap-1.5 rounded-[7px] px-2.5 py-1 text-[10px] font-bold"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${sentimentColor(doc.sentiment)} 20%, white)`,
                      color: sentimentColor(doc.sentiment),
                    }}
                  >
                    <span
                      className="h-[7px] w-[7px] rounded-full"
                      style={{ backgroundColor: sentimentColor(doc.sentiment) }}
                    />
                    {SENTIMENT_LABEL[doc.sentiment]}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-[var(--text-primary)]">
                  &ldquo;{doc.text}&rdquo;
                </p>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
