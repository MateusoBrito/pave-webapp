import { NETWORKS } from '../../types'
import type { TopicDocument } from '../../types'
import { sentimentColor } from '../../lib/colors'

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
}

export function ExamplePostsList({ documents, loading }: Props) {
  return (
    <section className="rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
        Exemplos de posts
      </h2>
      <p className="mb-4 text-xs text-[var(--text-muted)]">
        Conteúdo público · autores anonimizados conforme política de retenção (LGPD)
      </p>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[var(--text-muted)]">
          Carregando…
        </div>
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
