import { AlertTriangle, Inbox } from 'lucide-react'
import { NETWORKS } from '../../types'
import type { TopicDocument } from '../../types'
import { useFilters } from '../../context/FiltersContext'
import { sentimentColor } from '../../lib/colors'
import { TableCardSkeleton } from '../ui/skeletons'
import { StatusCard } from '../ui/StatusCard'

const SENTIMENT_LABEL: Record<string, string> = {
  negative: 'Negativo',
  neutral: 'Neutro',
  positive: 'Positivo',
}

function networkLabel(id: string): string {
  return NETWORKS.find((n) => n.id === id)?.label ?? id
}

function engagementLabel(doc: TopicDocument): string {
  if (doc.network === 'meta_ads')
    return `R$ ${doc.engagement.toLocaleString('pt-BR')} gasto`
  if (doc.network === 'reddit') return `${doc.engagement.toLocaleString('pt-BR')} upvotes`
  return `${doc.engagement.toLocaleString('pt-BR')} curtidas`
}

interface Props {
  documents: TopicDocument[]
  loading: boolean
  error?: Error
  refetch?: () => void
}

export function ExamplePostsList({ documents, loading, error, refetch }: Props) {
  const { clearFilters } = useFilters()
  const isEmpty = !loading && !error && documents.length === 0

  return (
    <section className="rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
        Exemplos de posts
      </h2>
      <p className="mb-4 text-xs text-[var(--text-muted)]">
        Conteúdo público · autores anonimizados conforme política de retenção (LGPD)
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
          icon={Inbox}
          tone="graphite"
          title="Nenhum post encontrado"
          description="Nenhum exemplo disponível para esta combinação de filtros."
          primaryAction={{ label: 'Limpar filtros', onClick: clearFilters }}
        />
      ) : (
        <ul className="flex flex-col">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--gridline)] py-2.5 last:border-0"
            >
              <span className="shrink-0 rounded-full border border-[var(--baseline)] px-2 py-0.5 text-center text-xs text-[var(--text-secondary)]">
                {networkLabel(doc.network)}
              </span>
              <p className="min-w-[200px] flex-1 truncate text-sm text-[var(--text-primary)]">
                &ldquo;{doc.text}&rdquo;
              </p>
              <span className="flex shrink-0 items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: sentimentColor(doc.sentiment) }}
                />
                {SENTIMENT_LABEL[doc.sentiment]}
              </span>
              <span className="w-28 shrink-0 text-right text-xs text-[var(--text-muted)]">
                {engagementLabel(doc)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
