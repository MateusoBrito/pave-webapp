import { useNavigate } from 'react-router-dom'
import { NETWORKS } from '../../types'
import type { Entity } from '../../types'
import type { TopicRankingRow } from '../../api/client'
import { formatSignedPercent } from '../../lib/format'
import { SentimentBar } from './SentimentBar'

interface Props {
  rows: TopicRankingRow[]
  entities: Entity[]
  loading: boolean
}

/** Fluxo de navegação: Visão Geral → clique numa linha → drill-down do tópico. */
export function TopTopicsTable({ rows, entities, loading }: Props) {
  const navigate = useNavigate()

  function candidateLabel(id: string) {
    if (id === 'both') return 'Ambos'
    return entities.find((e) => e.id === id)?.name ?? id
  }

  function networkLabel(id: string) {
    return NETWORKS.find((n) => n.id === id)?.label ?? id
  }

  return (
    <section className="rounded-xl border border-[var(--baseline)] bg-[var(--chart-surface)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
        Top 10 tópicos do período
      </h2>
      <p className="mb-4 text-xs text-[var(--text-muted)]">
        Dados ilustrativos · clique na linha abre o drill-down
      </p>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[var(--text-muted)]">
          Carregando…
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--gridline)] text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                <th className="pb-2 font-medium">Tópico</th>
                <th className="pb-2 font-medium">Candidato</th>
                <th className="pb-2 font-medium">Rede dominante</th>
                <th className="pb-2 font-medium">Menções</th>
                <th className="pb-2 font-medium">Var. período</th>
                <th className="pb-2 font-medium">Sentimento</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.topic.id}
                  onClick={() => navigate(`/topicos/${row.topic.id}`)}
                  className="cursor-pointer border-b border-[var(--gridline)] last:border-0 hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <td className="py-2.5 font-medium text-[var(--text-primary)]">
                    {row.topic.label}
                  </td>
                  <td className="py-2.5 text-[var(--text-secondary)]">
                    {candidateLabel(row.dominantEntityId)}
                  </td>
                  <td className="py-2.5 text-[var(--text-secondary)]">
                    {networkLabel(row.dominantNetwork)}
                  </td>
                  <td className="py-2.5 text-[var(--text-primary)]">
                    {row.mentions.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2.5 text-[var(--text-secondary)]">
                    {formatSignedPercent(row.variationPct)}
                  </td>
                  <td className="py-2.5">
                    <SentimentBar sentiment={row.sentiment} className="max-w-[120px]" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
