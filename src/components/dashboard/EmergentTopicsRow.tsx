import { AlertTriangle, Inbox, Sparkles } from 'lucide-react'
import type { EmergentTopic } from '../../types'
import { IconTile } from '../ui/IconTile'
import { Skeleton } from '../ui/Skeleton'
import { StatusCard } from '../ui/StatusCard'

interface Props {
  topics: EmergentTopic[]
  loading: boolean
  error?: Error
  refetch?: () => void
}

export function EmergentTopicsRow({ topics, loading, error, refetch }: Props) {
  const isEmpty = !loading && !error && topics.length === 0

  return (
    <section className="rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
        Tópicos emergentes
      </h2>
      <p className="mb-4 text-xs text-[var(--text-muted)]">
        Documentos com baixa afinidade a qualquer tópico do modelo vigente — justificam a
        próxima re-modelagem
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
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-48 rounded-xl" />
          ))}
        </div>
      ) : isEmpty ? (
        <StatusCard
          icon={Inbox}
          tone="graphite"
          title="Nenhum tópico emergente"
          description="Nenhum documento recente ficou de fora do modelo vigente."
        />
      ) : (
        <div className="flex flex-wrap gap-3">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="flex items-center gap-3 rounded-xl border border-[var(--baseline)] px-3 py-2.5"
            >
              <IconTile icon={Sparkles} tone="amber" size={32} />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {topic.label}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {topic.documentCount.toLocaleString('pt-BR')} docs
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
