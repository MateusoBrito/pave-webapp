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
  User,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TopicDocument } from '../../types'
import { useFilters } from '../../context/FiltersContext'
import { networkColor, sentimentColor } from '../../lib/colors'
import { formatDateTime } from '../../lib/dates'
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

const PAGE_SIZE = 6

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

/** "Exemplos do que foi dito" — feed de comentários em 2 colunas (o formato lê melhor
 * vertical, e 2 colunas usa o espaço horizontal da seção sem estreitar demais cada
 * item). Título/subtítulo/ícone são configuráveis: "O que os usuários comentam?"
 * reaproveita este mesmo componente por rede (Reddit/YouTube), só trocando o texto.
 * Sem "ver comentários": cada documento já é o comentário completo, não uma
 * publicação com uma thread própria pra abrir (ver CommentsPanel, removido daqui —
 * a "thread" que ele buscava só existe de verdade pro Reddit, que grava parent_id;
 * o YouTube nunca capturou esse vínculo e o painel sempre voltava vazio lá). */
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
        <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
          {visible.map((doc) => {
            const NetworkIcon = NETWORK_ICON[doc.network]
            const color = sentimentColor(doc.sentiment)
            return (
              <div
                key={doc.id}
                className="flex gap-3 border-b border-[var(--gridline)] py-4"
              >
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[var(--tint-graphite)] text-[var(--text-muted)]">
                  <User size={16} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <p className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                    <NetworkIcon size={12} style={{ color: networkColor(doc.network) }} />
                    <span className="font-semibold text-[var(--text-secondary)]">
                      {NETWORK_LABEL[doc.network]}
                    </span>
                    · {formatDateTime(doc.publishedAt)}
                  </p>
                  <p className="text-[13px] leading-relaxed text-[var(--text-primary)]">
                    {doc.text}
                  </p>
                  <span
                    className="mt-0.5 flex w-fit items-center gap-1.5 text-[10.5px] font-bold"
                    style={{ color }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                    {SENTIMENT_LABEL[doc.sentiment]}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
