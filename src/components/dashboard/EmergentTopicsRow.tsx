import { Sparkles } from 'lucide-react'
import type { EmergentTopic } from '../../types'
import { IconTile } from '../ui/IconTile'

interface Props {
  topics: EmergentTopic[]
  loading: boolean
}

export function EmergentTopicsRow({ topics, loading }: Props) {
  return (
    <section className="rounded-2xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
        Tópicos emergentes
      </h2>
      <p className="mb-4 text-xs text-[var(--text-muted)]">
        Documentos com baixa afinidade a qualquer tópico do modelo vigente — justificam a
        próxima re-modelagem
      </p>

      {loading ? (
        <div className="flex h-16 items-center justify-center text-sm text-[var(--text-muted)]">
          Carregando…
        </div>
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
